/**
 * Graph Visualizer Configuration Types
 */

// Re-export types locally to avoid external dependencies
export type LayoutType = "breadthfirst" | "force" | "atlas";

export interface GraphStyleConfig {
  showLabels?: boolean;
  showEdgeLabels?: boolean;
  styles: Array<{
    selector: string;
    style: Record<string, any>;
  }>;
}

export interface GraphLayoutConfig {
  type: LayoutType;
  config: Record<string, any>;
}

export interface GraphPerformanceConfig {
  maxElements: number;
  batchSize: number;
  viewportCullingEnabled: boolean;
  elementPoolingEnabled: boolean;
  animationsEnabled: boolean;
  enableProgressiveLoading?: boolean;
  enableViewportCulling?: boolean;
}

export interface GraphVisualizationConfig {
  styles?: Partial<GraphStyleConfig>;
  layout?: Partial<GraphLayoutConfig>;
  performance?: Partial<GraphPerformanceConfig>;
}
