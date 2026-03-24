/**
 * Scene configuration for Atlas 3D visualization.
 *
 * Centralizes visual constants and test data generation for the
 * ForceGraph3D component.
 */

import { getEntityColor } from "@proto/utils/atlas";

// ─── Background & Fog ────────────────────────────────────────────────────────

/** Deep space background matching the prod-environment dark theme */
export const SCENE_BACKGROUND_COLOR = "#000011";

/** Fog color matches the background for seamless depth fade */
export const SCENE_FOG_COLOR = 0x000011;

/** Exponential fog density — lower = more visible depth range */
export const SCENE_FOG_DENSITY = 0.0035;

// ─── Force Layout ─────────────────────────────────────────────────────────────

/** Pre-compute initial node positions off-screen before first render */
export const WARMUP_TICKS = 100;

/**
 * Starting cooldown: 0 stops the engine immediately after warmup so the
 * initial layout is already stable when first painted.
 */
export const INITIAL_COOLDOWN_TICKS = 0;

/**
 * Steady-state cooldown: Infinity keeps the simulation alive so the layout
 * never freezes mid-interaction.
 */
export const STABLE_COOLDOWN_TICKS = Infinity;

// ─── Test Dataset ─────────────────────────────────────────────────────────────

/** Entity types sampled across all major domains for the test graph */
const TEST_ENTITY_TYPES = [
  "person",
  "organization",
  "event",
  "media",
  "platform",
  "movement",
  "city",
  "country",
  "region",
  "disease",
  "symptom",
  "treatment",
  "software",
  "technology",
  "company",
  "publication",
  "research",
  "university",
  "animal",
  "species",
  "film",
  "book",
  "art",
  "planet",
  "star",
] as const;

export interface TestNode {
  id: string;
  entityType: string;
  label: string;
  color: string;
}

export interface TestLink {
  source: string;
  target: string;
}

export interface TestGraphData {
  nodes: TestNode[];
  links: TestLink[];
}

/**
 * Generates a deterministic test dataset of 50 nodes with varied entity
 * types colored from the rabbit-hole.io palette via entity-styling.ts.
 */
export function generateTestGraphData(): TestGraphData {
  const nodes: TestNode[] = [];

  for (let i = 0; i < 50; i++) {
    const entityType = TEST_ENTITY_TYPES[i % TEST_ENTITY_TYPES.length];
    nodes.push({
      id: `node-${i}`,
      entityType,
      label: `${entityType} ${i + 1}`,
      color: getEntityColor(entityType),
    });
  }

  // Generate a sparse graph: each node links to 1–2 nearby nodes
  const links: TestLink[] = [];
  for (let i = 0; i < 50; i++) {
    // Chain link: 0→1, 1→2, …, 48→49
    if (i < 49) {
      links.push({ source: `node-${i}`, target: `node-${i + 1}` });
    }
    // Cross links every 7 nodes for clustering
    if (i + 7 < 50) {
      links.push({ source: `node-${i}`, target: `node-${i + 7}` });
    }
  }

  return { nodes, links };
}
