/**
 * Event Timeline Chart Component
 *
 * Shows individual events chronologically on a timeline with clickable points
 * that link to the ego graph. Useful for queries like "show all instances
 * of anti-democratic rhetoric" where you want to see specific events.
 */

"use client";

import { useState } from "react";

import { Badge, Button, Card, CardContent } from "@proto/ui/atoms";
import { createEgoGraphUrl } from "@proto/utils/atlas";

// Event data structure from CanonicalNodeDetails timeline
interface TimelineEvent {
  id: string;
  timestamp: string; // ISO date string (start date)
  endDate?: string; // ISO date string (end date for ongoing events)
  eventType: "intrinsic" | "relationship" | "milestone" | "ongoing";
  category: string;
  title: string;
  description?: string;
  duration?: string; // Human readable duration description
  relationshipType?: string;
  targetEntity?: {
    uid: string;
    name: string;
    type: string;
  };
  evidence?: Array<{
    uid: string;
    title: string;
    publisher: string;
    url: string;
    reliability: number;
  }>;
  confidence: number;
  importance: "critical" | "major" | "minor";
}

interface EventTimelineChartProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  height?: number;
  className?: string;
  timeWindow?: {
    from: string; // YYYY-MM-DD format
    to: string; // YYYY-MM-DD format
  };
}

