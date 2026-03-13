/**
 * Multi-Entity Timeline Chart Component
 *
 * Core visualization component for comparing timelines across multiple entities.
 * Supports different view modes: comparison, merged, and side-by-side.
 * Extends EventTimelineChart for multi-entity display.
 */

"use client";

import React, { useMemo, memo, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import type { TimelineEvent } from "@proto/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";
import { getEntityColors } from "@proto/utils";
import { getEntityImage } from "@proto/utils/atlas";

import { EventTimelineChart } from "@/components/share/EventTimelineChart";

import type { MultiEntityTimelineData } from "../hooks/useMultiEntityTimeline";
import type { TimelineFilters } from "../hooks/useTimelinePageState";

// ==================== Types ====================

export interface MultiEntityTimelineChartProps {
  entities: MultiEntityTimelineData[];
  viewMode: "comparison" | "merged" | "side-by-side" | "tracks";
  filters: TimelineFilters;
  timeWindow: { from: string; to: string };
  height?: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
  className?: string;
}

interface EntityColorMap {
  [entityUid: string]: string;
}

// ==================== Utility Functions ====================

/**
 * Apply timeline event filters
 */
function filterTimelineEvents(
  events: TimelineEvent[],
  filters: TimelineFilters
): TimelineEvent[] {
  let filtered = [...events];

  // Filter by categories
  if (filters.categories.length > 0) {
    filtered = filtered.filter((event) =>
      filters.categories.includes(event.category)
    );
  }

  // Filter by importance
  if (filters.importance.length > 0) {
    filtered = filtered.filter((event) =>
      filters.importance.includes(event.importance)
    );
  }

  // Filter by event types
  if (filters.eventTypes.length > 0) {
    filtered = filtered.filter((event) =>
      filters.eventTypes.includes(event.eventType)
    );
  }

  // Filter by tags (if event has tags field)
  if (filters.tags.length > 0) {
    filtered = filtered.filter((event) => {
      // Assuming events might have tags - if not, this filter is ignored
      const eventTags = (event as any).tags || [];
      return filters.tags.some((tag) => eventTags.includes(tag));
    });
  }

  return filtered;
}

// ==================== View Components ====================

/**
 * Comparison View - Unified timeline with entity-colored events
 */
const ComparisonTimelineView = memo(function ComparisonTimelineView({
  entities,
  entityColors,
  timeWindow,
  height,
  onEventClick,
}: {
  entities: MultiEntityTimelineData[];
  entityColors: EntityColorMap;
  timeWindow: { from: string; to: string };
  height: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
}) {
  // Merge all events with entity context
  const allEvents = useMemo(() => {
    return entities
      .flatMap((entity) =>
        entity.timeline.map((event) => ({
          ...event,
          entityUid: entity.entityUid,
          entityName: entity.entityInfo.name,
          entityColor: entityColors[entity.entityUid],
          // Add visual styling based on entity
          style: {
            backgroundColor: entityColors[entity.entityUid],
            borderColor: entityColors[entity.entityUid],
          },
        }))
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [entities, entityColors]);

  if (allEvents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Icon name="clock" size={32} className="mx-auto mb-2" />
        <p>No events to display in comparison view</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <ComparisonLegend entities={entities} entityColors={entityColors} />

      {/* Unified Timeline */}
      <EventTimelineChart
        events={allEvents}
        height={height}
        timeWindow={timeWindow}
        onEventClick={(event) =>
          onEventClick?.(event, (event as any).entityUid)
        }
        className="multi-entity-timeline"
      />

      {/* Summary Statistics */}
      <ComparisonStatistics entities={entities} />
    </div>
  );
});

/**
 * Side-by-Side View - Separate timelines for each entity
 */
const SideBySideTimelineView = memo(function SideBySideTimelineView({
  entities,
  entityColors,
  timeWindow,
  height,
  onEventClick,
}: {
  entities: MultiEntityTimelineData[];
  entityColors: EntityColorMap;
  timeWindow: { from: string; to: string };
  height: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
}) {
  const entityHeight = Math.max(200, Math.floor(height / entities.length));

  return (
    <div className="space-y-4">
      {entities.map((entity) => (
        <Card
          key={entity.entityUid}
          className="border-l-4"
          style={{ borderLeftColor: entityColors[entity.entityUid] }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {getEntityImage(entity.entityInfo.type)}
              </span>
              <div className="flex-1">
                <CardTitle className="text-base">
                  {entity.entityInfo.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{entity.entityInfo.type}</span>
                  <Badge variant="outline" className="text-xs">
                    {entity.timeline.length} events
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {entity.timeline.length > 0 ? (
              <EventTimelineChart
                events={entity.timeline}
                height={entityHeight}
                timeWindow={timeWindow}
                onEventClick={(event) =>
                  onEventClick?.(event, entity.entityUid)
                }
              />
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Icon name="clock" size={24} className="mx-auto mb-2" />
                <p className="text-sm">No events found for this entity</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

/**
 * Tracks View - Separate horizontal tracks for each entity on synchronized timeline
 */
const TracksTimelineView = memo(function TracksTimelineView({
  entities,
  entityColors,
  timeWindow,
  height,
  onEventClick,
}: {
  entities: MultiEntityTimelineData[];
  entityColors: EntityColorMap;
  timeWindow: { from: string; to: string };
  height: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
}) {
  const trackHeight = Math.max(80, Math.floor(height / (entities.length + 1))); // +1 for timeline axis

  return (
    <div className="space-y-2">
      {/* Legend */}
      <ComparisonLegend entities={entities} entityColors={entityColors} />

      {/* Timeline with entity tracks */}
      <div className="relative border rounded-lg bg-white" style={{ height }}>
        {/* Shared timeline axis at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 border-t bg-gray-50 px-4">
          <div className="relative h-full">
            {/* Timeline axis line */}
            <div className="absolute top-4 left-4 right-4 h-px bg-gray-300" />

            {/* Start date label */}
            <div className="absolute left-4 top-1 text-xs text-gray-500">
              {timeWindow.from}
            </div>

            {/* End date label */}
            <div className="absolute right-4 top-1 text-xs text-gray-500">
              {timeWindow.to}
            </div>
          </div>
        </div>

        {/* Entity tracks */}
        {entities.map((entity, index) => {
          const trackTop = index * trackHeight;

          return (
            <div
              key={entity.entityUid}
              className="absolute left-0 right-0 border-b border-gray-100"
              style={{
                top: trackTop,
                height: trackHeight,
              }}
            >
              {/* Entity label */}
              <div
                className="absolute left-0 top-0 bottom-0 w-48 px-3 py-2 bg-gray-50 border-r flex items-center gap-2"
                style={{
                  borderLeftColor: entityColors[entity.entityUid],
                  borderLeftWidth: "4px",
                }}
              >
                <span className="text-sm">
                  {getEntityImage(entity.entityInfo.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {entity.entityInfo.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {entity.timeline.length} events
                  </div>
                </div>
              </div>

              {/* Entity timeline events */}
              <div className="absolute left-48 right-4 top-0 bottom-0">
                <EntityTrackEvents
                  entity={entity}
                  entityColor={entityColors[entity.entityUid]}
                  timeWindow={timeWindow}
                  trackHeight={trackHeight}
                  onEventClick={onEventClick}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Entity Track Events - Events for a single entity track
 */
const EntityTrackEvents = memo(function EntityTrackEvents({
  entity,
  entityColor,
  timeWindow,
  trackHeight,
  onEventClick,
}: {
  entity: MultiEntityTimelineData;
  entityColor: string;
  timeWindow: { from: string; to: string };
  trackHeight: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
}) {
  // Calculate time span for positioning
  const timeSpan = useMemo(() => {
    const start = new Date(timeWindow.from);
    const end = new Date(timeWindow.to);
    const totalMs = end.getTime() - start.getTime();
    return { start, end, totalMs };
  }, [timeWindow]);

  // Calculate event positions
  const eventsWithPositions = useMemo(() => {
    return entity.timeline.map((event) => {
      const eventTime = new Date(event.timestamp);
      const msFromStart = eventTime.getTime() - timeSpan.start.getTime();
      const position = (msFromStart / timeSpan.totalMs) * 100;

      return {
        ...event,
        position: Math.max(0, Math.min(100, position)),
      };
    });
  }, [entity.timeline, timeSpan]);

  if (eventsWithPositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        No events
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {eventsWithPositions.map((event, index) => (
        <div
          key={event.id}
          className="absolute cursor-pointer hover:z-10 group"
          style={{
            left: `${event.position}%`,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          onClick={() => onEventClick?.(event, entity.entityUid)}
        >
          {/* Event point */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-sm group-hover:scale-125 transition-transform"
            style={{ backgroundColor: entityColor }}
          />

          {/* Event tooltip on hover */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
            <div className="font-medium">{event.title}</div>
            <div className="text-xs opacity-75">
              {new Date(event.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Merged View - Chronological timeline showing all events in sequence
 */
const MergedTimelineView = memo(function MergedTimelineView({
  entities,
  entityColors,
  timeWindow,
  height,
  onEventClick,
}: {
  entities: MultiEntityTimelineData[];
  entityColors: EntityColorMap;
  timeWindow: { from: string; to: string };
  height: number;
  onEventClick?: (event: TimelineEvent, entityUid: string) => void;
}) {
  // Create a chronological merge with entity indicators
  const mergedEvents = useMemo(() => {
    return entities
      .flatMap((entity) =>
        entity.timeline.map((event) => ({
          ...event,
          entityUid: entity.entityUid,
          entityName: entity.entityInfo.name,
          entityType: entity.entityInfo.type,
          entityColor: entityColors[entity.entityUid],
        }))
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [entities, entityColors]);

  if (mergedEvents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Icon name="clock" size={32} className="mx-auto mb-2" />
        <p>No events to display in merged view</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Merged Timeline</h3>
        <Badge variant="outline">{mergedEvents.length} total events</Badge>
      </div>

      <EventTimelineChart
        events={mergedEvents}
        height={height}
        timeWindow={timeWindow}
        onEventClick={(event) =>
          onEventClick?.(event, (event as any).entityUid)
        }
        className="merged-timeline"
      />
    </div>
  );
});

// ==================== Support Components ====================

/**
 * Legend showing entity colors and basic info
 */
const ComparisonLegend = memo(function ComparisonLegend({
  entities,
  entityColors,
}: {
  entities: MultiEntityTimelineData[];
  entityColors: EntityColorMap;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
        <Icon name="users" size={16} />
        Entities:
      </div>
      {entities.map((entity) => (
        <div key={entity.entityUid} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entityColors[entity.entityUid] }}
          />
          <span className="text-sm">{entity.entityInfo.name}</span>
          <Badge variant="outline" className="text-xs">
            {entity.timeline.length}
          </Badge>
        </div>
      ))}
    </div>
  );
});

/**
 * Basic comparison statistics
 */
const ComparisonStatistics = memo(function ComparisonStatistics({
  entities,
}: {
  entities: MultiEntityTimelineData[];
}) {
  const totalEvents = entities.reduce(
    (sum, entity) => sum + entity.timeline.length,
    0
  );
  const entitiesWithData = entities.filter(
    (entity) => entity.timeline.length > 0
  );

  return (
    <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg text-center">
      <div>
        <div className="text-lg font-bold text-blue-600">{totalEvents}</div>
        <div className="text-xs text-gray-500">Total Events</div>
      </div>
      <div>
        <div className="text-lg font-bold text-green-600">
          {entitiesWithData.length}
        </div>
        <div className="text-xs text-gray-500">Active Entities</div>
      </div>
      <div>
        <div className="text-lg font-bold text-purple-600">
          {entities.length > 0
            ? Math.round((entitiesWithData.length / entities.length) * 100)
            : 0}
          %
        </div>
        <div className="text-xs text-gray-500">Success Rate</div>
      </div>
    </div>
  );
});

// ==================== Main Component ====================

export const MultiEntityTimelineChart = memo(function MultiEntityTimelineChart({
  entities,
  viewMode,
  filters,
  timeWindow,
  height = 600,
  onEventClick,
  className = "",
}: MultiEntityTimelineChartProps) {
  // Generate consistent colors for entities
  const entityColors = useMemo(
    () => Object.fromEntries(getEntityColors(entities.map((e) => e.entityUid))),
    [entities]
  );

  // Optimize event click handler to prevent re-renders
  const handleEventClick = useCallback(
    (event: TimelineEvent, entityUid: string) => {
      onEventClick?.(event, entityUid);
    },
    [onEventClick]
  );

  // Filter timeline events for each entity
  const filteredEntities = useMemo(() => {
    return entities.map((entity) => ({
      ...entity,
      timeline: filterTimelineEvents(entity.timeline, filters),
    }));
  }, [entities, filters]);

  // Check if any entities have data after filtering
  const hasData = filteredEntities.some((entity) => entity.timeline.length > 0);

  if (!hasData) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <Icon name="alert-circle" size={32} className="mx-auto mb-2" />
        <h3 className="font-medium mb-1">No events match current filters</h3>
        <p className="text-sm">
          Try adjusting your filters to see timeline events
        </p>
      </div>
    );
  }

  // Render based on view mode
  switch (viewMode) {
    case "tracks":
      return (
        <div className={className}>
          <TracksTimelineView
            entities={filteredEntities}
            entityColors={entityColors}
            timeWindow={timeWindow}
            height={height}
            onEventClick={handleEventClick}
          />
        </div>
      );

    case "merged":
      return (
        <div className={className}>
          <MergedTimelineView
            entities={filteredEntities}
            entityColors={entityColors}
            timeWindow={timeWindow}
            height={height}
            onEventClick={handleEventClick}
          />
        </div>
      );

    case "side-by-side":
      return (
        <div className={className}>
          <SideBySideTimelineView
            entities={filteredEntities}
            entityColors={entityColors}
            timeWindow={timeWindow}
            height={height}
            onEventClick={handleEventClick}
          />
        </div>
      );

    case "comparison":
    default:
      return (
        <div className={className}>
          <ComparisonTimelineView
            entities={filteredEntities}
            entityColors={entityColors}
            timeWindow={timeWindow}
            height={height}
            onEventClick={handleEventClick}
          />
        </div>
      );
  }
});
