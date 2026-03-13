/**
 * Bar Chart View Component
 *
 * ECharts-based bar chart for comparing categorical data across entities.
 * Supports multiple view modes and aggregation options.
 */

"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import React, { useMemo } from "react";

import type { AnalyticsFilters } from "../../hooks/useAnalyticsPageState";
import type {
  ChartData,
  ChartConfiguration,
} from "../../types/ChartConfiguration";

// ==================== Component Props ====================

interface BarChartViewProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  filters?: AnalyticsFilters;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export function BarChartView({
  entities,
  config,
  height = 600,
  filters,
  onDataPointClick,
  className = "",
}: BarChartViewProps) {
  const chartOption = useMemo((): EChartsOption => {
    // Extract categories and values from entity data
    const categories = new Set<string>();
    entities.forEach((entity) => {
      entity.data.forEach((item: any) => {
        if (item.category || item.type || item.metric) {
          categories.add(item.category || item.type || item.metric);
        }
      });
    });

    const categoryList = Array.from(categories);

    // Prepare series data based on view mode
    if (config.viewMode === "comparison" || config.viewMode === "overlay") {
      // Multiple series - one per entity
      const series = entities.map((entity) => ({
        name: entity.entityName,
        type: "bar" as const,
        data: categoryList.map((category) => {
          const item = entity.data.find(
            (d: any) => (d.category || d.type || d.metric) === category
          );
          return item ? item.count || item.value || 0 : 0;
        }),
        itemStyle: {
          color: entity.metadata?.color || "#3b82f6",
        },
        emphasis: {
          focus: "series" as const,
        },
      }));

      return {
        title: {
          text: `${config.dataSource} Comparison`,
          left: "center",
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow",
          },
        },
        legend: {
          data: entities.map((e) => e.entityName),
          bottom: 0,
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "10%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: categoryList,
          axisLabel: {
            rotate: categoryList.length > 5 ? 45 : 0,
          },
        },
        yAxis: {
          type: "value",
        },
        series,
      };
    } else {
      // Side-by-side view - separate charts would be better, but show merged for now
      const allData = entities.flatMap((entity) =>
        entity.data.map((item: any) => ({
          name: `${entity.entityName}: ${item.category || item.type || item.metric}`,
          value: item.count || item.value || 0,
          entityUid: entity.entityUid,
          itemStyle: {
            color: entity.metadata?.color || "#3b82f6",
          },
        }))
      );

      return {
        title: {
          text: `${config.dataSource} Distribution`,
          left: "center",
        },
        tooltip: {
          trigger: "item",
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "10%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: allData.map((d) => d.name),
          axisLabel: {
            rotate: 45,
          },
        },
        yAxis: {
          type: "value",
        },
        series: [
          {
            type: "bar",
            data: allData,
            emphasis: {
              focus: "self" as const,
            },
          },
        ],
      };
    }
  }, [entities, config]);

  const handleChartClick = (params: any) => {
    if (onDataPointClick) {
      // Find the entity for this data point
      const entityUid =
        params.data?.entityUid || entities[params.seriesIndex]?.entityUid;
      onDataPointClick(params, entityUid);
    }
  };

  return (
    <div className={className}>
      <ReactECharts
        option={chartOption}
        style={{ height: `${height}px`, width: "100%" }}
        onEvents={{
          click: handleChartClick,
        }}
      />
    </div>
  );
}