export function EventTimelineChart({
  events,
  onEventClick,
  height = 400,
  className = "",
  timeWindow,
}: EventTimelineChartProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    null
  );

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Show empty timeline with same time range for comparison alignment
  if (sortedEvents.length === 0 && timeWindow) {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        {/* Timeline axis for empty state */}
        <div className="absolute inset-x-4 top-1/2 transform -translate-y-1/2">
          <div className="relative h-px bg-gray-300">
            {/* Start date label */}
            <div className="absolute left-0 -top-6 text-xs text-gray-500">
              {timeWindow.from}
            </div>
            {/* End date label */}
            <div className="absolute right-0 -top-6 text-xs text-gray-500">
              {timeWindow.to}
            </div>
          </div>
        </div>

        {/* Empty state message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm font-medium mb-1">No Events</div>
            <div className="text-xs">No timeline events in this period</div>
          </div>
        </div>
      </div>
    );
  }

  // Legacy empty state fallback (when no timeWindow provided)
  if (sortedEvents.length === 0) {
    return (
      <div
        className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-lg font-medium mb-2">No Events Found</div>
          <div className="text-sm">
            No timeline events in the selected period
          </div>
        </div>
      </div>
    );
  }

  // Calculate time span - use provided timeWindow for synchronized comparison, or auto-calculate from events
  const timeSpan = timeWindow
    ? {
        start: new Date(timeWindow.from + "T00:00:00Z"),
        end: new Date(timeWindow.to + "T23:59:59Z"),
      }
    : (() => {
        // Fallback to auto-calculation if no timeWindow provided (backward compatibility)
        const allDates = sortedEvents.flatMap((event) => {
          const dates = [new Date(event.timestamp)];
          if (event.endDate) {
            dates.push(new Date(event.endDate));
          }
          return dates;
        });

        return {
          start: new Date(Math.min(...allDates.map((d) => d.getTime()))),
          end: new Date(Math.max(...allDates.map((d) => d.getTime()))),
        };
      })();

  const totalDays = Math.max(
    1,
    Math.ceil(
      (timeSpan.end.getTime() - timeSpan.start.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Calculate positions for events (both points and spans)
  const eventsWithPositions = sortedEvents.map((event) => {
    const startDate = new Date(event.timestamp);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const currentDate = new Date();

    const startDaysFromStart = Math.ceil(
      (startDate.getTime() - timeSpan.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const startPosition = (startDaysFromStart / totalDays) * 100;

    let endPosition = startPosition;
    let isOngoing = false;

    if (endDate) {
      const endDaysFromStart = Math.ceil(
        (endDate.getTime() - timeSpan.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      endPosition = (endDaysFromStart / totalDays) * 100;
    } else if (event.eventType === "ongoing") {
      // Ongoing event extends to current date or timeline end
      const extendToDate =
        currentDate > timeSpan.end ? timeSpan.end : currentDate;
      const extendDaysFromStart = Math.ceil(
        (extendToDate.getTime() - timeSpan.start.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      endPosition = (extendDaysFromStart / totalDays) * 100;
      isOngoing = true;
    }

    return {
      ...event,
      startPosition: Math.max(2, Math.min(98, startPosition)),
      endPosition: Math.max(2, Math.min(98, endPosition)),
      position: startPosition, // For backward compatibility
      date: startDate,
      endDateObj: endDate,
      isSpan: endDate || event.eventType === "ongoing",
      isOngoing,
      calculatedDurationDays: endDate
        ? Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    };
  });

  // Event color mapping
  const getEventColor = (event: TimelineEvent) => {
    switch (event.importance) {
      case "critical":
        return "bg-red-500 border-red-600";
      case "major":
        return "bg-orange-500 border-orange-600";
      case "minor":
        return "bg-blue-500 border-blue-600";
      default:
        return "bg-gray-500 border-gray-600";
    }
  };

  const getEventTextColor = (event: TimelineEvent) => {
    switch (event.importance) {
      case "critical":
        return "text-red-700";
      case "major":
        return "text-orange-700";
      case "minor":
        return "text-blue-700";
      default:
        return "text-gray-700";
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const handleEgoGraphClick = (event: TimelineEvent) => {
    if (event.targetEntity) {
      const egoUrl = createEgoGraphUrl(event.targetEntity.uid, event.timestamp);
      if (typeof window !== "undefined") {
        window.open(egoUrl, "_blank");
      }
    }
  };

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Timeline visualization */}
      <div className="p-6" style={{ height }}>
        <div className="relative h-full">
          {/* Time axis */}
          <div className="absolute top-8 left-8 right-8 h-1 bg-gray-300 rounded"></div>

          {/* Time labels */}
          <div className="absolute top-2 left-8 right-8 flex justify-between text-xs text-gray-500">
            <span>{timeSpan.start.toLocaleDateString()}</span>
            <span>{timeSpan.end.toLocaleDateString()}</span>
          </div>

          {/* Event points and spans */}
          <div className="absolute top-4 left-8 right-8 h-20">
            {eventsWithPositions.map((event, index) => {
              if (event.isSpan) {
                // Render as span/bar
                const width = Math.abs(event.endPosition - event.startPosition);
                return (
                  <div
                    key={event.id}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${Math.min(event.startPosition, event.endPosition)}%`,
                      width: `${Math.max(width, 2)}%`,
                      minWidth: "8px",
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    {/* Event span bar */}
                    <div
                      className={`h-3 rounded-full border-2 ${getEventColor(event)} 
                        shadow-lg hover:scale-105 transition-transform duration-200 relative z-10
                        ${event.isOngoing ? "border-dashed ring-2 ring-gray-300 ring-opacity-50" : ""}`}
                    ></div>

                    {/* Start marker */}
                    <div
                      className={`absolute -left-1 -top-0.5 w-4 h-4 rounded-full border-2 ${getEventColor(event)} shadow-lg`}
                    ></div>

                    {/* End marker (only if not ongoing) */}
                    {!event.isOngoing && (
                      <div
                        className={`absolute -right-1 -top-0.5 w-4 h-4 rounded-full border-2 ${getEventColor(event)} shadow-lg`}
                      ></div>
                    )}

                    {/* Event stem */}
                    <div className="w-px h-6 bg-gray-300 mx-auto mt-1"></div>

                    {/* Event label */}
                    <div className="text-xs text-center max-w-24 mx-auto mt-1 leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div
                        className={`font-medium ${getEventTextColor(event)}`}
                      >
                        {event.title.length > 18
                          ? `${event.title.slice(0, 15)}...`
                          : event.title}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {event.date.toLocaleDateString()}
                        {(event as any).endDateObj &&
                          ` - ${(event as any).endDateObj.toLocaleDateString()}`}
                        {(event as any).isOngoing && " - ongoing"}
                      </div>
                      {(event as any).calculatedDurationDays && (
                        <div className="text-gray-400 text-xs">
                          {(event as any).calculatedDurationDays} days
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // Render as point
                return (
                  <div
                    key={event.id}
                    className="absolute transform -translate-x-1/2 cursor-pointer group"
                    style={{ left: `${event.position}%` }}
                    onClick={() => handleEventClick(event)}
                  >
                    {/* Event point */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${getEventColor(event)} 
                        shadow-lg hover:scale-125 transition-transform duration-200 relative z-10`}
                    ></div>

                    {/* Event stem */}
                    <div className="w-px h-6 bg-gray-300 mx-auto"></div>

                    {/* Event label */}
                    <div className="text-xs text-center max-w-20 mx-auto mt-1 leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div
                        className={`font-medium ${getEventTextColor(event)}`}
                      >
                        {event.title.length > 15
                          ? `${event.title.slice(0, 12)}...`
                          : event.title}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {event.date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-8 right-8 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-600"></div>
                <span>Major</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-600"></div>
                <span>Minor</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-gray-500"></div>
                <span>Point event</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-2 rounded-full bg-gray-400 border border-gray-500"></div>
                <span>Duration</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 rounded-full bg-gray-400 border border-gray-500 border-dashed"></div>
                <span>Ongoing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event details panel */}
      {selectedEvent && (
        <Card className="m-6 mt-0 border-t">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {selectedEvent.title}
                  </h4>
                  <Badge
                    variant={
                      selectedEvent.importance === "critical"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {selectedEvent.importance}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedEvent.eventType}
                  </Badge>
                </div>

                {selectedEvent.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="text-xs text-gray-500 mb-3">
                  {new Date(selectedEvent.timestamp).toLocaleDateString()}
                  {(selectedEvent as any).endDateObj &&
                    ` - ${(selectedEvent as any).endDateObj.toLocaleDateString()}`}
                  {(selectedEvent as any).isOngoing && " - ongoing"} •
                  {(selectedEvent.duration ||
                    (selectedEvent as any).calculatedDurationDays) &&
                    `Duration: ${selectedEvent.duration || `${(selectedEvent as any).calculatedDurationDays} days`} • `}
                  Category: {selectedEvent.category} • Confidence:{" "}
                  {Math.round(selectedEvent.confidence * 100)}%
                </div>

                {selectedEvent.targetEntity && (
                  <div className="text-sm text-gray-600 mb-2">
                    Related to:{" "}
                    <span className="font-medium">
                      {selectedEvent.targetEntity.name}
                    </span>
                    {selectedEvent.relationshipType && (
                      <span className="text-gray-500">
                        {" "}
                        ({selectedEvent.relationshipType})
                      </span>
                    )}
                  </div>
                )}

                {selectedEvent.evidence &&
                  selectedEvent.evidence.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Evidence: {selectedEvent.evidence.length} sources
                      available
                    </div>
                  )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                {selectedEvent.targetEntity && (
                  <Button
                    size="sm"
                    onClick={() => handleEgoGraphClick(selectedEvent)}
                    className="text-xs"
                  >
                    View in Graph
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="px-6 pb-4 text-xs text-gray-500 text-center border-t">
        💡 Click events to see details • Bars show duration • Dashed borders =
        ongoing • &ldquo;View in Graph&rdquo; opens ego network
      </div>
    </div>
  );
}
