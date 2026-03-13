/**
 * Chart Configuration Types
 *
 * Type definitions for flexible chart configuration system.
 * Supports multiple chart types, data sources, and visualization modes.
 */

// ==================== Core Chart Types ====================

export type ChartType =
  | "timeline"
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "network"
  | "heatmap";

export type DataSourceType =
  | "timeline"
  | "speechActs"
  | "relationships"
  | "biographical"
  | "activity"
  | "metrics";

export type AggregationType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type ViewModeType =
  | "comparison"
  | "merged"
  | "side-by-side"
  | "tracks"
  | "overlay";

// ==================== Chart Configuration Interface ====================

export interface ChartConfiguration {
  type: ChartType;
  dataSource: DataSourceType;
  aggregation: AggregationType;
  viewMode: ViewModeType;
}

// ==================== Data Source Interfaces ====================

export interface DataSourceDefinition {
  id: DataSourceType;
  name: string;
  description: string;
  supportedChartTypes: ChartType[];
  supportedAggregations: AggregationType[];
  defaultMetrics: string[];
  apiEndpoint?: string;
}

export interface ChartTypeDefinition {
  id: ChartType;
  name: string;
  description: string;
  supportedDataSources: DataSourceType[];
  supportedViewModes: ViewModeType[];
  icon: string; // lucide-react icon name
  component: string; // Component name to render
}

// ==================== Data Transformation Types ====================

export interface ChartData {
  entityUid: string;
  entityName: string;
  entityType: string;
  data: any[]; // Flexible data structure
  metadata?: {
    total?: number;
    color?: string;
    [key: string]: any;
  };
}

export interface MultiEntityChartData {
  entities: ChartData[];
  aggregated?: any; // For merged/comparison views
  timeRange?: {
    from: string;
    to: string;
  };
  summary?: {
    totalDataPoints: number;
    entitiesWithData: number;
    dataSourceType: DataSourceType;
  };
}

// ==================== Chart Configuration Presets ====================

export interface ChartPreset {
  id: string;
  name: string;
  description: string;
  configuration: ChartConfiguration;
  filters?: any;
  suggestedEntities?: string[];
}

// ==================== Data Fetcher Interface ====================

export interface DataFetcher {
  (
    entities: string[],
    config: ChartConfiguration,
    timeWindow: any,
    filters: any
  ): Promise<MultiEntityChartData>;
}

export interface DataTransformer {
  (rawData: any, config: ChartConfiguration): ChartData[];
}

// ==================== Validation Types ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ChartConfigValidator {
  (config: ChartConfiguration): ValidationResult;
}

// ==================== Chart Component Props ====================

export interface BaseChartProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

export interface MultiEntityChartProps extends BaseChartProps {
  timeWindow?: { from: string; to: string };
  filters?: any;
}
