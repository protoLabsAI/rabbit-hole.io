/**
 * Share Analytics Visualization Component
 *
 * Wrapper component for MultiEntityChart that handles analytics-specific data formatting
 * and provides appropriate loading/error states for public analytics sharing.
 */

"use client";

import React from "react";

import type { SharePageData } from "@proto/types";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";

import { MultiEntityChart } from "../../analytics/components/MultiEntityChart";
import type {
  ChartData,
  ChartConfiguration,
} from "../../analytics/types/ChartConfiguration";

// ==================== Types ====================

interface AnalyticsFilters {
  categories: string[];
  importance: string[];
  eventTypes: string[];
  tags: string[];
  sentiments: string[];
  metrics: string[];
}

interface TimeWindow {
  from: string;
  to: string;
}

interface ShareAnalyticsVisualizationProps {
  shareData: SharePageData;
  chartData: ChartData[];
  chartConfig: ChartConfiguration;
  filters?: AnalyticsFilters;
  timeWindow?: TimeWindow;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

// ==================== Component ====================

export function ShareAnalyticsVisualization({
  shareData,
  chartData,
  chartConfig,
  filters,
  timeWindow,
  isLoading = false,
  error,
  className = "",
}: ShareAnalyticsVisualizationProps) {
  const hasData =
    chartData.length > 0 && chartData.some((entity) => entity.data.length > 0);
  const entityCount = chartData.length;

  return (
    <Card className={`border-gray-200 shadow-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {shareData.title || `Multi-Entity ${chartConfig.type} Analysis`}
            </CardTitle>
            <CardDescription className="mt-1">
              {shareData.description ||
                `Comparing ${entityCount} ${entityCount === 1 ? "entity" : "entities"} using ${chartConfig.dataSource} data`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {entityCount} {entityCount === 1 ? "Entity" : "Entities"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {chartConfig.type} Chart
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {chartConfig.dataSource} Data
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠</span>
              </div>
              <h3 className="font-medium text-red-700 mb-2">
                Failed to load analytics data
              </h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-500 text-xl">📊</span>
              </div>
              <h3 className="font-medium text-gray-700 mb-2">
                No data available
              </h3>
              <p className="text-sm text-gray-500">
                No {chartConfig.dataSource} data found for the selected entities
                and filters
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Visualization */}
            <MultiEntityChart
              entities={chartData}
              chartConfig={chartConfig}
              filters={
                filters || {
                  categories: [],
                  importance: [],
                  eventTypes: [],
                  tags: [],
                  sentiments: [],
                  metrics: [],
                }
              }
              timeWindow={timeWindow}
              height={500}
              onDataPointClick={(dataPoint, entityUid) => {
                console.log(
                  `Share view - data point clicked:`,
                  dataPoint,
                  `from entity:`,
                  entityUid
                );
                // Note: Interaction logging for analytics on public shares
              }}
              className="rounded-lg"
            />

            {/* Analysis Summary */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {chartData.length}
                  </div>
                  <div className="text-xs text-gray-500">Entities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {chartData.reduce(
                      (sum, entity) => sum + entity.data.length,
                      0
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Data Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {chartConfig.type.charAt(0).toUpperCase() +
                      chartConfig.type.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">Chart Type</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {shareData.viewCount}
                  </div>
                  <div className="text-xs text-gray-500">Views</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
