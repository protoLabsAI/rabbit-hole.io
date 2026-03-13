/**
 * Time Slice Aggregation Hook
 *
 * Fetches aggregated time data for timeline visualization
 */

import { useState, useEffect, useCallback } from "react";

import {
  TimeWindow,
  buildTimeSliceUrl,
  getOptimalGranularity,
  globalTimeSliceCache,
} from "@proto/utils/atlas";

interface AggregationData {
  granularity: "hour" | "day" | "week" | "month";
  bins: Array<{
    timestamp: string;
    count: number;
    hostileCount: number;
    supportiveCount: number;
    neutralCount: number;
  }>;
  totalEvents: number;
}

interface UseTimeSliceAggregationResult {
  data: AggregationData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTimeSliceAggregation(
  timeWindow: TimeWindow,
  entityUid?: string,
  enabled = true
): UseTimeSliceAggregationResult {
  const [data, setData] = useState<AggregationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregation = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const granularity = getOptimalGranularity(timeWindow);

      // Generate cache key
      const cacheKey = globalTimeSliceCache.generateKey({
        timeWindow,
        entityUid,
        aggregate: true,
        granularity,
        pageSize: 1, // Small page size since we only want aggregation
      });

      // Check cache first
      const cachedData = globalTimeSliceCache.get(cacheKey);
      if (cachedData?.aggregation) {
        setData(cachedData.aggregation);
        setLoading(false);
        return;
      }

      const url = buildTimeSliceUrl("http://localhost:3000", {
        timeWindow,
        entityUid,
        aggregate: true,
        granularity,
        pageSize: 1, // Minimal page size for aggregation-only requests
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch aggregation: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to load aggregation data");
      }

      if (result.aggregation) {
        setData(result.aggregation);

        // Cache the aggregation data
        globalTimeSliceCache.set(cacheKey, { aggregation: result.aggregation });
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Failed to fetch time slice aggregation:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [timeWindow, entityUid, enabled]);

  const refetch = useCallback(() => {
    fetchAggregation();
  }, [fetchAggregation]);

  useEffect(() => {
    if (enabled) {
      fetchAggregation();
    }
  }, [fetchAggregation, enabled]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
