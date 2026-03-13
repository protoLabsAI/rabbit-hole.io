/**
 * Network Chart View Component
 *
 * ECharts-based network graph for relationship visualization.
 * Shows connections and relationships between entities.
 */

"use client";

import React from "react";

import { Icon } from "@proto/icon-system";

import type {
  ChartData,
  ChartConfiguration,
} from "../../types/ChartConfiguration";

// ==================== Component Props ====================

interface NetworkChartViewProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export function NetworkChartView({
  entities,
  config,
  height = 600,
  className = "",
}: NetworkChartViewProps) {
  return (
    <div
      className={`p-8 text-center text-gray-500 ${className}`}
      style={{ height }}
    >
      <Icon name="network" size={48} className="mx-auto mb-4" />
      <h3 className="font-medium mb-2">Network Chart View</h3>
      <p className="text-sm">
        Relationship network for {entities.length} entities will be implemented
        here.
      </p>
      <p className="text-xs mt-2">
        Data source: {config.dataSource} | View mode: {config.viewMode}
      </p>
    </div>
  );
}
