/**
 * Cytoscape Performance Optimization Utilities
 *
 * Advanced performance optimizations for large graph datasets
 */

export interface PerformanceConfig {
  maxElements: number;
  batchSize: number;
  viewportCullingEnabled: boolean;
  elementPoolingEnabled: boolean;
  animationsEnabled: boolean;
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementPool {
  nodes: Set<string>;
  edges: Set<string>;
  inactive: Set<string>;
}

// Generic Cytoscape-like interfaces for type safety
export interface CytoscapeElement {
  id(): string;
  data(key?: string): any;
  position(): { x: number; y: number };
  isNode(): boolean;
  source?(): CytoscapeElement;
  target?(): CytoscapeElement;
  style(property: string, value?: any): any;
  remove(): void;
}

export interface CytoscapeCore {
  elements(): any;
  nodes(): any;
  edges(): any;
  batch(fn: () => void): void;
  zoom(): number;
  pan(): { x: number; y: number };
  width(): number;
  height(): number;
  extent(): any;
  on(events: string, handler: () => void): void;
  getElementById(id: string): any;
  add(elements: any): any;
}

/**
 * Get optimized performance configuration based on dataset size
 */
export function getPerformanceConfig(elementCount: number): PerformanceConfig {
  if (elementCount < 1000) {
    return {
      maxElements: 1000,
      batchSize: 100,
      viewportCullingEnabled: false,
      elementPoolingEnabled: false,
      animationsEnabled: true,
    };
  } else if (elementCount < 5000) {
    return {
      maxElements: 2000,
      batchSize: 200,
      viewportCullingEnabled: true,
      elementPoolingEnabled: true,
      animationsEnabled: false,
    };
  } else {
    return {
      maxElements: 3000,
      batchSize: 500,
      viewportCullingEnabled: true,
      elementPoolingEnabled: true,
      animationsEnabled: false,
    };
  }
}

/**
 * Calculate viewport bounds with padding for culling
 */
export function calculateViewportBounds(
  cy: CytoscapeCore,
  padding = 100
): ViewportBounds {
  const extent = cy.extent();
  const zoom = cy.zoom();
  const pan = cy.pan();

  return {
    x: -pan.x / zoom - padding,
    y: -pan.y / zoom - padding,
    width: cy.width() / zoom + padding * 2,
    height: cy.height() / zoom + padding * 2,
  };
}

/**
 * Check if element is within viewport bounds
 */
export function isElementInViewport(
  element: CytoscapeElement,
  viewport: ViewportBounds
): boolean {
  if (element.isNode()) {
    const pos = element.position();
    return (
      pos.x >= viewport.x &&
      pos.x <= viewport.x + viewport.width &&
      pos.y >= viewport.y &&
      pos.y <= viewport.y + viewport.height
    );
  } else {
    // For edges, check if either endpoint is in viewport (simplified)
    return true; // Always show edges for now - edge viewport culling is complex
  }
}

/**
 * Batch element operations for performance
 */
export function batchElementUpdate(
  cy: CytoscapeCore,
  operations: Array<() => void>
): void {
  cy.batch(() => {
    operations.forEach((op) => op());
  });
}

/**
 * Optimize element visibility based on viewport
 */
export function optimizeElementVisibility(
  cy: CytoscapeCore,
  config: PerformanceConfig
): void {
  if (!config.viewportCullingEnabled) return;

  const viewport = calculateViewportBounds(cy);
  const visibleElements: any[] = [];
  const hiddenElements: any[] = [];

  cy.elements().forEach((element: any) => {
    if (isElementInViewport(element, viewport)) {
      visibleElements.push(element);
    } else {
      hiddenElements.push(element);
    }
  });

  // Batch visibility updates
  cy.batch(() => {
    visibleElements.forEach((el: any) => {
      el.style("display", "element");
    });

    // Only hide if we have too many elements
    if (cy.elements().length > config.maxElements) {
      hiddenElements.forEach((el: any) => {
        el.style("display", "none");
      });
    }
  });
}

/**
 * Throttled viewport culling for pan/zoom events
 */
export function createViewportCullingHandler(
  cy: CytoscapeCore,
  config: PerformanceConfig
): () => void {
  let timeoutId: any = null;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      optimizeElementVisibility(cy, config);
    }, 16); // ~60fps throttling
  };
}

/**
 * Progressive element loading for large datasets
 */
export function loadElementsProgressively(
  cy: CytoscapeCore,
  elements: any[],
  config: PerformanceConfig,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    const { batchSize } = config;
    let currentIndex = 0;

    const loadBatch = () => {
      const batch = elements.slice(currentIndex, currentIndex + batchSize);

      if (batch.length === 0) {
        resolve();
        return;
      }

      cy.batch(() => {
        cy.add(batch);
      });

      currentIndex += batchSize;
      onProgress?.(currentIndex, elements.length);

      // Use setTimeout for universal compatibility
      setTimeout(loadBatch, 16);
    };

    loadBatch();
  });
}

/**
 * Memory-efficient element management
 */
export class CytoscapeElementManager {
  private cy: CytoscapeCore;
  private pool: ElementPool;
  private config: PerformanceConfig;

  constructor(cy: CytoscapeCore, config: PerformanceConfig) {
    this.cy = cy;
    this.config = config;
    this.pool = {
      nodes: new Set(),
      edges: new Set(),
      inactive: new Set(),
    };
  }

  /**
   * Add elements with memory management
   */
  addElements(elements: any[]): void {
    // Remove oldest elements if at capacity
    if (this.cy.elements().length + elements.length > this.config.maxElements) {
      this.cullOldestElements(elements.length);
    }

    // Add new elements
    this.cy.batch(() => {
      const added = this.cy.add(elements);
      added.nodes().forEach((node: any) => this.pool.nodes.add(node.id()));
      added.edges().forEach((edge: any) => this.pool.edges.add(edge.id()));
    });
  }

  /**
   * Remove least recently used elements
   */
  private cullOldestElements(spaceNeeded: number): void {
    const allElements = this.cy.elements();
    const sortedByAge = allElements.sort((a: any, b: any) => {
      // Use element creation time or position as age proxy
      const aTime = a.data("createdAt") || 0;
      const bTime = b.data("createdAt") || 0;
      return aTime - bTime;
    });

    const toRemove = sortedByAge.slice(0, spaceNeeded);

    this.cy.batch(() => {
      toRemove.remove();
    });

    // Update pool
    toRemove.forEach((el: any) => {
      this.pool.nodes.delete(el.id());
      this.pool.edges.delete(el.id());
      this.pool.inactive.add(el.id());
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    activeNodes: number;
    activeEdges: number;
    inactiveElements: number;
    memoryUsage: number;
  } {
    return {
      activeNodes: this.pool.nodes.size,
      activeEdges: this.pool.edges.size,
      inactiveElements: this.pool.inactive.size,
      memoryUsage: this.cy.elements().length,
    };
  }
}

/**
 * Performance monitoring for Cytoscape operations
 */
export class CytoscapePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Measure operation performance
   */
  measure<T>(operationName: string, operation: () => T): T {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }

    const measurements = this.metrics.get(operationName)!;
    measurements.push(duration);

    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    return result;
  }

  /**
   * Get performance statistics
   */
  getStats(): Record<
    string,
    {
      count: number;
      average: number;
      min: number;
      max: number;
      total: number;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [operation, measurements] of this.metrics.entries()) {
      if (measurements.length === 0) continue;

      stats[operation] = {
        count: measurements.length,
        average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements),
        total: measurements.reduce((a, b) => a + b, 0),
      };
    }

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}
