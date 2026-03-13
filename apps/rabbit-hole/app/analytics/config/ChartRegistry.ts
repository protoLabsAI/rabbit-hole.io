/**
 * Chart Registry
 *
 * Central registry defining available chart types, data sources, and their capabilities.
 * Provides validation and compatibility checking for chart configurations.
 */

import type {
  ChartTypeDefinition,
  DataSourceDefinition,
  ChartConfiguration,
  ChartPreset,
  ValidationResult,
} from "../types/ChartConfiguration";

// ==================== Chart Type Definitions ====================

export const CHART_TYPES: Record<string, ChartTypeDefinition> = {
  timeline: {
    id: "timeline",
    name: "Timeline",
    description: "Chronological event visualization with duration support",
    supportedDataSources: ["timeline", "biographical", "activity"],
    supportedViewModes: ["comparison", "merged", "side-by-side", "tracks"],
    icon: "Clock",
    component: "TimelineChartView",
  },
  bar: {
    id: "bar",
    name: "Bar Chart",
    description: "Categorical data comparison with bars",
    supportedDataSources: [
      "speechActs",
      "relationships",
      "metrics",
      "activity",
    ],
    supportedViewModes: ["comparison", "side-by-side", "overlay"],
    icon: "BarChart3",
    component: "BarChartView",
  },
  line: {
    id: "line",
    name: "Line Chart",
    description: "Trend analysis over time with connected points",
    supportedDataSources: ["metrics", "activity", "speechActs"],
    supportedViewModes: ["comparison", "overlay"],
    icon: "TrendingUp",
    component: "LineChartView",
  },
  pie: {
    id: "pie",
    name: "Pie Chart",
    description: "Distribution and proportion visualization",
    supportedDataSources: ["speechActs", "relationships", "metrics"],
    supportedViewModes: ["side-by-side", "comparison"],
    icon: "PieChart",
    component: "PieChartView",
  },
  scatter: {
    id: "scatter",
    name: "Scatter Plot",
    description: "Correlation analysis with two-dimensional plotting",
    supportedDataSources: ["metrics", "relationships", "activity"],
    supportedViewModes: ["comparison", "overlay"],
    icon: "Scatter",
    component: "ScatterChartView",
  },
  network: {
    id: "network",
    name: "Network Graph",
    description: "Relationship and connection visualization",
    supportedDataSources: ["relationships"],
    supportedViewModes: ["merged", "comparison"],
    icon: "Network",
    component: "NetworkChartView",
  },
  heatmap: {
    id: "heatmap",
    name: "Heatmap",
    description: "Intensity visualization with color-coded cells",
    supportedDataSources: ["activity", "metrics", "speechActs"],
    supportedViewModes: ["comparison", "merged"],
    icon: "Grid",
    component: "HeatmapChartView",
  },
};

// ==================== Data Source Definitions ====================

export const DATA_SOURCES: Record<string, DataSourceDefinition> = {
  timeline: {
    id: "timeline",
    name: "Timeline Events",
    description: "Chronological events and milestones",
    supportedChartTypes: ["timeline", "line", "bar"],
    supportedAggregations: ["none", "daily", "weekly", "monthly", "yearly"],
    defaultMetrics: ["events", "importance", "categories"],
    apiEndpoint: "/api/entity-timeline",
  },
  speechActs: {
    id: "speechActs",
    name: "Speech Acts",
    description: "Speech analysis data including sentiment and categories",
    supportedChartTypes: ["bar", "pie", "line", "heatmap"],
    supportedAggregations: ["none", "daily", "weekly", "monthly"],
    defaultMetrics: ["hostile", "supportive", "neutral", "categories"],
    apiEndpoint: "/api/research/speech-acts",
  },
  relationships: {
    id: "relationships",
    name: "Relationships",
    description: "Entity connections and relationship data",
    supportedChartTypes: ["network", "bar", "pie", "scatter"],
    supportedAggregations: ["none"],
    defaultMetrics: ["connections", "strength", "types"],
    apiEndpoint: "/api/entity-relationships",
  },
  biographical: {
    id: "biographical",
    name: "Biographical",
    description: "Life events and biographical milestones",
    supportedChartTypes: ["timeline", "bar"],
    supportedAggregations: ["none", "yearly"],
    defaultMetrics: ["events", "categories", "periods"],
    apiEndpoint: "/api/research/biographical",
  },
  activity: {
    id: "activity",
    name: "Activity Patterns",
    description: "Temporal activity and engagement patterns",
    supportedChartTypes: ["heatmap", "line", "bar", "timeline"],
    supportedAggregations: ["daily", "weekly", "monthly"],
    defaultMetrics: ["frequency", "intensity", "duration"],
    apiEndpoint: "/api/research/activity",
  },
  metrics: {
    id: "metrics",
    name: "Entity Metrics",
    description: "Quantitative entity performance metrics",
    supportedChartTypes: ["bar", "line", "scatter", "pie"],
    supportedAggregations: ["none", "daily", "weekly", "monthly"],
    defaultMetrics: ["speechActCount", "degree", "activityInWindow"],
    apiEndpoint: "/api/entity-metrics",
  },
};

