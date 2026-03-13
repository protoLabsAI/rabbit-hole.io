/**
 * Line Chart View Component
 *
 * ECharts-based line chart for trend analysis over time.
 * Supports temporal data visualization and comparison.
 */

"use client";

import React from "react";

import { Icon } from "@proto/icon-system";

import type {
  ChartData,
  ChartConfiguration,
} from "../../types/ChartConfiguration";

// ==================== Component Props ====================

interface LineChartViewProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export function LineChartView({
  entities,
  config,
  height = 600,
  className = "",
}: LineChartViewProps) {
  return (
    <div
      className={`p-8 text-center text-gray-500 ${className}`}
      style={{ height }}
    >
      <Icon name="line-chart" size={48} className="mx-auto mb-4" />
      <h3 className="font-medium mb-2">Line Chart View</h3>
      <p className="text-sm">
        Line chart visualization for {entities.length} entities will be
        implemented here.
      </p>
      <p className="text-xs mt-2">
        Data source: {config.dataSource} | View mode: {config.viewMode}
      </p>
    </div>
  );
}
