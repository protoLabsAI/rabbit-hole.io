/**
 * Chart Selector Component
 *
 * UI for selecting chart types and data sources with validation.
 * Shows compatible options based on current configuration.
 */

"use client";

import React from "react";

import { Icon } from "@proto/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import {
  CHART_TYPES,
  DATA_SOURCES,
  CHART_PRESETS,
  validateChartConfiguration,
} from "../config/ChartRegistry";
import type { ChartConfiguration } from "../types/ChartConfiguration";

// ==================== Component Props ====================

interface ChartSelectorProps {
  chartConfig: ChartConfiguration;
  onConfigChange: (config: ChartConfiguration) => void;
}

// ==================== Icon Map ====================

const CHART_ICONS: Record<string, string> = {
  Clock: "clock",
  BarChart3: "bar-chart",
  TrendingUp: "line-chart",
  PieChart: "pie-chart",
  Network: "network",
  Grid: "grid",
};

// ==================== Component ====================

export function ChartSelector({
  chartConfig,
  onConfigChange,
}: ChartSelectorProps) {
  const handleChartTypeChange = (newType: string) => {
    const newConfig = { ...chartConfig, type: newType as any };

    // Validate and adjust if needed
    const validation = validateChartConfiguration(newConfig);
    if (!validation.isValid) {
      // If invalid, try to find a compatible data source
      const chartType = CHART_TYPES[newType];
      if (chartType && chartType.supportedDataSources.length > 0) {
        newConfig.dataSource = chartType.supportedDataSources[0] as any;
      }

      // Adjust view mode if needed
      if (!chartType?.supportedViewModes.includes(newConfig.viewMode)) {
        newConfig.viewMode =
          (chartType?.supportedViewModes[0] as any) || "comparison";
      }
    }

    onConfigChange(newConfig);
  };

  const handleDataSourceChange = (newDataSource: string) => {
    const newConfig = { ...chartConfig, dataSource: newDataSource as any };

    // Validate and adjust if needed
    const validation = validateChartConfiguration(newConfig);
    if (!validation.isValid) {
      // If invalid, try to find a compatible chart type
      const dataSource = DATA_SOURCES[newDataSource];
      if (dataSource && dataSource.supportedChartTypes.length > 0) {
        newConfig.type = dataSource.supportedChartTypes[0] as any;
      }
    }

    onConfigChange(newConfig);
  };

  const handleViewModeChange = (newViewMode: string) => {
    onConfigChange({
      ...chartConfig,
      viewMode: newViewMode as any,
    });
  };

  const handleAggregationChange = (newAggregation: string) => {
    onConfigChange({
      ...chartConfig,
      aggregation: newAggregation as any,
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = CHART_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onConfigChange(preset.configuration);
    }
  };

  // Get current selections
  const currentChartType = CHART_TYPES[chartConfig.type];
  const currentDataSource = DATA_SOURCES[chartConfig.dataSource];
  const iconName =
    CHART_ICONS[currentChartType?.icon as keyof typeof CHART_ICONS] ||
    "bar-chart";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name={iconName as any} size={20} />
          <CardTitle className="text-lg">Chart Configuration</CardTitle>
        </div>
        <CardDescription>
          Select chart type and data source for analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div>
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {CHART_PRESETS.slice(0, 3).map((preset) => (
              <Button
                key={preset.id}
                variant="ghost"
                size="sm"
                onClick={() => applyPreset(preset.id)}
                className="justify-start h-auto p-2"
              >
                <div className="text-left">
                  <div className="font-medium text-xs">{preset.name}</div>
                  <div className="text-xs text-gray-500">
                    {preset.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Chart Type Selection */}
        <div>
          <Label htmlFor="chart-type">Chart Type</Label>
          <Select
            value={chartConfig.type}
            onValueChange={handleChartTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CHART_TYPES).map((chartType) => (
                <SelectItem key={chartType.id} value={chartType.id}>
                  {chartType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {currentChartType?.description}
          </p>
        </div>

        {/* Data Source Selection */}
        <div>
          <Label htmlFor="data-source">Data Source</Label>
          <Select
            value={chartConfig.dataSource}
            onValueChange={handleDataSourceChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DATA_SOURCES)
                .filter((source) =>
                  currentChartType?.supportedDataSources.includes(source.id)
                )
                .map((dataSource) => (
                  <SelectItem key={dataSource.id} value={dataSource.id}>
                    {dataSource.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {currentDataSource?.description}
          </p>
        </div>

        {/* View Mode Selection */}
        <div>
          <Label htmlFor="view-mode">View Mode</Label>
          <Select
            value={chartConfig.viewMode}
            onValueChange={handleViewModeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentChartType?.supportedViewModes.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode.charAt(0).toUpperCase() +
                    mode.slice(1).replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aggregation Selection */}
        <div>
          <Label htmlFor="aggregation">Time Aggregation</Label>
          <Select
            value={chartConfig.aggregation}
            onValueChange={handleAggregationChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentDataSource?.supportedAggregations.map((agg) => (
                <SelectItem key={agg} value={agg}>
                  {agg.charAt(0).toUpperCase() + agg.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