// ==================== Chart Configuration Presets ====================

export const CHART_PRESETS: ChartPreset[] = [
  {
    id: "timeline-comparison",
    name: "Timeline Comparison",
    description: "Compare timeline events across multiple entities",
    configuration: {
      type: "timeline",
      dataSource: "timeline",
      aggregation: "none",
      viewMode: "comparison",
    },
  },
  {
    id: "speech-sentiment-analysis",
    name: "Speech Sentiment Analysis",
    description: "Analyze speech sentiment distribution",
    configuration: {
      type: "bar",
      dataSource: "speechActs",
      aggregation: "none",
      viewMode: "side-by-side",
    },
    filters: {
      sentiments: ["hostile", "supportive", "neutral"],
    },
  },
  {
    id: "relationship-network",
    name: "Relationship Network",
    description: "Visualize entity connections and relationships",
    configuration: {
      type: "network",
      dataSource: "relationships",
      aggregation: "none",
      viewMode: "merged",
    },
  },
  {
    id: "activity-heatmap",
    name: "Activity Heatmap",
    description: "Show activity patterns over time",
    configuration: {
      type: "heatmap",
      dataSource: "activity",
      aggregation: "weekly",
      viewMode: "comparison",
    },
  },
  {
    id: "metrics-comparison",
    name: "Entity Metrics",
    description: "Compare quantitative metrics across entities",
    configuration: {
      type: "bar",
      dataSource: "metrics",
      aggregation: "none",
      viewMode: "comparison",
    },
  },
];

// ==================== Validation Functions ====================

export function validateChartConfiguration(
  config: ChartConfiguration
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if chart type exists
  const chartType = CHART_TYPES[config.type];
  if (!chartType) {
    errors.push(`Unknown chart type: ${config.type}`);
    return { isValid: false, errors };
  }

  // Check if data source exists
  const dataSource = DATA_SOURCES[config.dataSource];
  if (!dataSource) {
    errors.push(`Unknown data source: ${config.dataSource}`);
    return { isValid: false, errors };
  }

  // Check data source compatibility with chart type
  if (!chartType.supportedDataSources.includes(config.dataSource)) {
    errors.push(
      `Chart type '${config.type}' does not support data source '${config.dataSource}'. ` +
        `Supported: ${chartType.supportedDataSources.join(", ")}`
    );
  }

  // Check chart type compatibility with data source
  if (!dataSource.supportedChartTypes.includes(config.type)) {
    errors.push(
      `Data source '${config.dataSource}' does not support chart type '${config.type}'. ` +
        `Supported: ${dataSource.supportedChartTypes.join(", ")}`
    );
  }

  // Check view mode compatibility
  if (!chartType.supportedViewModes.includes(config.viewMode)) {
    errors.push(
      `Chart type '${config.type}' does not support view mode '${config.viewMode}'. ` +
        `Supported: ${chartType.supportedViewModes.join(", ")}`
    );
  }

  // Check aggregation compatibility
  if (!dataSource.supportedAggregations.includes(config.aggregation)) {
    warnings.push(
      `Data source '${config.dataSource}' may not fully support aggregation '${config.aggregation}'. ` +
        `Recommended: ${dataSource.supportedAggregations.join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getCompatibleChartTypes(
  dataSource: string
): ChartTypeDefinition[] {
  const source = DATA_SOURCES[dataSource];
  if (!source) return [];

  return source.supportedChartTypes
    .map((typeId) => CHART_TYPES[typeId])
    .filter(Boolean);
}

export function getCompatibleDataSources(
  chartType: string
): DataSourceDefinition[] {
  const chart = CHART_TYPES[chartType];
  if (!chart) return [];

  return chart.supportedDataSources
    .map((sourceId) => DATA_SOURCES[sourceId])
    .filter(Boolean);
}

export function getPresetsByDataSource(dataSource: string): ChartPreset[] {
  return CHART_PRESETS.filter(
    (preset) => preset.configuration.dataSource === dataSource
  );
}

export function getPresetsByChartType(chartType: string): ChartPreset[] {
  return CHART_PRESETS.filter(
    (preset) => preset.configuration.type === chartType
  );
}
