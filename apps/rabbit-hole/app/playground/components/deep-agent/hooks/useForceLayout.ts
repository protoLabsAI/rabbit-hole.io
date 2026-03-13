"use client";

import type { Node, Edge } from "@xyflow/react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type Simulation,
} from "d3-force";
import { useEffect, useRef, useTransition } from "react";

interface SimulationNode extends SimulationNodeDatum {
  id: string;
}

interface UseForceLayoutOptions {
  nodes: Node[];
  edges: Edge[];
  onNodesUpdate: (nodes: Node[]) => void;
  centerX?: number;
  centerY?: number;
  linkDistance?: number;
  chargeStrength?: number;
  collideRadius?: number;
}

interface UseForceLayoutResult {
  reheat: () => void;
  /** React 19: True when layout update is pending (non-blocking) */
  isLayoutPending: boolean;
}

/**
 * Force-directed layout hook with React 19 optimizations
 *
 * React 19 Patterns:
 * - useTransition: Layout updates are non-blocking (won't freeze typing/interactions)
 * - Concurrent rendering: React can interrupt layout for urgent updates
 *
 * Key optimizations:
 * - Only runs simulation when node/edge count changes
 * - Preserves existing node positions when adding new nodes
 * - Uses alpha heating for smooth re-layouts
 */
export function useForceLayout({
  nodes,
  edges,
  onNodesUpdate,
  centerX = 600,
  centerY = 400,
  linkDistance = 250,
  chargeStrength = -800,
  collideRadius = 120,
}: UseForceLayoutOptions): UseForceLayoutResult {
  const simulationRef = useRef<Simulation<SimulationNode, undefined> | null>(
    null
  );
  const prevNodeCountRef = useRef(0);
  const prevEdgeCountRef = useRef(0);
  const isFirstRunRef = useRef(true);

  // React 19: useTransition for non-blocking layout updates
  // Layout computation won't block user interactions
  const [isLayoutPending, startTransition] = useTransition();

  // Run simulation when graph structure changes
  useEffect(() => {
    if (nodes.length === 0) {
      simulationRef.current?.stop();
      simulationRef.current = null;
      prevNodeCountRef.current = 0;
      prevEdgeCountRef.current = 0;
      isFirstRunRef.current = true;
      return;
    }

    const nodeCountChanged = nodes.length !== prevNodeCountRef.current;
    const edgeCountChanged = edges.length !== prevEdgeCountRef.current;

    // Skip if no structural changes
    if (!nodeCountChanged && !edgeCountChanged && !isFirstRunRef.current) {
      return;
    }

    // React 19: Wrap layout computation in transition
    // This allows React to interrupt for urgent updates (typing, clicking)
    startTransition(() => {
      // Create simulation nodes, preserving existing positions
      const simulationNodes: SimulationNode[] = nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));

      const simulationLinks = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      // Stop existing simulation
      simulationRef.current?.stop();

      // Create new simulation
      const simulation = forceSimulation(simulationNodes)
        .force(
          "link",
          forceLink(simulationLinks)
            .id((d: any) => d.id)
            .distance(linkDistance)
            .strength(0.5)
        )
        .force("charge", forceManyBody().strength(chargeStrength))
        .force("center", forceCenter(centerX, centerY))
        .force("collide", forceCollide().radius(collideRadius));

      // Set alpha based on whether this is first run or incremental
      if (isFirstRunRef.current) {
        simulation.alpha(1).alphaDecay(0.02);
      } else {
        // Lower alpha for incremental updates (gentler re-arrangement)
        simulation.alpha(0.3).alphaDecay(0.05);
      }

      simulationRef.current = simulation as Simulation<
        SimulationNode,
        undefined
      >;

      // Run simulation ticks
      const tickCount = isFirstRunRef.current ? 300 : 100;
      simulation.tick(tickCount);

      // Update nodes with final positions
      const updatedNodes = nodes.map((node) => {
        const simNode = simulationNodes.find((n) => n.id === node.id);
        return {
          ...node,
          position: {
            x: simNode?.x ?? node.position.x,
            y: simNode?.y ?? node.position.y,
          },
        };
      });

      onNodesUpdate(updatedNodes);

      // Update tracking refs
      prevNodeCountRef.current = nodes.length;
      prevEdgeCountRef.current = edges.length;
      isFirstRunRef.current = false;
    });

    return () => {
      simulationRef.current?.stop();
    };
  }, [
    nodes.length,
    edges.length,
    centerX,
    centerY,
    linkDistance,
    chargeStrength,
    collideRadius,
    onNodesUpdate,
    startTransition,
  ]);

  // Manual reheat function for user-triggered re-layouts
  function reheat() {
    if (!simulationRef.current || nodes.length === 0) return;

    startTransition(() => {
      // Create fresh simulation nodes
      const simulationNodes: SimulationNode[] = nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }));

      const simulationLinks = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      // Stop existing and create new
      simulationRef.current?.stop();

      const simulation = forceSimulation(simulationNodes)
        .force(
          "link",
          forceLink(simulationLinks)
            .id((d: any) => d.id)
            .distance(linkDistance)
        )
        .force("charge", forceManyBody().strength(chargeStrength))
        .force("center", forceCenter(centerX, centerY))
        .force("collide", forceCollide().radius(collideRadius))
        .alpha(0.5)
        .alphaDecay(0.02);

      simulationRef.current = simulation as Simulation<
        SimulationNode,
        undefined
      >;

      // Run to completion
      simulation.tick(200);

      const updatedNodes = nodes.map((node) => {
        const simNode = simulationNodes.find((n) => n.id === node.id);
        return {
          ...node,
          position: {
            x: simNode?.x ?? node.position.x,
            y: simNode?.y ?? node.position.y,
          },
        };
      });

      onNodesUpdate(updatedNodes);
    });
  }

  return { reheat, isLayoutPending };
}
