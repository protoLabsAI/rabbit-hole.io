/**
 * Time Slice Info Panel Component
 *
 * Displays time-filtered events and entities in a simple list format
 * with pagination controls. Used as a stepping stone before full ECharts integration.
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";

import {
  TimeWindow,
  buildTimeSliceUrl,
  calculateOptimalPageSize,
  getOptimalGranularity,
  calculateTimeStats,
  formatDuration,
  getTimePresets,
  globalTimeSliceCache,
} from "@proto/utils/atlas";

import { EventGanttChart } from "@/components/share/EventGanttChart";

import { EntityCard, EntityCardEmptyState } from "./EntityCard";
import { TimelineChart } from "./TimelineChart";

interface TimeSliceData {
  nodes: Array<{
    uid: string;
    name: string;
    type: string;
    display: { title: string; subtitle: string };
    metrics: { activityInWindow: number };
  }>;
  edges: Array<{
    uid: string;
    type: string;
    sentiment: string;
    display: { label: string; excerpt: string; timestamp: string };
    metadata: { confidence: number };
  }>;
  pagination: {
    cursor?: string;
    pageSize: number;
    hasMore: boolean;
  };
  aggregation?: {
    granularity: string;
    bins: Array<{
      timestamp: string;
      count: number;
      hostileCount: number;
      supportiveCount: number;
      neutralCount: number;
    }>;
    totalEvents: number;
  };
  performance: {
    queryTime: number;
    resultSize: number;
    optimizationHints: string[];
  };
}

interface TimeSliceInfoPanelProps {
  timeWindow: TimeWindow;
  entityUid?: string;
  onTimeWindowChange?: (timeWindow: TimeWindow) => void;
  className?: string;
}

export function TimeSliceInfoPanel({
  timeWindow,
  entityUid,
  onTimeWindowChange,
  className = "",
}: TimeSliceInfoPanelProps) {
  const [data, setData] = useState<TimeSliceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"events" | "entities" | "overview">(
    "overview"
  );
  const [showAggregation, setShowAggregation] = useState(true);

  // Timeline expansion modal state
  const [expandedTimelineEntity, setExpandedTimelineEntity] = useState<
    string | null
  >(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [expandedTimelineEvents, setExpandedTimelineEvents] = useState<any[]>(
    []
  );
  const [loadingExpandedTimeline, setLoadingExpandedTimeline] = useState(false);

  // Load time slice data with intelligent caching
  const loadTimeSliceData = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);

      try {
        const optimalPageSize = calculateOptimalPageSize(timeWindow);
        const granularity = getOptimalGranularity(timeWindow);

        // Generate cache key
        const cacheKey = globalTimeSliceCache.generateKey({
          timeWindow,
          entityUid,
          cursor,
          pageSize: optimalPageSize,
          aggregate: showAggregation && !cursor,
          granularity,
        });

        // Try cache first
        const cachedData = globalTimeSliceCache.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setCurrentCursor(cachedData.pagination?.cursor);
          setLoading(false);
          return;
        }

        const url = buildTimeSliceUrl("http://localhost:3000", {
          timeWindow,
          entityUid,
          cursor,
          pageSize: optimalPageSize,
          aggregate: showAggregation && !cursor, // Only aggregate on first load
          granularity,
        });

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to load time slice data");
        }

        const timeSliceData = {
          nodes: result.data.nodes,
          edges: result.data.edges,
          pagination: result.pagination,
          aggregation: result.aggregation,
          performance: result.performance,
        };

        // Cache the result
        globalTimeSliceCache.set(cacheKey, timeSliceData);

        setData(timeSliceData);
        setCurrentCursor(result.pagination?.cursor);

        // Prefetch next page if available
        if (result.pagination?.hasMore) {
          globalTimeSliceCache.prefetchNext(cacheKey, async () => {
            // Simplified prefetch - would need more sophisticated logic in real usage
            return timeSliceData;
          });
        }
      } catch (err) {
        console.error("Failed to load time slice data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [timeWindow, entityUid, showAggregation]
  );

  // Load data when parameters change
  useEffect(() => {
    setCurrentCursor(undefined);
    loadTimeSliceData();
  }, [loadTimeSliceData]);

  // Load next page
  const loadNextPage = useCallback(() => {
    if (currentCursor && data?.pagination.hasMore) {
      loadTimeSliceData(currentCursor);
    }
  }, [currentCursor, data?.pagination.hasMore, loadTimeSliceData]);

  // Time preset selection
  const handleTimePresetSelect = useCallback(
    (preset: TimeWindow) => {
      onTimeWindowChange?.(preset);
    },
    [onTimeWindowChange]
  );

  // Handle timeline expansion click
  const handleTimelineExpand = useCallback(
    async (entityUid: string, timestamp?: string) => {
      setExpandedTimelineEntity(entityUid);
      setShowTimelineModal(true);
      setLoadingExpandedTimeline(true);
      setExpandedTimelineEvents([]);

      try {
        // Fetch full timeline events for the entity
        const response = await fetch(
          `/api/entity-timeline/${entityUid}?limit=100&importance=critical,major,minor`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch timeline: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to load timeline data");
        }

        // Convert events to EventTimelineChart format
        const timelineEvents = (result.data.events || []).map((event: any) => ({
          id: event.id || `${event.timestamp}-${event.title}`,
          timestamp: event.timestamp,
          endDate: event.endDate,
          eventType: event.eventType || "relationship",
          category: event.category || "general",
          title: event.title,
          description: event.description,
          relationshipType: event.relationshipType,
          targetEntity: event.targetEntity,
          evidence: event.evidence || [],
          importance: event.importance || "minor",
        }));

        setExpandedTimelineEvents(timelineEvents);

        // TODO: Could scroll to specific timestamp if provided
        console.log(
          `Expanded timeline for ${entityUid}`,
          timestamp ? `at ${timestamp}` : ""
        );
      } catch (err) {
        console.error(
          `Failed to load expanded timeline for ${entityUid}:`,
          err
        );
        setExpandedTimelineEvents([]);
      } finally {
        setLoadingExpandedTimeline(false);
      }
    },
    []
  );

  // Close timeline modal
  const handleCloseTimelineModal = useCallback(() => {
    setShowTimelineModal(false);
    setExpandedTimelineEntity(null);
    setExpandedTimelineEvents([]);
    setLoadingExpandedTimeline(false);
  }, []);

  if (loading && !data) {
    return (
      <div className={`bg-card rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-background-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-background-muted rounded"></div>
            <div className="h-3 bg-background-muted rounded w-5/6"></div>
            <div className="h-3 bg-background-muted rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-card rounded-lg shadow p-6 ${className}`}>
        <div className="text-error">
          <h3 className="font-semibold mb-2">Error Loading Time Slice</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => loadTimeSliceData()}
            className="mt-3 px-4 py-2 bg-error/10 text-error rounded hover:bg-error/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const timeStats =
    data.aggregation &&
    ["hour", "day", "week", "month"].includes(data.aggregation.granularity)
      ? calculateTimeStats(data.aggregation as any)
      : null;
  const duration = formatDuration(timeWindow);

  return (
    <div className={`bg-card rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            {entityUid ? "Entity Time Slice" : "Time Slice View"}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAggregation(!showAggregation)}
              className={`px-3 py-1 rounded text-sm ${
                showAggregation
                  ? "bg-primary/10 text-primary"
                  : "bg-background-muted text-foreground-muted"
              }`}
            >
              {showAggregation ? "Hide Stats" : "Show Stats"}
            </button>
          </div>
        </div>

        {/* Time Window Info */}
        <div className="text-sm text-foreground-secondary mb-3">
          <span className="font-medium">Period:</span> {timeWindow.from} to{" "}
          {timeWindow.to} ({duration})
          {entityUid && (
            <>
              <br />
              <span className="font-medium">Entity:</span> {entityUid}
            </>
          )}
        </div>

        {/* Time Presets */}
        {onTimeWindowChange && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Quick Time Ranges:
            </label>
            <div className="flex flex-wrap gap-1">
              {getTimePresets()
                .slice(0, 6)
                .map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleTimePresetSelect(preset.timeWindow)}
                    className="px-2 py-1 text-xs bg-background-muted hover:bg-background-secondary rounded"
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="flex border-b border-border">
          {["overview", "entities", "events"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as typeof viewMode)}
              className={`px-3 py-2 text-sm font-medium capitalize ${
                viewMode === mode
                  ? "border-b-2 border-primary text-primary"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {mode}
              {mode === "entities" && ` (${data.nodes.length})`}
              {mode === "events" && ` (${data.edges.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {viewMode === "overview" && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {data.nodes.length}
                </div>
                <div className="text-sm text-blue-600">Entities</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {data.edges.length}
                </div>
                <div className="text-sm text-green-600">Events</div>
              </div>
              {timeStats && (
                <>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {timeStats.peakActivity.count}
                    </div>
                    <div className="text-sm text-orange-600">Peak Activity</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(timeStats.averageActivity)}
                    </div>
                    <div className="text-sm text-purple-600">Daily Average</div>
                  </div>
                </>
              )}
            </div>

            {/* Time Aggregation Visualization */}
            {data.aggregation && showAggregation && (
              <div className="mt-6">
                <TimelineChart
                  data={data.aggregation.bins}
                  granularity={
                    data.aggregation.granularity as
                      | "hour"
                      | "day"
                      | "week"
                      | "month"
                  }
                  timeWindow={timeWindow}
                  onTimeRangeSelect={onTimeWindowChange}
                  height={200}
                  className="border rounded-lg bg-white"
                />
              </div>
            )}

            {/* Performance Info */}
            <div className="mt-6 p-3 bg-gray-50 rounded text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium">Query Time:</span>{" "}
                  {data.performance.queryTime}ms
                </div>
                <div>
                  <span className="font-medium">Result Size:</span>{" "}
                  {data.performance.resultSize} items
                </div>
                <div>
                  <span className="font-medium">Page Size:</span>{" "}
                  {data.pagination.pageSize}
                </div>
              </div>
              {data.performance.optimizationHints.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium">Tips:</span>
                  <ul className="ml-4 list-disc text-gray-600">
                    {data.performance.optimizationHints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entities Tab */}
        {viewMode === "entities" && (
          <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
            {data.nodes.length === 0 ? (
              <EntityCardEmptyState message="No entities found in this time window" />
            ) : (
              data.nodes.slice(0, 10).map((node) => (
                <EntityCard
                  key={node.uid}
                  entity={{
                    uid: node.uid,
                    name: node.name,
                    type: node.type,
                    title: node.display.title,
                    subtitle: node.display.subtitle,
                    eventCount: node.metrics.activityInWindow,
                  }}
                  showTimeline={true}
                  timeWindow={timeWindow}
                  height={80} // Slightly smaller on mobile
                  onExpandClick={handleTimelineExpand}
                />
              ))
            )}
            {data.nodes.length > 10 && (
              <div className="text-center py-3 sm:py-4 text-gray-500 text-xs sm:text-sm border-t border-gray-100">
                Showing timeline for first 10 entities only
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {viewMode === "events" && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.edges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No events found in this time window
              </div>
            ) : (
              data.edges.map((edge) => (
                <div
                  key={edge.uid}
                  className="p-3 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {edge.display.label}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            edge.sentiment === "hostile"
                              ? "bg-red-100 text-red-600"
                              : edge.sentiment === "supportive"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {edge.sentiment}
                        </span>
                      </div>
                      {edge.display.excerpt && (
                        <p className="text-sm text-gray-600 mb-1">
                          {edge.display.excerpt}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span>{edge.display.timestamp}</span>
                        <span>
                          Confidence:{" "}
                          {Math.round(edge.metadata.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {data.pagination.hasMore && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing{" "}
                {viewMode === "entities"
                  ? data.nodes.length
                  : data.edges.length}{" "}
                items
                {data.pagination.hasMore && " (more available)"}
              </div>
              <button
                onClick={loadNextPage}
                disabled={loading || !data.pagination.hasMore}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Expansion Modal */}
      {showTimelineModal && expandedTimelineEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Entity Timeline
                  </h3>
                  <p className="text-sm text-gray-600">
                    {expandedTimelineEntity}
                    {expandedTimelineEvents.length > 0 && (
                      <span className="ml-2">
                        ({expandedTimelineEvents.length} events)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleCloseTimelineModal}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded hover:bg-gray-200"
                  aria-label="Close timeline modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingExpandedTimeline ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">Loading timeline...</span>
                </div>
              ) : expandedTimelineEvents.length > 0 ? (
                <EventGanttChart
                  events={expandedTimelineEvents}
                  height={500}
                  className="w-full"
                  readOnly={false}
                  groupBy="category"
                  range="monthly"
                  onEventClick={(event) => {
                    console.log("Event clicked:", event);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-lg font-medium mb-1">No Timeline Events</p>
                  <p className="text-sm">
                    No timeline data available for this entity
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
