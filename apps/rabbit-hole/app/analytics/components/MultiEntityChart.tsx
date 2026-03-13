/**
 * Multi-Entity Chart Component
 *
 * Universal chart renderer that routes to appropriate chart components
 * based on configuration. Maintains entity color coding and legends.
 */

"use client";

import React, { memo } from "react";

import { Icon } from "@proto/icon-system";

import type {
  AnalyticsFilters,
  TimeWindow,
} from "../hooks/useAnalyticsPageState";
import type {
  ChartData,
  ChartConfiguration,
} from "../types/ChartConfiguration";

// Chart view components (to be implemented)
import { BarChartView } from "./charts/BarChartView";
import { HeatmapChartView } from "./charts/HeatmapChartView";
import { LineChartView } from "./charts/LineChartView";
import { NetworkChartView } from "./charts/NetworkChartView";
import { PieChartView } from "./charts/PieChartView";
import { TimelineChartView } from "./charts/TimelineChartView";

// ==================== Component Props ====================

export interface MultiEntityChartProps {
  entities: ChartData[];
  chartConfig: ChartConfiguration;
  filters?: AnalyticsFilters;
  timeWindow?: TimeWindow;
  height?: number;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export const MultiEntityChart = memo(function MultiEntityChart({
  entities,
  chartConfig,
  filters,
  timeWindow,
  height = 600,
  onDataPointClick,
  className = "",
}: MultiEntityChartProps) {
  // Check if any entities have data
  const hasData = entities.some((entity) => entity.data.length > 0);

  if (!hasData) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <Icon name="alert-circle" size={32} className="mx-auto mb-2" />
        <h3 className="font-medium mb-1">No data available</h3>
        <p className="text-sm">
          No {chartConfig.dataSource} data found for selected entities
        </p>
      </div>
    );
  }

  // Common props for all chart components
  const commonProps = {
    entities,
    config: chartConfig,
    height,
    onDataPointClick,
    className,
    filters,
    timeWindow,
  };

  // Route to appropriate chart component based on configuration
  switch (chartConfig.type) {
    case "timeline":
      return <TimelineChartView {...commonProps} />;

    case "bar":
      return <BarChartView {...commonProps} />;

    case "line":
      return <LineChartView {...commonProps} />;

    case "pie":
      return <PieChartView {...commonProps} />;

    case "network":
      return <NetworkChartView {...commonProps} />;

    case "heatmap":
      return <HeatmapChartView {...commonProps} />;

    default:
      return (
        <div className={`p-8 text-center text-gray-500 ${className}`}>
          <Icon name="bar-chart" size={32} className="mx-auto mb-2" />
          <h3 className="font-medium mb-1">Unsupported chart type</h3>
          <p className="text-sm">
            Chart type &ldquo;{chartConfig.type}&rdquo; is not yet implemented
          </p>
        </div>
      );
  }
});
