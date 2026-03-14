/**
 * Enhanced Timeline Tab for FloatingDetailsPanel
 *
 * Integrates CompactTimeline visualization with existing detailed timeline functionality
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";

import type {
  CompactTimelineData,
  TimelineEvent,
  Granularity,
} from "@proto/types";
import {
  createCompactTimelineData,
  useTimelineCache,
} from "@proto/utils/atlas";

import { CompactTimeline } from "../../../atlas/components/CompactTimeline";
import {
  TimelineControls,
  type TimeRange,
} from "../../../atlas/components/TimelineControls";
// EventGanttChart was removed with share components — using compact timeline instead

// Re-use the existing interfaces from FloatingDetailsPanel
interface EnhancedNodeDetails {
  entity: {
    id: string;
    label: string;
    entityType: string;
    dates: Record<string, any>;
    [key: string]: any;
  };
  timeline?: {
    events?: Array<{
      id: string;
      timestamp: string;
      eventType: "intrinsic" | "relationship" | "milestone" | "ongoing";
      category: string;
      title: string;
      importance: "critical" | "major" | "minor";
      isPlaceholder?: boolean;
      [key: string]: any;
    }>;
    summary?: {
      totalEvents?: number;
      placeholderEvents?: number;
      eventCategories?: Record<string, number>;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

interface EnhancedTimelineTabProps {
  node: EnhancedNodeDetails["entity"];
  timeline?: EnhancedNodeDetails["timeline"];
  onOpenResearchReport?: (entityUid: string, entityName: string) => void;
  isSignedIn?: boolean;
}

export function EnhancedTimelineTab({
  node,
  timeline,
  onOpenResearchReport,
  isSignedIn,
}: EnhancedTimelineTabProps) {
  const [filters, setFilters] = useState({
    categories: [] as string[],
    importance: [] as string[],
    showPlaceholders: true,
  });

  const [biographicalAnalysis, setBiographicalAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [compactTimelineData, setCompactTimelineData] =
    useState<CompactTimelineData | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 6 months ago
    to: new Date().toISOString().split("T")[0],
    label: "Last 6 months",
  });

  // Timeline cache for performance
  const timelineCache = useTimelineCache();

  // Convert timeline events to CompactTimeline format
  const convertToTimelineEvents = useMemo(() => {
    if (!timeline?.events) return [];

    return timeline.events
      .filter((event) => !event.isPlaceholder) // Exclude placeholders for compact view
      .map(
        (event): TimelineEvent => ({
          id: event.id,
          timestamp: event.timestamp,
          eventType: event.eventType,
          category: event.category,
          title: event.title,
          confidence: 0.8, // Default confidence for existing events
          importance: event.importance,
        })
      );
  }, [timeline?.events]);

  // Generate compact timeline data when events change (with caching)
  useEffect(() => {
    if (convertToTimelineEvents.length > 0) {
      setIsLoadingTimeline(true);

      const generateCompactData = async () => {
        try {
          // Check cache first
          const cacheKey = `${node.id}:${granularity}:${timeRange.from}:${timeRange.to}`;
          const cached = timelineCache.get(
            node.id,
            undefined,
            cacheKey
          ) as CompactTimelineData | null;

          if (cached) {
            console.log("📦 Using cached timeline data for", node.id);
            setCompactTimelineData(cached);
            setIsLoadingTimeline(false);
            return;
          }

          // Generate fresh data
          const compactData = createCompactTimelineData(
            node.id,
            convertToTimelineEvents,
            granularity,
            { from: timeRange.from, to: timeRange.to }
          );

          if (compactData && compactData.periods.length > 0) {
            // Store in cache
            timelineCache.set(node.id, compactData, undefined, cacheKey);
            setCompactTimelineData(compactData);
          } else {
            console.warn("No timeline periods generated for entity:", node.id);
            setCompactTimelineData(null);
          }
        } catch (error) {
          console.error("Failed to create compact timeline data:", error);
          setCompactTimelineData(null);
        } finally {
          setIsLoadingTimeline(false);
        }
      };

      generateCompactData();
    } else {
      setCompactTimelineData(null);
      setIsLoadingTimeline(false);
    }
  }, [node.id, convertToTimelineEvents, granularity, timeRange, timelineCache]);

  // Load biographical analysis when tab opens and user is signed in
  useEffect(() => {
    if (isSignedIn) {
      const loadBiographicalAnalysis = async () => {
        setIsLoadingAnalysis(true);
        try {
          const response = await fetch(`/api/research/biographical/${node.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setBiographicalAnalysis(result.data);
            }
          }
        } catch (error) {
          console.warn("Failed to load biographical analysis:", error);
        } finally {
          setIsLoadingAnalysis(false);
        }
      };

      loadBiographicalAnalysis();
    }
  }, [node.id, isSignedIn]);

  const filteredEvents =
    timeline?.events?.filter((event) => {
      // Apply category filters
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(event.category)
      ) {
        return false;
      }

      // Apply importance filters
      if (
        filters.importance.length > 0 &&
        !filters.importance.includes(event.importance)
      ) {
        return false;
      }

      // Apply placeholder filter
      if (!filters.showPlaceholders && event.isPlaceholder) {
        return false;
      }

      return true;
    }) || [];

  return (
    <div className="space-y-6">
      {timeline ? (
        <>
          {/* Timeline Header with Controls */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              📅 Timeline ({timeline.summary?.totalEvents || 0} events)
            </h4>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <button
                onClick={() => setShowDetailedView(!showDetailedView)}
                className="px-2 py-1 text-xs bg-background-muted text-foreground-muted rounded hover:bg-background-secondary transition-colors"
              >
                {showDetailedView ? "📊 Overview" : "📋 Details"}
              </button>

              {/* Analyze Button */}
              {onOpenResearchReport &&
                (timeline.summary?.placeholderEvents || 0) > 0 &&
                isSignedIn && (
                  <button
                    onClick={() => onOpenResearchReport(node.id, node.label)}
                    className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center space-x-1"
                    title="Generate comprehensive research analysis"
                  >
                    <span>📊</span>
                    <span>Analyze</span>
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs font-medium">
                      {timeline.summary?.placeholderEvents || 0}
                    </span>
                  </button>
                )}
              {onOpenResearchReport &&
                (timeline.summary?.placeholderEvents || 0) > 0 &&
                !isSignedIn && (
                  <div className="px-3 py-1.5 text-xs bg-background-muted text-foreground-muted rounded-lg flex items-center space-x-1">
                    <span>🔒</span>
                    <span>Sign in to analyze</span>
                  </div>
                )}
            </div>
          </div>

          {/* Timeline Controls */}
          {!showDetailedView && (
            <div className="bg-background-secondary rounded-lg border border-border p-4 mb-4">
              <h5 className="text-sm font-semibold text-foreground mb-3">
                Timeline Controls
              </h5>
              <TimelineControls
                granularity={granularity}
                currentTimeRange={timeRange}
                onGranularityChange={setGranularity}
                onTimeRangeChange={setTimeRange}
                onCustomDateRange={(from, to) => {
                  setTimeRange({ from, to, label: "Custom Range" });
                }}
                disabled={isLoadingTimeline}
                compact={false}
              />
            </div>
          )}

          {/* Compact Timeline Visualization */}
          {!showDetailedView && (
            <div className="bg-white rounded-lg border">
              <CompactTimeline
                entityUid={node.id}
                timelineData={compactTimelineData}
                height={140}
                showControls={false}
                onExpandClick={(entityUid, timestamp) => {
                  setShowDetailedView(true);
                  if (timestamp) {
                    // Could scroll to specific time period in detailed view
                    console.log(
                      `Expanding to detailed view focused on ${timestamp}`
                    );
                  }
                }}
                isLoading={isLoadingTimeline}
                disabled={isLoadingTimeline}
                className="border-0"
              />

              {/* Quick Stats */}
              {compactTimelineData && (
                <div className="px-4 pb-3 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-xs text-foreground-muted">
                    <div className="text-center">
                      <div className="font-medium text-foreground">
                        {compactTimelineData.summary.totalEvents}
                      </div>
                      <div>Total Events</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground capitalize">
                        {compactTimelineData.summary.dominantImportance}
                      </div>
                      <div>Peak Importance</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">
                        {Math.round(
                          (new Date().getTime() -
                            new Date(
                              compactTimelineData.summary.activitySpan.earliest
                            ).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000)
                        )}
                        y
                      </div>
                      <div>Activity Span</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detailed Timeline View */}
          {showDetailedView && (
            <>
              {/* Timeline Filters */}
              <div className="bg-background-secondary rounded-lg p-3">
                <h5 className="text-sm font-semibold text-foreground mb-2">
                  Timeline Filters
                </h5>

                {/* Category Filter */}
                {timeline.summary?.eventCategories &&
                  Object.keys(timeline.summary?.eventCategories || {}).length >
                    1 && (
                    <div className="mb-2">
                      <label className="text-xs text-foreground-secondary mb-1 block">
                        Event Categories
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(
                          timeline.summary?.eventCategories || {}
                        ).map((category) => (
                          <button
                            key={category}
                            className={`px-2 py-1 text-xs rounded ${
                              filters.categories.includes(category)
                                ? "bg-primary/10 text-primary"
                                : "bg-background-muted text-foreground-muted"
                            }`}
                            onClick={() => {
                              setFilters((prev) => ({
                                ...prev,
                                categories: prev.categories.includes(category)
                                  ? prev.categories.filter(
                                      (c) => c !== category
                                    )
                                  : [...prev.categories, category],
                              }));
                            }}
                          >
                            {category.replace(/_/g, " ")} (
                            {timeline.summary?.eventCategories?.[category] || 0}
                            )
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Importance Filter */}
                <div className="mb-2">
                  <label className="text-xs text-foreground-secondary mb-1 block">
                    Importance
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["critical", "major", "minor"].map((importance) => (
                      <button
                        key={importance}
                        className={`px-2 py-1 text-xs rounded capitalize ${
                          filters.importance.includes(importance)
                            ? importance === "critical"
                              ? "bg-error/10 text-error"
                              : importance === "major"
                                ? "bg-warning/10 text-warning"
                                : "bg-info/10 text-info"
                            : "bg-background-muted text-foreground-muted"
                        }`}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            importance: prev.importance.includes(importance)
                              ? prev.importance.filter((i) => i !== importance)
                              : [...prev.importance, importance],
                          }));
                        }}
                      >
                        {importance}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placeholder Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showPlaceholders"
                    checked={filters.showPlaceholders}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        showPlaceholders: e.target.checked,
                      }))
                    }
                    className="w-3 h-3 text-primary rounded focus:ring-primary"
                  />
                  <label
                    htmlFor="showPlaceholders"
                    className="ml-2 text-xs text-foreground-secondary"
                  >
                    Show missing dates (
                    {timeline.summary?.placeholderEvents || 0})
                  </label>
                </div>
              </div>

              {/* Full Timeline Chart */}
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-foreground">
                  Timeline Events ({filteredEvents.length})
                </h5>

                {(() => {
                  const filteredTimelineEvents = convertToTimelineEvents.filter(
                    (event) => {
                      // Apply same filters as filteredEvents but to timeline format
                      if (
                        filters.categories.length > 0 &&
                        !filters.categories.includes(event.category)
                      ) {
                        return false;
                      }
                      if (
                        filters.importance.length > 0 &&
                        !filters.importance.includes(event.importance)
                      ) {
                        return false;
                      }
                      return true;
                    }
                  );

                  if (filteredTimelineEvents.length === 0) {
                    return (
                      <div className="border border-border rounded-lg p-8 text-center text-foreground-muted">
                        <div className="text-sm font-medium">
                          No events match current filters
                        </div>
                        <div className="text-xs mt-1">
                          Try adjusting your filter settings above
                        </div>
                      </div>
                    );
                  }

                  try {
                    return (
                      <div className="border border-border rounded-lg p-6 text-center text-muted-foreground">
                        <div className="text-sm">
                          {filteredTimelineEvents.length} timeline events
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error("Failed to render timeline:", error);
                    return (
                      <div className="border border-error/20 rounded-lg p-8 text-center text-error">
                        <div className="text-sm font-medium">
                          Failed to load timeline
                        </div>
                        <div className="text-xs mt-1">
                          Timeline data may be corrupted or incomplete
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </>
          )}

          {/* Biographical Analysis Section */}
          {isLoadingAnalysis && (
            <div className="bg-background-secondary rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-foreground-secondary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Loading biographical analysis...</span>
              </div>
            </div>
          )}

          {biographicalAnalysis && (
            <div className="bg-background-secondary rounded-lg p-4">
              <h5 className="text-sm font-semibold text-foreground mb-2">
                📊 Biographical Analysis
              </h5>
              <div className="prose prose-sm max-w-none text-foreground-secondary">
                {/* Display biographical analysis content */}
                <div className="text-xs">
                  {biographicalAnalysis.summary || "Analysis data available"}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-foreground-muted">
          <div className="text-sm font-medium">No Timeline Data</div>
          <div className="text-xs mt-1">
            Timeline information is not available for this entity
          </div>
        </div>
      )}
    </div>
  );
}
