/**
 * Pie Chart View Component
 *
 * ECharts-based pie chart for distribution analysis.
 * Shows proportional data visualization across entities.
 */

"use client";

import React from "react";

import { Icon } from "@proto/icon-system";

import type {
  ChartData,
  ChartConfiguration,
} from "../../types/ChartConfiguration";

// ==================== Component Props ====================

interface PieChartViewProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export function PieChartView({
  entities,
  config,
  height = 600,
  className = "",
}: PieChartViewProps) {
  return (
    <div
      className={`p-8 text-center text-gray-500 ${className}`}
      style={{ height }}
    >
      <Icon name="pie-chart" size={48} className="mx-auto mb-4" />
      <h3 className="font-medium mb-2">Pie Chart View</h3>
      <p className="text-sm">
        Distribution visualization for {entities.length} entities will be
        implemented here.
      </p>
      <p className="text-xs mt-2">
        Data source: {config.dataSource} | View mode: {config.viewMode}
      </p>
    </div>
  );
}
