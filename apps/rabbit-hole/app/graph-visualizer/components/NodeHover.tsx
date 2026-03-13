/**
 * NodeHover Component - Isolated Hover Effect Handler
 *
 * **Dedicated component for managing node hover interactions in graph visualizations.**
 *
 * Extracted from the larger useCytoscape hook to provide:
 * - **Isolated Hover Logic**: Handles mouseover/mouseout events independently
 * - **Tooltip Management**: Creates and manages floating tooltips with proper cleanup
 * - **Stable Timing**: Configurable show/hide delays with timeout management
 * - **Reusable**: Can be used across different graph contexts
 * - **Testable**: Isolated component for easier testing in Storybook
 *
 * Original implementation extracted from useCytoscape.ts lines 259-350.
 *
 * @example
 * ```tsx
 * <NodeHover
 *   enabled={true}
 *   showDelay={500}
 *   hideDelay={200}
 *   onNodeHover={(node, isHovering) => console.log("Hover:", node.name)}
 *   tooltipContent={(node) => ({ title: node.name, subtitle: node.type })}
 * />
 * ```
 */

import React, { useRef, useEffect, useCallback } from "react";

import {
  createTooltipContent,
  showTooltip,
  destroyTooltip,
  extractEntityInfo,
} from "../../atlas/utils/popper-tooltip";

/**
 * Configuration for tooltip content display
 */
export interface TooltipContentConfig {
  /** Main title text */
  title: string;
  /** Subtitle or description text */
  subtitle?: string;
  /** Additional metadata to display */
  metadata?: Record<string, string>;
}

/**
 * Props for the NodeHover component
 */
export interface NodeHoverProps {
  /** Whether hover effects are enabled */
  enabled?: boolean;

  /** Delay before showing tooltip (ms) */
  showDelay?: number;

  /** Delay before cleaning up tooltip (ms) */
  hideDelay?: number;

  /** Callback when node hover state changes */
  onNodeHover?: (node: any, isHovering: boolean) => void;

  /** Custom tooltip content generator */
  tooltipContent?: (node: any) => TooltipContentConfig;

  /** Enable domain-specific popovers (default: true) */
  useDomainPopovers?: boolean;

  /** Tooltip placement relative to node */
  placement?: "top" | "bottom" | "left" | "right";

  /** Cytoscape instance to attach events to */
  cytoscapeInstance?: any;

  /** Additional CSS classes for tooltip */
  tooltipClassName?: string;

  /** Custom styling for tooltip */
  tooltipStyle?: React.CSSProperties;
}

/**
 * Hook for managing node hover state and tooltip lifecycle
 *
 * Handles the complex timing and cleanup logic for hover tooltips,
 * ensuring proper memory management and smooth user interactions.
 */
