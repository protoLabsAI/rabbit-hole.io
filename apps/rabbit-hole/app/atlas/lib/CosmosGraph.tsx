"use client";

/**
 * CosmosGraph — React wrapper around @cosmos.gl/graph (MIT licensed).
 *
 * Provides a declarative React component over the imperative cosmos.gl API.
 * The GPU force simulation and WebGL rendering support 1M+ nodes.
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Graph } from "@cosmos.gl/graph";

// ─── Types ──────────────────────────────────────────────────────────

export interface CosmosNode {
  id: string;
  color: string;
  size?: number;
  [key: string]: unknown;
}

export interface CosmosLink {
  source: string;
  target: string;
  color?: string;
  width?: number;
}

export interface CosmosGraphProps {
  nodes: CosmosNode[];
  links: CosmosLink[];
  backgroundColor?: string;
  pointSize?: number;
  linkWidth?: number;
  linkArrows?: boolean;
  simulationGravity?: number;
  simulationRepulsion?: number;
  simulationFriction?: number;
  simulationLinkSpring?: number;
  simulationLinkDistance?: number;
  simulationDecay?: number;
  fitViewOnInit?: boolean;
  showLabels?: boolean;
  labelSize?: number;
  hoveredPointRingColor?: string;
  onClick?: (index: number | undefined) => void;
  onHover?: (index: number | undefined) => void;
  className?: string;
}

export interface CosmosGraphRef {
  /** Access the underlying Graph instance */
  graph: Graph | null;
  /** Zoom to fit all points */
  fitView: () => void;
  /** Zoom to a specific point by index */
  zoomToPoint: (index: number) => void;
  /** Select a point by index */
  selectPoint: (index: number | undefined) => void;
  /** Get the current point positions */
  getPointPositions: () => Float32Array | undefined;
  /** Pause the simulation */
  pause: () => void;
  /** Resume the simulation */
  resume: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export const CosmosGraph = forwardRef<CosmosGraphRef, CosmosGraphProps>(
  function CosmosGraph(
    {
      nodes,
      links,
      backgroundColor = "#000011",
      pointSize = 4,
      linkWidth = 0.3,
      linkArrows = false,
      simulationGravity = 0.15,
      simulationRepulsion = 0.8,
      simulationFriction = 0.85,
      simulationLinkSpring = 0.3,
      simulationLinkDistance = 10,
      simulationDecay = 3000,
      fitViewOnInit = true,
      showLabels = true,
      labelSize = 10,
      hoveredPointRingColor = "#ffffff",
      onClick,
      onHover,
      className,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);
    const nodesRef = useRef(nodes);
    const linksRef = useRef(links);

    nodesRef.current = nodes;
    linksRef.current = links;

    // Initialize the Graph instance
    useEffect(() => {
      if (!containerRef.current) return;

      const graph = new Graph(containerRef.current, {
        backgroundColor,
        pointSize,
        linkWidth,
        linkArrows,
        simulationGravity,
        simulationRepulsion,
        simulationFriction,
        simulationLinkSpring,
        simulationLinkDistance,
        simulationDecay,
        fitViewOnInit,
        showLabels,
        labelSize,
        hoveredPointRingColor,
        onClick: (index: number | undefined) => onClick?.(index),
        onPointMouseOver: (index: number | undefined) => onHover?.(index),
      });

      graphRef.current = graph;

      return () => {
        graph.destroy();
        graphRef.current = null;
      };
      // Only recreate on mount/unmount — config updates go through setConfig
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update data when nodes/links change
    useEffect(() => {
      const graph = graphRef.current;
      if (!graph || nodes.length === 0) return;

      // Build typed arrays for cosmos.gl
      const pointPositions = new Float32Array(nodes.length * 2);
      const pointColors = new Float32Array(nodes.length * 4);
      const pointSizes = new Float32Array(nodes.length);

      for (let i = 0; i < nodes.length; i++) {
        // Random initial positions (cosmos.gl will run force layout)
        pointPositions[i * 2] = (Math.random() - 0.5) * 1000;
        pointPositions[i * 2 + 1] = (Math.random() - 0.5) * 1000;

        // Parse hex color to RGBA
        const hex = nodes[i].color || "#6B7280";
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        pointColors[i * 4] = r;
        pointColors[i * 4 + 1] = g;
        pointColors[i * 4 + 2] = b;
        pointColors[i * 4 + 3] = 1.0;

        pointSizes[i] = (nodes[i].size ?? 1) * pointSize;
      }

      // Build link index arrays
      const nodeIdToIndex = new Map<string, number>();
      nodes.forEach((n, i) => nodeIdToIndex.set(n.id, i));

      const validLinks = links.filter(
        (l) => nodeIdToIndex.has(l.source) && nodeIdToIndex.has(l.target)
      );
      const linkSources = new Float32Array(validLinks.length);
      const linkTargets = new Float32Array(validLinks.length);
      const linkColors = new Float32Array(validLinks.length * 4);

      for (let i = 0; i < validLinks.length; i++) {
        linkSources[i] = nodeIdToIndex.get(validLinks[i].source)!;
        linkTargets[i] = nodeIdToIndex.get(validLinks[i].target)!;

        const hex = validLinks[i].color || "#334155";
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        linkColors[i * 4] = r;
        linkColors[i * 4 + 1] = g;
        linkColors[i * 4 + 2] = b;
        linkColors[i * 4 + 3] = 0.6;
      }

      graph.setPointPositions(pointPositions);
      graph.setPointColors(pointColors);
      graph.setPointSizes(pointSizes);
      graph.setLinks(linkSources, linkTargets);
      graph.setLinkColors(linkColors);
      graph.render();

      if (fitViewOnInit) {
        // Delay fitView to allow initial layout to settle
        setTimeout(() => graph.fitView(), 500);
      }
    }, [nodes, links, pointSize, fitViewOnInit]);

    // Expose imperative API
    useImperativeHandle(
      ref,
      () => ({
        graph: graphRef.current,
        fitView: () => graphRef.current?.fitView(),
        zoomToPoint: (index: number) => {
          const graph = graphRef.current;
          if (!graph) return;
          const positions = graph.getPointPositions();
          if (positions && index * 2 + 1 < positions.length) {
            graph.zoomToPointByIndex(index, 1000);
          }
        },
        selectPoint: (index: number | undefined) => {
          graphRef.current?.selectPointByIndex(index ?? -1);
        },
        getPointPositions: () => graphRef.current?.getPointPositions(),
        pause: () => graphRef.current?.pause(),
        resume: () => graphRef.current?.start(),
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={className ?? "w-full h-full"}
        style={{ backgroundColor }}
      />
    );
  }
);
