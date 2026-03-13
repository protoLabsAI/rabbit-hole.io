/**
 * Share Timeline Visualization Component
 *
 * Wrapper component for TimelineChart that handles share-specific data formatting
 * and provides appropriate loading/error states for public sharing.
 */

import type { SharePageData } from "@proto/types";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";

import { TimelineChart } from "../../atlas/components/TimelineChart";

interface TimelineData {
  timestamp: string;
  count: number;
  hostileCount: number;
  supportiveCount: number;
  neutralCount: number;
}

interface ShareTimelineVisualizationProps {
  shareData: SharePageData;
  timelineData?: TimelineData[];
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export function ShareTimelineVisualization({
  shareData,
  timelineData = [],
  isLoading = false,
  error,
  className = "",
}: ShareTimelineVisualizationProps) {
  const timeWindow = shareData.parameters.timeWindow || {
    from: "2024-01-01",
    to: "2024-01-31",
  };

  const granularity = shareData.parameters.granularity || "day";

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Activity Timeline
            <Badge variant="secondary" className="text-xs">
              Loading
            </Badge>
          </CardTitle>
          <CardDescription>
            Fetching timeline data from {timeWindow.from} to {timeWindow.to}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-50 rounded border flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-500">Loading timeline data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Activity Timeline
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          </CardTitle>
          <CardDescription>Unable to load timeline data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-red-50 border border-red-200 rounded flex items-center justify-center">
            <div className="text-center text-red-600">
              <svg
                className="mx-auto h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (timelineData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Activity Timeline
            <Badge variant="outline" className="text-xs">
              No Data
            </Badge>
          </CardTitle>
          <CardDescription>
            Timeline period: {timeWindow.from} to {timeWindow.to}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm font-medium">No activity found</p>
              <p className="text-xs mt-1">
                No events found in the selected time window
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalEvents = timelineData.reduce((sum, item) => sum + item.count, 0);
  const totalHostile = timelineData.reduce(
    (sum, item) => sum + item.hostileCount,
    0
  );
  const totalSupportive = timelineData.reduce(
    (sum, item) => sum + item.supportiveCount,
    0
  );
  const totalNeutral = timelineData.reduce(
    (sum, item) => sum + item.neutralCount,
    0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Activity Timeline</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totalEvents} total events
            </Badge>
            <Badge variant="outline" className="text-xs">
              {granularity}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Interactive timeline showing activity patterns from {timeWindow.from}{" "}
          to {timeWindow.to}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {(totalHostile > 0 || totalSupportive > 0 || totalNeutral > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {totalSupportive > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{totalSupportive} supportive</span>
              </div>
            )}
            {totalNeutral > 0 && (
              <div className="flex items-center gap-1 text-gray-600">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>{totalNeutral} neutral</span>
              </div>
            )}
            {totalHostile > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{totalHostile} hostile</span>
              </div>
            )}
          </div>
        )}

        {/* Timeline Chart */}
        <TimelineChart
          data={timelineData}
          granularity={granularity}
          timeWindow={timeWindow}
          height={300}
          className="bg-white rounded border"
        />

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          💡 This is a shared timeline view • Hover for details • Scroll to zoom
        </div>
      </CardContent>
    </Card>
  );
}
