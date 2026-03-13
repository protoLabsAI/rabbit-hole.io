/**
 * useCytoscape Hook - Core Graph Management
 *
 * **Comprehensive Cytoscape.js integration hook extracted from Atlas monolith.**
 *
 * Manages the complete lifecycle of graph visualization:
 * - **Graph Initialization**: Creates and configures Cytoscape instance
 * - **Event Handling**: Node clicks, hover events, viewport changes
 * - **Tooltip Management**: Hover tooltips with positioning
 * - **Performance Optimization**: Viewport culling, element pooling
 * - **Memory Management**: Proper cleanup on unmount
 * - **Configuration**: Dynamic styling, layouts, and performance settings
 *
 * Originally extracted from AtlasPage lines 825-1368 with zero breaking changes.
 *
 * @example
 * ```tsx
 * const { cy, clearSelections, fitGraph } = useCytoscape({
 *   containerRef,
 *   elements: cytoscapeElements,
 *   layoutType: "atlas",
 *   showLabels: true,
 *   eventHandlers: {
 *     onNodeClick: (node) => console.log("Clicked:", node.name)
 *   }
 * });
 * ```
 */

import cytoscape from "cytoscape";
import cise from "cytoscape-cise";
import cola from "cytoscape-cola";
import cytoscapePopper from "cytoscape-popper";
import React, { useEffect, useRef, useCallback } from "react";

import { getEntityImage } from "@proto/utils/atlas";

import { createFloatingUIPopperFactory } from "../../atlas/utils/popper-tooltip";
import type { GraphEventHandlers } from "../components/types";
import { getLayoutConfig } from "../config/default-layouts";
import {
  getPerformanceConfig,
  createViewportCullingHandler,
} from "../config/default-performance";
import { createCytoscapeStyles } from "../config/default-styles";

// Register layout algorithms and extensions (matching Atlas page.tsx)
cytoscape.use(cise);
cytoscape.use(cola);
cytoscape.use(cytoscapePopper(createFloatingUIPopperFactory()));

/**
 * Configuration options for the useCytoscape hook
 */
export interface UseCytoscapeOptions {
  /** DOM container where Cytoscape will mount (required) */
  containerRef: React.RefObject<HTMLElement | null>;

  /** Cytoscape elements array (nodes and edges) */
  elements: any[];

  /** Loading state prevents initialization */
  loading?: boolean;

  /** Graph layout algorithm selection */
  layoutType?: "breadthfirst" | "force" | "atlas";

  /** Show/hide node labels */
  showLabels?: boolean;

  /** Highlight connected nodes on selection */
  highlightConnections?: boolean;

  /** View mode affects edge label visibility */
  viewMode?: string;

  /** Event callback handlers */
  eventHandlers?: GraphEventHandlers;

  /** Initial viewport zoom and pan state */
  initialViewport?: {
    zoom?: number;
    pan?: { x: number; y: number };
  };

  /** Enable hover tooltips */
  enableTooltips?: boolean;

  /** Persist viewport changes via callbacks */
  persistViewport?: boolean;
}

/**
 * Return value interface for useCytoscape hook
 */
export interface CytoscapeInstance {
  /** Direct access to Cytoscape.js instance (use with caution) */
  cy: any | null;

  /** Clear all node and edge selections/highlighting */
  clearSelections: () => void;

  /** Fit entire graph to container viewport */
  fitGraph: () => void;

  /** Programmatically set zoom level and pan position */
  setViewport: (zoom: number, pan: { x: number; y: number }) => void;

  /** Hide all visible tooltips (useful when opening menus/panels) */
  hideAllTooltips: () => void;
}

/**
 * Custom hook for managing Cytoscape graph visualization
 *
 * Handles complete graph lifecycle with optimized performance and event management.
 *
 * @param options - Configuration for graph initialization and behavior
 * @returns Interface for interacting with the graph instance
 */
