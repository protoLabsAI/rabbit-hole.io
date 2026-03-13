/**
 * Deterministic Layout Algorithms for Research Page
 *
 * Provides ELK (hierarchical tree) and Force-directed layouts with deterministic results.
 *
 * Layout Modes:
 * - manual: User-controlled positions, persisted to database
 * - elk: Computed hierarchical tree layout, transient (not persisted)
 * - force: Computed force-directed layout, transient (not persisted)
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import ELK from "elkjs/lib/elk.bundled.js";
import type Graph from "graphology";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";

export type LayoutType = "elk" | "force" | "manual";

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  direction?: "DOWN" | "RIGHT" | "UP" | "LEFT"; // ELK direction
  spacing?: number;
  nodeSpacing?: number;
}

interface CachedLayout {
  hash: string;
  layoutType: LayoutType;
  positions: Map<string, { x: number; y: number }>;
}

let layoutCache: CachedLayout | null = null;

/**
 * Generate hash of graph structure for cache key
 */
function getGraphHash(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  layoutType: LayoutType
): string {
  const nodeIds = graph.nodes().sort().join(",");
  const edgeIds = graph.edges().sort().join(",");
  return `${layoutType}:${nodeIds}:${edgeIds}`;
}

/**
 * Apply ELK hierarchical tree layout (deterministic, cached)
 */
export async function applyElkLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: LayoutOptions = {}
): Promise<boolean> {
  const {
    nodeWidth = 200,
    nodeHeight = 100,
    direction = "DOWN",
    spacing = 150, // Increased from 100 - space between layers
    nodeSpacing = 120, // Increased from 80 - space between nodes in same layer
  } = options;

  // Check cache
  const hash = getGraphHash(graph, "elk");
  if (layoutCache?.hash === hash && layoutCache.layoutType === "elk") {
    // Apply cached positions
    layoutCache.positions.forEach((pos, nodeId) => {
      if (graph.hasNode(nodeId)) {
        graph.mergeNodeAttributes(nodeId, pos);
      }
    });
    return false; // From cache
  }

  const elk = new ELK();

  // Convert Graphology to ELK format (order matters for determinism)
  const sortedNodes = graph.nodes().sort();
  const elkNodes = sortedNodes.map((nodeId) => ({
    id: nodeId,
    width: nodeWidth,
    height: nodeHeight,
  }));

  const sortedEdges = graph.edges().sort();
  const elkEdges = sortedEdges.map((edgeId) => {
    const extremities = graph.extremities(edgeId);
    return {
      id: edgeId,
      sources: [extremities[0]],
      targets: [extremities[1]],
    };
  });

  // Compute layout
  const elkGraph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": String(nodeSpacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing),
      "elk.padding": "[50,50,50,50]",
    },
    children: elkNodes,
    edges: elkEdges,
  });

  // Cache and apply positions
  const positions = new Map<string, { x: number; y: number }>();
  elkGraph.children?.forEach((node) => {
    if (node.id && node.x !== undefined && node.y !== undefined) {
      // ELK returns top-left corner, adjust to center
      const pos = {
        x: node.x + (node.width || nodeWidth) / 2,
        y: node.y + (node.height || nodeHeight) / 2,
      };
      positions.set(node.id, pos);
      if (graph.hasNode(node.id)) {
        graph.mergeNodeAttributes(node.id, pos);
      }
    }
  });

  layoutCache = { hash, layoutType: "elk", positions };
  return true; // Computed fresh
}

/**
 * Apply D3-Force layout with fixed seed (deterministic, cached)
 */
export function applyForceLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  options: {
    iterations?: number;
    strength?: number;
    distance?: number;
    centerX?: number;
    centerY?: number;
    collisionRadius?: number;
  } = {}
): boolean {
  const {
    iterations = 300,
    strength = -800, // Increased from -400 - stronger repulsion between nodes
    distance = 250, // Increased from 150 - longer ideal link distance
    centerX = 400,
    centerY = 300,
    collisionRadius = 120,
  } = options;

  // Check cache
  const hash = getGraphHash(graph, "force");
  if (layoutCache?.hash === hash && layoutCache.layoutType === "force") {
    // Apply cached positions
    layoutCache.positions.forEach((pos, nodeId) => {
      if (graph.hasNode(nodeId)) {
        graph.mergeNodeAttributes(nodeId, pos);
      }
    });
    return false; // From cache
  }

  // Convert Graphology to D3 format with deterministic initial positions
  const sortedNodes = graph.nodes().sort();
  const nodes = sortedNodes.map((nodeId, index) => ({
    id: nodeId,
    // Deterministic initial positions in a circle
    x: centerX + Math.cos((index / sortedNodes.length) * 2 * Math.PI) * 100,
    y: centerY + Math.sin((index / sortedNodes.length) * 2 * Math.PI) * 100,
  }));

  const links = graph.mapEdges((_edgeId, _attrs, source, target) => ({
    source,
    target,
  }));

  // Create simulation with deterministic initial positions
  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink(links)
        .id((d: any) => d.id)
        .distance(distance)
    )
    .force("charge", forceManyBody().strength(strength))
    .force("center", forceCenter(centerX, centerY))
    .force("collide", forceCollide(collisionRadius)) // Prevents node overlap
    .alphaDecay(0.02)
    .stop();

  // Run simulation synchronously for deterministic results
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  // Cache and apply positions
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    if (graph.hasNode(node.id)) {
      const pos = { x: node.x!, y: node.y! };
      positions.set(node.id, pos);
      graph.mergeNodeAttributes(node.id, pos);
    }
  });

  layoutCache = { hash, layoutType: "force", positions };
  return true; // Computed fresh
}

/**
 * Restore manual node positions (no computation)
 * Positions come from user's manual placement, persisted in database
 */
export function applyManualLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): boolean {
  // Manual layout doesn't modify positions - they're already set
  // This is a no-op that indicates "use existing user-controlled positions"
  console.log("📍 Using manual node positions");
  return false; // No computation needed
}

/**
 * Apply layout based on type
 * @returns Promise<boolean> - true if computed fresh, false if from cache/manual
 */
export async function applyLayout(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  layoutType: LayoutType,
  options?: LayoutOptions
): Promise<boolean> {
  switch (layoutType) {
    case "elk":
      return await applyElkLayout(graph, options);
    case "force":
      return applyForceLayout(graph, {
        centerX: options?.nodeWidth ? options.nodeWidth * 2 : 400,
        centerY: options?.nodeHeight ? options.nodeHeight * 2 : 300,
      });
    case "manual":
      return applyManualLayout(graph);
  }
}

/**
 * Clear layout cache (call when graph structure changes)
 */
export function clearLayoutCache(): void {
  layoutCache = null;
}
