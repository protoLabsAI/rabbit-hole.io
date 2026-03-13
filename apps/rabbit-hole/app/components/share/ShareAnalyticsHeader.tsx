/**
 * Share Analytics Header Component
 *
 * Extended header component for analytics share pages that shows
 * multi-entity information and chart configuration details.
 */

"use client";

import React from "react";

import type { SharePageData } from "@proto/types";
import { Badge } from "@proto/ui/atoms";

import type { ChartConfiguration } from "../../analytics/types/ChartConfiguration";

import { SharePageHeader } from "./SharePageHeader";

// ==================== Types ====================

interface ShareAnalyticsHeaderProps {
  shareData: SharePageData;
  entities: string[];
  chartConfig: ChartConfiguration;
  className?: string;
}

// ==================== Helper Functions ====================

function getChartTypeIcon(chartType: string): string {
  const icons = {
    timeline: "📅",
    bar: "📊",
    line: "📈",
    pie: "🥧",
    scatter: "⚡",
    network: "🕸️",
    heatmap: "🔥",
  };
  return icons[chartType as keyof typeof icons] || "📊";
}

function getDataSourceLabel(dataSource: string): string {
  const labels = {
    timeline: "Timeline Events",
    speechActs: "Speech Analysis",
    relationships: "Relationships",
    biographical: "Biography",
    activity: "Activity Patterns",
    metrics: "Entity Metrics",
  };
  return labels[dataSource as keyof typeof labels] || dataSource;
}

function formatEntityName(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[1]
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return entityUid;
}

function getEntityType(entityUid: string): string {
  const typeMap = {
    per: "Person",
    org: "Organization",
    mvt: "Movement",
    evt: "Event",
    plat: "Platform",
  };

  const prefix = entityUid.split(":")[0];
  return typeMap[prefix as keyof typeof typeMap] || "Entity";
}

// ==================== Component ====================

export function ShareAnalyticsHeader({
  shareData,
  entities,
  chartConfig,
  className = "",
}: ShareAnalyticsHeaderProps) {
  // Generate analytics-specific badges
  const analyticsBadges = [
    <Badge
      key="entities"
      variant="secondary"
      className="flex items-center gap-1"
    >
      <span>👥</span>
      {entities.length} {entities.length === 1 ? "Entity" : "Entities"}
    </Badge>,
    <Badge
      key="chart-type"
      variant="secondary"
      className="flex items-center gap-1"
    >
      <span>{getChartTypeIcon(chartConfig.type)}</span>
      {chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1)}
    </Badge>,
    <Badge
      key="data-source"
      variant="secondary"
      className="flex items-center gap-1"
    >
      <span>📊</span>
      {getDataSourceLabel(chartConfig.dataSource)}
    </Badge>,
    <Badge key="view-mode" variant="outline" className="text-xs">
      {chartConfig.viewMode}
    </Badge>,
  ];

  // Enhanced title for analytics shares
  const analyticsTitle =
    shareData.title ||
    `${entities.length > 1 ? "Multi-Entity" : "Entity"} ${chartConfig.type} Analysis`;

  // Enhanced description with entity details
  const entityNames = entities.slice(0, 3).map(formatEntityName);
  const entitySummary =
    entities.length > 3
      ? `${entityNames.join(", ")} and ${entities.length - 3} others`
      : entityNames.join(", ");

  const analyticsDescription =
    shareData.description ||
    `Comparative ${chartConfig.type} analysis of ${entitySummary} using ${getDataSourceLabel(chartConfig.dataSource).toLowerCase()} data`;

  // Create enhanced share data
  const enhancedShareData: SharePageData = {
    ...shareData,
    title: analyticsTitle,
    description: analyticsDescription,
  };

  return (
    <div className={className}>
      <SharePageHeader
        shareData={enhancedShareData}
        additionalBadges={analyticsBadges}
      />

      {/* Entity Details Section */}
      {entities.length > 1 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Analyzed Entities ({entities.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {entities.map((entityUid, index) => (
              <div
                key={entityUid}
                className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-200"
              >
                <span className="text-xs text-gray-500">
                  {getEntityType(entityUid)}
                </span>
                <span className="text-sm font-medium">
                  {formatEntityName(entityUid)}
                </span>
                {index === 0 && (
                  <Badge variant="outline" className="text-xs ml-1">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