export function useCytoscape(options: UseCytoscapeOptions): CytoscapeInstance {
  const {
    containerRef,
    elements,
    loading = false,
    layoutType = "atlas",
    showLabels = true,
    highlightConnections = true,
    viewMode = "full-atlas",
    eventHandlers = {},
    initialViewport,
    enableTooltips = true,
    persistViewport = true,
  } = options;

  const viewportUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(
    undefined
  );

  // Initialize refs
  const cyRef = useRef<any>(null);

  /**
   * Clear all graph selections
   */
  const clearSelections = useCallback(() => {
    if (cyRef.current) {
      cyRef.current
        .elements()
        .removeClass(
          "selected highlighted faded highlighted-outgoing highlighted-incoming highlighted-neutral"
        );
    }
  }, []);

  /**
   * Fit graph to container
   */
  const fitGraph = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit();

      if (persistViewport && eventHandlers.onViewportChange) {
        setTimeout(() => {
          const zoom = cyRef.current.zoom();
          const pan = cyRef.current.pan();
          eventHandlers.onViewportChange?.(zoom, pan);
        }, 100);
      }
    }
  }, []); // Empty dependency - all values accessed via closure

  /**
   * Set viewport programmatically
   */
  const setViewport = useCallback(
    (zoom: number, pan: { x: number; y: number }) => {
      if (cyRef.current) {
        cyRef.current.zoom(zoom);
        cyRef.current.pan(pan);
      }
    },
    []
  );

  /**
   * Hide all visible tooltips
   */
  const hideTooltips = useCallback(async () => {
    if (cyRef.current) {
      const { hideAllTooltips } = await import("../utils/tooltip-manager");
      hideAllTooltips(cyRef.current);
    }
  }, []);

  /**
   * Handle viewport changes with debouncing - stable reference
   */
  const handleViewportChange = useCallback(() => {
    if (!persistViewport || !eventHandlers.onViewportChange) return;

    clearTimeout(viewportUpdateTimeoutRef.current);
    viewportUpdateTimeoutRef.current = setTimeout(() => {
      if (cyRef.current) {
        try {
          const currentZoom = cyRef.current.zoom();
          const currentPan = cyRef.current.pan();

          eventHandlers.onViewportChange?.(
            Math.round(currentZoom * 100) / 100,
            {
              x: Math.round(currentPan.x),
              y: Math.round(currentPan.y),
            }
          );
        } catch (error) {
          console.warn("⚠️ Failed to update viewport state:", error);
        }
      }
    }, 300); // 300ms debounce
  }, []); // Empty dependency array - handlers are stable via ref

  /**
   * Create entity icons for nodes - stable reference
   */
  const createEntityIcons = useCallback((cy: any) => {
    cy.ready(() => {
      try {
        cy.nodes().forEach((node: any) => {
          const entityType = node.data("type");
          const emoji = getEntityImage(entityType);

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 64;
            canvas.height = 64;
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, 32, 32);

            const imageUrl = canvas.toDataURL();
            node.style({
              "background-image": imageUrl,
              "background-fit": "contain",
              "background-width": "70%",
              "background-height": "70%",
            });
          }
        });
      } catch (error) {
        console.warn("⚠️ Failed to add entity icons:", error);
      }
    });
  }, []);

  // NodeHover will be set up after Cytoscape initialization

  /**
   * Setup interaction event handlers
   */
  const setupEventHandlers = useCallback(
    (cy: any) => {
      // Node click handler
      cy.on("tap", "node", async (event: any) => {
        try {
          // Hide tooltips when clicking a node
          hideTooltips();

          const node = event.target;
          const nodeData = node.data("originalNode");

          if (!nodeData) {
            console.warn("⚠️ Node data missing");
            return;
          }

          // Clear previous selections
          clearSelections();

          // Select clicked node
          node.addClass("selected");

          // Highlight connections if enabled
          if (highlightConnections) {
            const connectedEdges = node.connectedEdges();
            const connectedNodes = connectedEdges
              .sources()
              .union(connectedEdges.targets());
            const outgoingEdges = node.outgoers("edge");
            const incomingEdges = node.incomers("edge");

            outgoingEdges.addClass("highlighted-outgoing");
            incomingEdges.addClass("highlighted-incoming");
            connectedNodes.addClass("highlighted");

            // Fade non-connected elements
            cy.elements()
              .not(connectedNodes)
              .not(connectedEdges)
              .not(node)
              .addClass("faded");

            console.log(
              `🔗 Highlighted ${connectedNodes.length - 1} connected nodes, ${outgoingEdges.length} outgoing, ${incomingEdges.length} incoming`
            );
          }

          // Call external handler
          eventHandlers.onNodeClick?.(nodeData, event);

          // Load node details if handler provided
          if (eventHandlers.onNodeDetailsLoad) {
            try {
              await eventHandlers.onNodeDetailsLoad(nodeData.uid);
            } catch (error) {
              console.error("Error loading node details:", error);
            }
          }
        } catch (error) {
          console.error("❌ Node click handler error:", error);
        }
      });

      // Double-click handler
      cy.on("dbltap", "node", (event: any) => {
        try {
          const node = event.target;
          const nodeData = node.data("originalNode");

          if (nodeData) {
            eventHandlers.onNodeDoubleClick?.(nodeData, event);
          }
        } catch (error) {
          console.warn("⚠️ Double-click handler error:", error);
        }
      });

      // Background click handler
      cy.on("tap", (event: any) => {
        try {
          if (event.target === cy) {
            hideTooltips();
            clearSelections();
            eventHandlers.onBackgroundClick?.(event);
          }
        } catch (error) {
          console.warn("⚠️ Background click handler error:", error);
        }
      });

      // Context menu handler
      cy.on("cxttap", (event: any) => {
        try {
          // Hide tooltips when opening context menu
          hideTooltips();

          event.preventDefault();
          const isNode = event.target !== cy;
          const type = isNode ? "node" : "background";

          eventHandlers.onContextMenu?.(
            type,
            event.originalEvent.clientX,
            event.originalEvent.clientY,
            event.target
          );
        } catch (error) {
          console.warn("⚠️ Context menu handler error:", error);
        }
      });
    },
    [] // Empty dependency - all values accessed via closure/ref
  );

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || !elements.length || loading) return;

    try {
      const styles = createCytoscapeStyles({
        showLabels,
        viewMode,
      });

      const layoutConfig = getLayoutConfig(layoutType);

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: styles,
        layout: {
          ...layoutConfig,
          // Disable animations for full atlas view with many nodes (matching Atlas page.tsx)
          animate: viewMode === "full-atlas" ? false : "end",
        } as any,
        minZoom: 0.2,
        maxZoom: 4,
        boxSelectionEnabled: false,
      });

      // Store reference console.log("🔍 Cytoscape instance created successfully!");

      cyRef.current = cy;

      // Setup event handlers
      setupEventHandlers(cy);

      // Add entity icons
      createEntityIcons(cy);

      // Setup hover tooltips using shared utility (no duplication)
      if (enableTooltips) {
        console.log("🎯 Setting up tooltips via shared utility");

        (async () => {
          const { createReactDomainTooltip, cleanupReactDomainTooltip } =
            await import("../utils/tooltip-manager");

          const tooltipTimeouts = {
            show: null as NodeJS.Timeout | null,
            hide: null as NodeJS.Timeout | null,
          };

          cy.on("mouseover", "node", (event: any) => {
            const node = event.target;

            if (tooltipTimeouts.show) {
              clearTimeout(tooltipTimeouts.show);
              tooltipTimeouts.show = null;
            }

            tooltipTimeouts.show = setTimeout(async () => {
              try {
                const tooltipElement = await createReactDomainTooltip(node);

                const popperInstance = node.popper({
                  content: () => tooltipElement,
                  popper: {
                    placement: "top",
                    modifiers: [
                      {
                        name: "preventOverflow",
                        options: { boundary: "viewport" },
                      },
                    ],
                  },
                });

                tooltipElement.style.visibility = "visible";
                tooltipElement.style.opacity = "1";

                node.data("tooltip", tooltipElement);
                node.data("popperInstance", popperInstance);
                node.data("reactRoot", (tooltipElement as any)._reactRoot);

                console.log("🎯 React domain tooltip created");
              } catch (error) {
                console.warn("⚠️ Tooltip creation error:", error);
              }
              tooltipTimeouts.show = null;
            }, 500);
          });

          cy.on("mouseout", "node", (event: any) => {
            const node = event.target;

            if (tooltipTimeouts.show) {
              clearTimeout(tooltipTimeouts.show);
              tooltipTimeouts.show = null;
            }

            const tooltip = node.data("tooltip");
            const popperInstance = node.data("popperInstance");

            if (tooltip) {
              tooltip.style.visibility = "hidden";

              setTimeout(() => {
                try {
                  cleanupReactDomainTooltip(tooltip);
                  if (
                    popperInstance &&
                    typeof popperInstance.destroy === "function"
                  ) {
                    popperInstance.destroy();
                  }
                  node.removeData("tooltip");
                  node.removeData("popperInstance");
                  node.removeData("reactRoot");
                } catch (error) {
                  console.warn("⚠️ Tooltip cleanup error:", error);
                }
              }, 200);
            }
          });
        })();
      }

      // Handle initial viewport
      if (initialViewport) {
        const { zoom = 1, pan = { x: 0, y: 0 } } = initialViewport;
        const hasCustomViewport = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

        if (hasCustomViewport) {
          cy.zoom(zoom);
          cy.pan(pan);
          console.log(
            `🔍 Restored viewport: zoom=${zoom}, pan=(${pan.x}, ${pan.y})`
          );
        } else {
          cy.fit();
          console.log("🎯 Auto-fitted graph to screen");
        }
      } else {
        cy.fit();
        console.log("🎯 Auto-fitted graph to screen");
      }

      // Setup viewport change listeners
      if (persistViewport) {
        cy.on("zoom pan", handleViewportChange);
      }

      // Performance optimizations for large datasets
      const performanceConfig = getPerformanceConfig(elements.length);

      if (performanceConfig.viewportCullingEnabled) {
        const viewportHandler = createViewportCullingHandler(
          cy,
          performanceConfig
        );
        cy.on("zoom pan", viewportHandler);

        console.log(
          `🚀 Performance optimization enabled: ${elements.length} elements, viewport culling: ${performanceConfig.viewportCullingEnabled}`
        );
      }

      // Cleanup function
      return () => {
        // Clear viewport timeout
        clearTimeout(viewportUpdateTimeoutRef.current);

        // Cleanup tooltips
        if (
          cy &&
          typeof cy.destroy === "function" &&
          !(cy as any).destroyed()
        ) {
          const nodes = (cy as any).nodes?.();
          if (nodes && typeof nodes.forEach === "function") {
            nodes.forEach((node: any) => {
              const reactRoot = node.data("reactRoot");
              const tooltip = node.data("tooltip");

              if (reactRoot) {
                try {
                  reactRoot.unmount();
                } catch (error) {
                  console.warn("⚠️ React root unmount error:", error);
                }
              }

              if (tooltip && tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
              }
            });
          }

          (cy as any).destroy();
        }

        cyRef.current = null;
      };
    } catch (error) {
      console.error("❌ Cytoscape initialization failed:", error);
      console.error("❌ Elements that caused error:", elements);
      console.error("❌ Container:", containerRef.current);
    }
  }, [
    elements,
    loading,
    showLabels,
    highlightConnections,
    viewMode,
    layoutType,
    enableTooltips,
    persistViewport,
    // Removed function dependencies that cause unnecessary re-renders:
    // setupEventHandlers, setupTooltipHandlers, createEntityIcons, handleViewportChange, initialViewport
  ]);

  return {
    cy: cyRef.current,
    clearSelections,
    fitGraph,
    setViewport,
    hideAllTooltips: hideTooltips,
  };
}
