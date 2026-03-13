/**
 * Event Gantt Chart Component
 *
 * Professional timeline visualization using shadcn Gantt chart.
 * Replaces EventTimelineChart with enhanced features:
 * - Multiple events per row (overlapping support)
 * - Category/entity grouping toggle
 * - Row reordering for comparison
 * - Read-only and edit modes
 * - Evidence display and ego graph navigation
 */

"use client";

import { useState, useMemo, useCallback } from "react";

import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttToday,
  type Range,
} from "@proto/charts/gantt";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@proto/ui/atoms";
import {
  transformTimelineToGantt,
  groupFeaturesByLane,
  getLaneDisplayName,
  calculateSummary,
  calculateAutoTimeWindow,
  type EnrichedGanttFeature,
  type GroupByStrategy,
} from "@proto/utils";
import { createEgoGraphUrl, type TimelineEvent } from "@proto/utils/atlas";

export interface EventGanttChartProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  height?: number;
  className?: string;
  timeWindow?: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  // New props
  groupBy?: GroupByStrategy;
  readOnly?: boolean;
  maxEvents?: number;
  range?: Range; // 'daily' | 'monthly' | 'quarterly'
  zoom?: number; // 50-200
  onGroupByChange?: (groupBy: GroupByStrategy) => void;
}

