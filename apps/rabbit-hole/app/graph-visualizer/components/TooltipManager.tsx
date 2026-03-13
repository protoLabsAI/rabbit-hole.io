/**
 * Tooltip Manager
 *
 * Unified tooltip system using @floating-ui/dom
 * Works consistently across Cytoscape, React Flow, and Sigma renderers
 */

"use client";

import { computePosition, flip, shift, offset } from "@floating-ui/dom";
import React, { useEffect, useRef, useState } from "react";

import { DomainCardFactory } from "./domain-cards/DomainCardFactory";

interface TooltipData {
  uid: string;
  name: string;
  type: string;
  properties?: Record<string, any>;
  tags?: string[];
  aliases?: string[];
}

interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipManagerProps {
  /**
   * Get screen coordinates for a node
   * Different for each renderer:
   * - Cytoscape: cy.nodes().renderedPosition()
   * - React Flow: node DOM element
   * - Sigma: renderer.getNodeDisplayData()
   */
  getNodeScreenCoords: (nodeId: string) => TooltipPosition | null;

  /**
   * Current hovered node data
   */
  hoveredNode: TooltipData | null;

  /**
   * Tooltip style (compact vs detailed)
   */
  style?: "compact" | "detailed";
}

/**
 * Tooltip Manager Component
 */
export const TooltipManager = React.memo(function TooltipManager({
  getNodeScreenCoords,
  hoveredNode,
  style = "compact",
}: TooltipManagerProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!hoveredNode || !tooltipRef.current) {
      setPosition(null);
      return;
    }

    const coords = getNodeScreenCoords(hoveredNode.uid);
    if (!coords) {
      setPosition(null);
      return;
    }

    // Create virtual element at node position
    const virtualElement = {
      getBoundingClientRect: () => ({
        x: coords.x,
        y: coords.y,
        top: coords.y,
        left: coords.x,
        bottom: coords.y,
        right: coords.x,
        width: 0,
        height: 0,
      }),
    };

    // Compute tooltip position
    computePosition(virtualElement, tooltipRef.current, {
      placement: "top",
      middleware: [offset(10), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      setPosition({ top: y, left: x });
    });
  }, [hoveredNode, getNodeScreenCoords]);

  if (!hoveredNode || !position) {
    return null;
  }

  // Create Cytoscape node proxy for DomainCardFactory
  const cytoscapeNodeProxy = {
    data: (key?: string) => {
      if (!key) return hoveredNode;
      const dataMap: Record<string, any> = {
        originalNode: hoveredNode,
        uid: hoveredNode.uid,
        id: hoveredNode.uid,
        name: hoveredNode.name,
        type: hoveredNode.type,
        ...hoveredNode.properties,
      };
      return dataMap[key] !== undefined
        ? dataMap[key]
        : hoveredNode[key as keyof TooltipData];
    },
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="bg-card rounded-lg shadow-lg border border-border max-w-sm">
        <DomainCardFactory
          cytoscapeNode={cytoscapeNodeProxy}
          cardProps={{
            size: style === "detailed" ? "detailed" : "compact",
            style: { border: "none" },
          }}
        />
      </div>
    </div>
  );
});

/**
 * Hook for managing tooltip state
 */
export function useTooltipManager() {
  const [hoveredNode, setHoveredNode] = useState<TooltipData | null>(null);

  const showTooltip = (nodeData: TooltipData) => {
    setHoveredNode(nodeData);
  };

  const hideTooltip = () => {
    setHoveredNode(null);
  };

  return {
    hoveredNode,
    showTooltip,
    hideTooltip,
  };
}
