/**
 * EntityCard Component
 *
 * Reusable entity card with optional compact timeline integration.
 * Used across Atlas interface for consistent entity display.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";

import type { CompactTimelineData } from "@proto/types";

import { batchTimelineFetcher } from "../utils/batch-timeline-fetcher";

import { CompactTimeline } from "./CompactTimeline";

export interface EntityCardProps {
  entity: {
    uid: string;
    name: string;
    type: string;
    title: string;
    subtitle?: string;
    eventCount?: number;
  };
  showTimeline?: boolean;
  timeWindow?: { from: string; to: string };
  height?: number;
  onExpandClick?: (entityUid: string, timestamp?: string) => void;
  onClick?: (entityUid: string) => void;
  className?: string;
}

export function EntityCard({
  entity,
  showTimeline = false,
  timeWindow,
  height = 100,
  onExpandClick,
  onClick,
  className = "",
}: EntityCardProps) {
  const [timelineData, setTimelineData] = useState<CompactTimelineData | null>(
    null
  );
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Load timeline data when timeline is enabled
  const loadTimelineData = useCallback(async () => {
    if (!showTimeline || !timeWindow) return;

    setIsLoadingTimeline(true);
    setTimelineError(null);

    try {
      // Use batch timeline fetcher for optimized performance
      const result = await batchTimelineFetcher.fetchTimeline({
        entityUid: entity.uid,
        timeWindow,
        granularity: "week",
        importance: ["critical", "major", "minor"],
        limit: 50,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setTimelineData(result.data);
    } catch (err) {
      console.error(`Failed to load timeline for ${entity.uid}:`, err);
      setTimelineError(
        err instanceof Error ? err.message : "Failed to load timeline"
      );
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [entity.uid, showTimeline, timeWindow]);

  // Load timeline data when component mounts or dependencies change
  useEffect(() => {
    if (showTimeline && timeWindow) {
      loadTimelineData();
    }
  }, [loadTimelineData, showTimeline, timeWindow]);

  // Clear timeline data when timeline is disabled or timeWindow changes
  useEffect(() => {
    if (!showTimeline) {
      setTimelineData(null);
      setTimelineError(null);
      setIsLoadingTimeline(false);
    }
  }, [showTimeline]);

  const handleCardClick = () => {
    onClick?.(entity.uid);
  };

  const handleExpandClick = (entityUid: string, timestamp?: string) => {
    onExpandClick?.(entityUid, timestamp);
  };

  return (
    <div
      className={`border border-gray-200 rounded-lg hover:border-gray-300 transition-colors ${
        onClick ? "cursor-pointer hover:bg-gray-50" : ""
      } ${className}`}
      onClick={onClick ? handleCardClick : undefined}
    >
      {/* Entity Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">
              {entity.title}
            </h4>
            {entity.subtitle && (
              <p className="text-xs sm:text-sm text-gray-600 truncate mt-1">
                {entity.subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
              {entity.type}
            </span>
            {entity.eventCount !== undefined && (
              <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                {entity.eventCount} events
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Timeline */}
      {showTimeline && (
        <div className="border-0">
          <CompactTimeline
            entityUid={entity.uid}
            timelineData={timelineData}
            height={height}
            showControls={false}
            isLoading={isLoadingTimeline}
            error={timelineError ?? undefined}
            className="border-0 rounded-none"
            onExpandClick={handleExpandClick}
          />
        </div>
      )}
    </div>
  );
}

// Helper component for loading state
export function EntityCardSkeleton({
  showTimeline = false,
  className = "",
}: {
  showTimeline?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border border-gray-200 rounded-lg animate-pulse ${className}`}
    >
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
      </div>

      {showTimeline && <div className="h-24 bg-gray-100 border-0"></div>}
    </div>
  );
}

// Helper component for empty state
export function EntityCardEmptyState({
  message = "No entities found",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`text-center py-8 text-gray-500 ${className}`}>
      <div className="text-4xl mb-2">📊</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