export function EventGanttChart({
  events,
  onEventClick,
  height = 600,
  className = "",
  timeWindow,
  groupBy: controlledGroupBy,
  readOnly = true,
  maxEvents = 50,
  range = "monthly",
  zoom = 100,
  onGroupByChange,
}: EventGanttChartProps) {
  const [internalGroupBy, setInternalGroupBy] =
    useState<GroupByStrategy>("category");
  const [selectedFeature, setSelectedFeature] =
    useState<EnrichedGanttFeature | null>(null);

  const groupBy = controlledGroupBy ?? internalGroupBy;

  const handleGroupByChange = useCallback(
    (newGroupBy: GroupByStrategy) => {
      setInternalGroupBy(newGroupBy);
      onGroupByChange?.(newGroupBy);
    },
    [onGroupByChange]
  );

  // Calculate auto time window if not provided (1 month before first event, 1 month after last event)
  const effectiveTimeWindow = useMemo(
    () => timeWindow || calculateAutoTimeWindow(events, 1) || undefined,
    [timeWindow, events]
  );

  // Transform events to Gantt features
  const features = useMemo(
    () =>
      transformTimelineToGantt(events, {
        groupBy,
        maxEvents,
        timeWindow: effectiveTimeWindow,
      }),
    [events, groupBy, maxEvents, effectiveTimeWindow]
  );

  // Group features by lane
  const groupedFeatures = useMemo(
    () => groupFeaturesByLane(features),
    [features]
  );

  // Calculate summary
  const summary = useMemo(() => calculateSummary(events), [events]);

  // Handle feature move (only if not readOnly)
  const handleFeatureMove = useCallback(
    (id: string, startAt: Date, endAt: Date | null) => {
      if (readOnly) return;

      const feature = features.find((f: EnrichedGanttFeature) => f.id === id);
      if (feature) {
        console.log("Feature moved:", {
          id,
          startAt,
          endAt,
          event: feature.metadata.event,
        });
        // TODO: Implement event date update via API
      }
    },
    [readOnly, features]
  );

  // Handle feature click
  const handleFeatureClick = useCallback(
    (feature: EnrichedGanttFeature) => {
      setSelectedFeature(feature);
      onEventClick?.(feature.metadata.event);
    },
    [onEventClick]
  );

  // Handle ego graph navigation
  const handleEgoGraphClick = useCallback((feature: EnrichedGanttFeature) => {
    const entityUid = feature.metadata.entityUid;
    if (entityUid) {
      const egoUrl = createEgoGraphUrl(
        entityUid,
        feature.metadata.event.timestamp
      );
      if (typeof window !== "undefined") {
        window.open(egoUrl, "_blank");
      }
    }
  }, []);

  // Empty state
  if (features.length === 0) {
    return (
      <div
        className={`bg-background border rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-lg font-medium mb-2">No Events Found</div>
            <div className="text-sm">
              No timeline events in the selected period
            </div>
            {effectiveTimeWindow && (
              <div className="text-xs text-foreground-muted mt-2">
                Time window: {effectiveTimeWindow.from} to{" "}
                {effectiveTimeWindow.to}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-lg border ${className}`}>
      {/* Controls */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-foreground">
            {features.length} of {events.length} events
          </div>
          {summary.dateRange && (
            <div className="text-xs text-foreground-secondary">
              {summary.dateRange.earliest} - {summary.dateRange.latest}
            </div>
          )}
          {effectiveTimeWindow && !timeWindow && (
            <div className="text-xs text-muted-foreground italic">
              Auto window: {effectiveTimeWindow.from} to{" "}
              {effectiveTimeWindow.to}
            </div>
          )}
        </div>

        {/* Group By Toggle */}
        <Tabs
          value={groupBy}
          onValueChange={(value) =>
            handleGroupByChange(value as GroupByStrategy)
          }
        >
          <TabsList>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="entity">By Entity</TabsTrigger>
            <TabsTrigger value="importance">By Importance</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Gantt Chart */}
      <div style={{ height: height - 120 }}>
        <GanttProvider range={range} zoom={zoom}>
          <GanttSidebar>
            {Array.from(groupedFeatures.entries()).map(
              ([lane, laneFeatures]: [string, EnrichedGanttFeature[]]) => (
                <GanttSidebarGroup
                  key={lane}
                  name={getLaneDisplayName(lane, groupBy, events)}
                >
                  {laneFeatures.map((feature: EnrichedGanttFeature) => (
                    <GanttSidebarItem
                      key={feature.id}
                      feature={feature}
                      onSelectItem={() => handleFeatureClick(feature)}
                    />
                  ))}
                </GanttSidebarGroup>
              )
            )}
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />
            <GanttToday />
            <GanttFeatureList>
              {Array.from(groupedFeatures.entries()).map(
                ([lane, laneFeatures]: [string, EnrichedGanttFeature[]]) => (
                  <GanttFeatureListGroup key={lane}>
                    <GanttFeatureRow
                      features={laneFeatures}
                      onMove={readOnly ? undefined : handleFeatureMove}
                    >
                      {(feature) => (
                        <div
                          className="flex items-center gap-2 w-full cursor-pointer"
                          onClick={() =>
                            handleFeatureClick(feature as EnrichedGanttFeature)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFeatureClick(
                                feature as EnrichedGanttFeature
                              );
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: feature.status.color,
                            }}
                          />
                          <p className="flex-1 truncate text-xs font-medium">
                            {feature.name}
                          </p>
                          {(feature as EnrichedGanttFeature).metadata
                            .evidenceCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {
                                (feature as EnrichedGanttFeature).metadata
                                  .evidenceCount
                              }
                            </Badge>
                          )}
                        </div>
                      )}
                    </GanttFeatureRow>
                  </GanttFeatureListGroup>
                )
              )}
            </GanttFeatureList>
          </GanttTimeline>
        </GanttProvider>
      </div>

      {/* Event Details Panel */}
      {selectedFeature && (
        <Card className="m-4 mt-0 border-t">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-foreground">
                    {selectedFeature.metadata.event.title}
                  </h4>
                  <Badge
                    variant={
                      selectedFeature.metadata.event.importance === "critical"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {selectedFeature.metadata.event.importance}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedFeature.metadata.event.eventType}
                  </Badge>
                </div>

                {selectedFeature.metadata.event.description && (
                  <p className="text-sm text-foreground-secondary mb-2">
                    {selectedFeature.metadata.event.description}
                  </p>
                )}

                <div className="text-xs text-foreground-muted mb-3">
                  {selectedFeature.startAt.toLocaleDateString()}
                  {selectedFeature.metadata.event.endDate &&
                    ` - ${new Date(selectedFeature.metadata.event.endDate).toLocaleDateString()}`}
                  {selectedFeature.metadata.event.eventType === "ongoing" &&
                    !selectedFeature.metadata.event.endDate &&
                    " - ongoing"}{" "}
                  • Category: {selectedFeature.metadata.event.category} •
                  Confidence:{" "}
                  {Math.round(selectedFeature.metadata.event.confidence * 100)}%
                </div>

                {selectedFeature.metadata.event.targetEntity && (
                  <div className="text-sm text-foreground-secondary mb-2">
                    Related to:{" "}
                    <span className="font-medium">
                      {selectedFeature.metadata.event.targetEntity.name}
                    </span>
                    {selectedFeature.metadata.event.relationshipType && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({selectedFeature.metadata.event.relationshipType})
                      </span>
                    )}
                  </div>
                )}

                {selectedFeature.metadata.evidenceCount > 0 && (
                  <div className="text-xs text-foreground-muted">
                    Evidence: {selectedFeature.metadata.evidenceCount} sources
                    available
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedFeature(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                {selectedFeature.metadata.entityUid && (
                  <Button
                    size="sm"
                    onClick={() => handleEgoGraphClick(selectedFeature)}
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

      {/* Legend */}
      <div className="px-4 pb-4 text-xs text-muted-foreground text-center border-t pt-4">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-error-500 border-2 border-error-600"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-warning-500 border-2 border-warning-600"></div>
            <span>Major</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-info-500 border-2 border-info-600"></div>
            <span>Minor</span>
          </div>
          <span className="ml-4">•</span>
          <span>
            Click events for details •{" "}
            {readOnly ? "Read-only mode" : "Drag to adjust"}
          </span>
        </div>
      </div>
    </div>
  );
}
