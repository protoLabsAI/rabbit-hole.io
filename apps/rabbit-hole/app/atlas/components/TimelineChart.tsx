/**
 * Timeline Chart Component
 *
 * ECharts-based timeline visualization with brush selection for time navigation
 */

"use client";

import ReactECharts from "echarts-for-react";
import React, { useMemo } from "react";

import { TimeWindow } from "@proto/utils/atlas";

interface TimelineData {
  timestamp: string;
  count: number;
  hostileCount: number;
  supportiveCount: number;
  neutralCount: number;
}

interface TimelineChartProps {
  data: TimelineData[];
  granularity: "hour" | "day" | "week" | "month";
  timeWindow: TimeWindow;
  onTimeRangeSelect?: (range: { from: string; to: string }) => void;
  height?: number;
  className?: string;
}

export function TimelineChart({
  data,
  granularity,
  timeWindow,
  onTimeRangeSelect,
  height = 300,
  className = "",
}: TimelineChartProps) {
  const chartOption = useMemo(() => {
    const timestamps = data.map((d) => new Date(d.timestamp).getTime());
    const totalCounts = data.map((d) => d.count);
    const hostileCounts = data.map((d) => d.hostileCount);
    const supportiveCounts = data.map((d) => d.supportiveCount);

    return {
      title: {
        text: `Activity Timeline (${granularity}ly)`,
        left: "left",
        textStyle: { fontSize: 14, fontWeight: "normal" },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: Array<{ dataIndex: number }>) => {
          const dataIndex = params[0].dataIndex;
          const item = data[dataIndex];
          if (!item) return "";

          const date = new Date(item.timestamp).toLocaleDateString();
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${date}</div>
              <div>Total Events: <span style="color: #1890ff; font-weight: bold;">${item.count}</span></div>
              ${item.hostileCount > 0 ? `<div>Hostile: <span style="color: #ff4d4f; font-weight: bold;">${item.hostileCount}</span></div>` : ""}
              ${item.supportiveCount > 0 ? `<div>Supportive: <span style="color: #52c41a; font-weight: bold;">${item.supportiveCount}</span></div>` : ""}
              ${item.neutralCount > 0 ? `<div>Neutral: <span style="color: #8c8c8c; font-weight: bold;">${item.neutralCount}</span></div>` : ""}
            </div>
          `;
        },
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#d9d9d9",
        borderWidth: 1,
        textStyle: { color: "#262626" },
      },
      legend: {
        data: ["Total Events", "Hostile", "Supportive"],
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      grid: {
        top: 50,
        bottom: 80,
        left: 50,
        right: 80,
        containLabel: false,
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            switch (granularity) {
              case "hour":
                return date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              case "day":
                return date.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                });
              case "week":
                return date.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                });
              case "month":
                return date.toLocaleDateString([], {
                  month: "short",
                  year: "2-digit",
                });
              default:
                return date.toLocaleDateString();
            }
          },
          rotate: granularity === "hour" ? 45 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "Events",
        nameTextStyle: { fontSize: 12 },
        axisLabel: { fontSize: 12 },
      },
      brush: {
        toolbox: ["rect", "polygon", "lineX", "lineY", "keep", "clear"],
        xAxisIndex: 0,
        brushLink: "all",
        outOfBrush: { colorAlpha: 0.1 },
        brushType: "lineX",
        brushMode: "single",
        transformable: true,
        brushStyle: {
          color: "rgba(24, 144, 255, 0.15)",
          borderColor: "rgba(24, 144, 255, 0.5)",
          borderWidth: 1,
        },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          start: 0,
          end: 100,
          height: 20,
          bottom: 35,
          handleStyle: { color: "#1890ff" },
          textStyle: { fontSize: 12 },
        },
      ],
      series: [
        {
          name: "Total Events",
          type: "line",
          data: timestamps.map((time, index) => [time, totalCounts[index]]),
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { color: "#1890ff", width: 2 },
          itemStyle: { color: "#1890ff" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(24, 144, 255, 0.3)" },
                { offset: 1, color: "rgba(24, 144, 255, 0.05)" },
              ],
            },
          },
        },
        {
          name: "Hostile",
          type: "bar",
          data: timestamps.map((time, index) => [time, hostileCounts[index]]),
          itemStyle: { color: "#ff4d4f" },
          barWidth: "60%",
        },
        {
          name: "Supportive",
          type: "bar",
          data: timestamps.map((time, index) => [
            time,
            supportiveCounts[index],
          ]),
          itemStyle: { color: "#52c41a" },
          barWidth: "60%",
        },
      ],
      backgroundColor: "#fafafa",
    };
  }, [data, granularity]);

  const onChartEvents = useMemo(
    () => ({
      brush: (params: { areas?: Array<{ coordRange?: [number, number] }> }) => {
        if (params.areas && params.areas.length > 0 && onTimeRangeSelect) {
          const area = params.areas[0];
          const coordRange = area.coordRange;

          if (coordRange && coordRange.length === 2) {
            const fromTime = new Date(coordRange[0]);
            const toTime = new Date(coordRange[1]);

            onTimeRangeSelect({
              from: fromTime.toISOString().split("T")[0],
              to: toTime.toISOString().split("T")[0],
            });
          }
        }
      },
    }),
    [onTimeRangeSelect]
  );

  if (data.length === 0) {
    return (
      <div
        className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}
      >
        <div className="text-gray-500">
          <div className="text-lg font-medium mb-2">No Timeline Data</div>
          <div className="text-sm">
            No events found in the selected time window
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactECharts
        option={chartOption}
        onEvents={onChartEvents}
        style={{ height: `${height}px`, width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
      <div className="mt-2 text-xs text-gray-600 text-center">
        💡 Drag to select time range • Scroll to zoom • Use slider to navigate
      </div>
    </div>
  );
}
