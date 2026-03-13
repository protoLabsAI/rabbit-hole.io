/**
 * Default Cytoscape Performance Configuration
 *
 * Extracted from packages/utils/src/atlas/cytoscape-performance.ts
 * Provides performance optimization settings based on dataset size.
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
  cy: any, // Cytoscape instance
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
  element: any, // Cytoscape element
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
  }

  // For edges, always show for now - edge viewport culling is complex
  return true;
}

/**
 * Throttled viewport culling handler for pan/zoom events
 */
export function createViewportCullingHandler(
  cy: any,
  config: PerformanceConfig,
  onUpdate?: (visibleCount: number, totalCount: number) => void
): () => void {
  let timeoutId: any = null;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      optimizeElementVisibility(cy, config, onUpdate);
    }, 16); // ~60fps throttling
  };
}

/**
 * Optimize element visibility based on viewport
 */
export function optimizeElementVisibility(
  cy: any,
  config: PerformanceConfig,
  onUpdate?: (visibleCount: number, totalCount: number) => void
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

  onUpdate?.(visibleElements.length, cy.elements().length);
}

/**
 * Progressive element loading for large datasets
 */
export function loadElementsProgressively(
  cy: any,
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
      onProgress?.(Math.min(currentIndex, elements.length), elements.length);

      // Use setTimeout for universal compatibility
      setTimeout(loadBatch, 16);
    };

    loadBatch();
  });
}

/**
 * Default performance configurations
 */
export const defaultPerformance = {
  small: getPerformanceConfig(100),
  medium: getPerformanceConfig(1500),
  large: getPerformanceConfig(5000),
};

/**
 * Create custom performance configuration with overrides
 */
export function createPerformanceConfig(
  elementCount: number,
  overrides: Partial<PerformanceConfig> = {}
): PerformanceConfig {
  const baseConfig = getPerformanceConfig(elementCount);
  return { ...baseConfig, ...overrides };
}