export function useNodeHover({
  enabled = true,
  showDelay = 500,
  hideDelay = 200,
  onNodeHover,
  tooltipContent,
  useDomainPopovers = true,
  placement = "top",
  cytoscapeInstance,
  tooltipClassName,
  tooltipStyle,
}: NodeHoverProps) {
  const tooltipTimeoutsRef = useRef<{
    show: NodeJS.Timeout | null;
    hide: NodeJS.Timeout | null;
  }>({ show: null, hide: null });

  const currentTooltipRef = useRef<HTMLElement | null>(null);
  const isHoveringRef = useRef(false);

  /**
   * Generate tooltip content from node data
   */
  const generateTooltipContent = useCallback(
    (node: any): TooltipContentConfig => {
      if (tooltipContent) {
        return tooltipContent(node);
      }

      // Default content extraction (matching original Atlas behavior)
      const { name, uid } = extractEntityInfo(node);

      return {
        title: name || "Unknown Entity",
        subtitle: uid || node.data?.("id") || "No ID",
        metadata: {
          type: node.data?.("type") || "Unknown",
        },
      };
    },
    [tooltipContent]
  );

  /**
   * Create and show tooltip for a node
   */
  const showNodeTooltip = useCallback(
    async (node: any) => {
      // Debug logging removed - tooltip working

      try {
        let tooltipElement: HTMLElement;

        if (useDomainPopovers) {
          // ✅ Use shared tooltip utility (no duplication)
          const { createReactDomainTooltip } = await import(
            "../utils/tooltip-manager"
          );
          tooltipElement = await createReactDomainTooltip(node);

          console.log(
            "🎯 NodeHover: React Domain card created via shared utility"
          );
        } else {
          // Use legacy text-based tooltip
          const contentConfig = generateTooltipContent(node);
          tooltipElement = createTooltipContent(
            contentConfig.title,
            contentConfig.subtitle || ""
          );

          // Apply custom styling if provided
          if (tooltipClassName) {
            tooltipElement.className = `${tooltipElement.className} ${tooltipClassName}`;
          }

          if (tooltipStyle) {
            Object.assign(tooltipElement.style, tooltipStyle);
          }

          console.log(
            "🎯 NodeHover: Legacy tooltip created for",
            contentConfig.title
          );
        }

        // Use shared tooltip setup utility
        const { setupTooltipPopper } = await import("../utils/tooltip-manager");
        setupTooltipPopper(node, tooltipElement);

        // Store references for cleanup
        currentTooltipRef.current = tooltipElement;

        console.log("🎯 NodeHover: Tooltip setup complete!");
      } catch (error) {
        console.warn("⚠️ NodeHover: Tooltip creation error:", error);
      }
    },
    [
      useDomainPopovers,
      generateTooltipContent,
      tooltipClassName,
      tooltipStyle,
      placement,
    ]
  );

  /**
   * Hide and cleanup tooltip for a node
   */
  const hideNodeTooltip = useCallback(
    (node: any) => {
      try {
        const tooltip = node.data("tooltip");
        const reactRoot = node.data("reactRoot");
        const popperInstance = node.data("popperInstance");

        if (tooltip) {
          // Hide tooltip immediately
          tooltip.style.visibility = "hidden";
          tooltip.style.opacity = "0";

          // Cleanup after fade animation
          tooltipTimeoutsRef.current.hide = setTimeout(async () => {
            try {
              const { cleanupReactDomainTooltip } = await import(
                "../utils/tooltip-manager"
              );

              const popperInstance = node.data("popperInstance");

              cleanupReactDomainTooltip(tooltip);
              if (popperInstance) {
                popperInstance.destroy();
              }

              node.removeData("tooltip");
              node.removeData("popperInstance");
              node.removeData("reactRoot");

              if (currentTooltipRef.current === tooltip) {
                currentTooltipRef.current = null;
              }

              tooltipTimeoutsRef.current.hide = null;
              console.log("🧹 NodeHover: React Domain tooltip cleaned up");
            } catch (cleanupError) {
              console.warn("⚠️ NodeHover: Cleanup error:", cleanupError);
            }
          }, 200); // Match fade duration
        }
      } catch (error) {
        console.warn("⚠️ NodeHover: Tooltip cleanup error:", error);
      }
    },
    [hideDelay]
  );

  /**
   * Handle mouse over event
   */
  const handleMouseOver = useCallback(
    (event: any) => {
      if (!enabled) return;

      try {
        const node = event.target;
        isHoveringRef.current = true;

        // Clear existing hide timeout
        if (tooltipTimeoutsRef.current.hide) {
          clearTimeout(tooltipTimeoutsRef.current.hide);
          tooltipTimeoutsRef.current.hide = null;
        }

        // If tooltip already exists, show it immediately
        const existingTooltip = node.data("tooltip");
        if (existingTooltip) {
          showTooltip(existingTooltip);
          currentTooltipRef.current = existingTooltip;
          onNodeHover?.(node, true);
          return;
        }

        // Clear existing show timeout
        if (tooltipTimeoutsRef.current.show) {
          clearTimeout(tooltipTimeoutsRef.current.show);
          tooltipTimeoutsRef.current.show = null;
        }

        // Set delay before showing tooltip
        tooltipTimeoutsRef.current.show = setTimeout(() => {
          if (isHoveringRef.current) {
            // Only show if still hovering
            showNodeTooltip(node);
            onNodeHover?.(node, true);
          }
          tooltipTimeoutsRef.current.show = null;
        }, showDelay);
      } catch (error) {
        console.warn("⚠️ NodeHover: Mouseover error:", error);
      }
    },
    [enabled, showDelay, showNodeTooltip, onNodeHover]
  );

  /**
   * Handle mouse out event
   */
  const handleMouseOut = useCallback(
    (event: any) => {
      if (!enabled) return;

      try {
        const node = event.target;
        isHoveringRef.current = false;

        // Clear pending show timeout
        if (tooltipTimeoutsRef.current.show) {
          clearTimeout(tooltipTimeoutsRef.current.show);
          tooltipTimeoutsRef.current.show = null;
        }

        hideNodeTooltip(node);
        onNodeHover?.(node, false);
      } catch (error) {
        console.warn("⚠️ NodeHover: Mouseout error:", error);
      }
    },
    [enabled, hideNodeTooltip, onNodeHover]
  );

  /**
   * Setup and cleanup event listeners
   */
  useEffect(() => {
    if (!cytoscapeInstance || !enabled) return;

    console.log("🎯 NodeHover: Setting up event listeners");

    // Attach event listeners
    cytoscapeInstance.on("mouseover", "node", handleMouseOver);
    cytoscapeInstance.on("mouseout", "node", handleMouseOut);

    // Cleanup function
    return () => {
      console.log("🧹 NodeHover: Cleaning up event listeners");

      // Remove event listeners
      if (cytoscapeInstance && !cytoscapeInstance.destroyed?.()) {
        cytoscapeInstance.off("mouseover", "node", handleMouseOver);
        cytoscapeInstance.off("mouseout", "node", handleMouseOut);
      }

      // Clear timeouts
      if (tooltipTimeoutsRef.current.show) {
        clearTimeout(tooltipTimeoutsRef.current.show);
        tooltipTimeoutsRef.current.show = null;
      }

      if (tooltipTimeoutsRef.current.hide) {
        clearTimeout(tooltipTimeoutsRef.current.hide);
        tooltipTimeoutsRef.current.hide = null;
      }

      // Cleanup current tooltip
      if (currentTooltipRef.current) {
        destroyTooltip(currentTooltipRef.current);
        currentTooltipRef.current = null;
      }

      // Aggressive cleanup - find and remove ALL domain tooltips
      const allDomainTooltips = document.querySelectorAll(".domain-tooltip");
      allDomainTooltips.forEach((tooltip) => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      });

      // Cleanup all node tooltips
      if (cytoscapeInstance && !cytoscapeInstance.destroyed?.()) {
        const nodes = cytoscapeInstance.nodes?.();
        if (nodes && typeof nodes.forEach === "function") {
          nodes.forEach((node: any) => {
            const tooltip = node.data("tooltip");
            if (tooltip) {
              destroyTooltip(tooltip);
              node.removeData("tooltip");
              node.removeData("popperInstance");
            }
          });
        }
      }
    };
  }, [cytoscapeInstance, enabled, handleMouseOver, handleMouseOut]);

  return {
    /** Whether hover effects are currently active */
    isActive: enabled && !!cytoscapeInstance,

    /** Current hover state */
    isHovering: isHoveringRef.current,

    /** Manually trigger tooltip for a node */
    showTooltip: showNodeTooltip,

    /** Manually hide tooltip for a node */
    hideTooltip: hideNodeTooltip,
  };
}

/**
 * NodeHover Component
 *
 * A React component wrapper around the useNodeHover hook.
 * Use this when you need declarative hover management in JSX.
 */
export const NodeHover: React.FC<
  NodeHoverProps & { children?: React.ReactNode }
> = ({ children, ...props }) => {
  const hoverState = useNodeHover(props);

  // This component doesn't render anything visible itself
  // It's purely for side effects (event listeners and tooltip management)
  return (
    <>
      {children}
      {/* Development debug info */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            fontSize: "10px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "2px 4px",
            borderRadius: "2px",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          Hover: {hoverState.isActive ? "✓" : "✗"}
        </div>
      )}
    </>
  );
};

NodeHover.displayName = "NodeHover";

export default NodeHover;
