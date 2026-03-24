/**
 * Data Adapter: Neo4j API → react-force-graph-3d
 *
 * Transforms the raw response from /api/atlas/graph-payload (and the
 * graph-tiles family of endpoints) into the { nodes, links } format
 * expected by react-force-graph-3d.
 */

import { getEntityColor } from "@proto/utils/atlas";

// ─── Input types (raw API response shape) ────────────────────────────────────

export interface ApiNode {
  uid: string;
  name: string;
  type: string;
  x?: number | null;
  y?: number | null;
  communityId?: number | null;
  [key: string]: unknown;
}

export interface ApiEdge {
  uid?: string;
  type: string;
  source: string;
  target: string;
  sentiment?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface ApiGraphPayload {
  nodes: ApiNode[];
  edges: ApiEdge[];
  layout?: { algorithm: string; computed: boolean };
}

// ─── Output types (react-force-graph-3d format) ───────────────────────────────

export interface ForceGraphNode {
  id: string;
  name: string;
  type: string;
  color: string;
  label: string;
  communityId?: number | null;
}

export interface ForceGraphLink {
  source: string;
  target: string;
  type?: string;
  sentiment?: string;
  color?: string;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

// ─── Sentinel value for an empty graph ───────────────────────────────────────

export const EMPTY_GRAPH_DATA: ForceGraphData = { nodes: [], links: [] };

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * Map a sentiment string to a display colour.
 * Falls back to a neutral grey when sentiment is absent or unrecognised.
 */
function sentimentToColor(sentiment?: string): string {
  switch (sentiment) {
    case "hostile":
      return "#ff4444";
    case "supportive":
      return "#44ff44";
    case "ambiguous":
      return "#ffaa44";
    default:
      return "#666666";
  }
}

/**
 * Convert a raw API graph payload to the react-force-graph-3d format.
 *
 * - Nodes: uid → id, name, type, color derived from entity type.
 * - Links: source/target UIDs pass through; edge type and sentiment preserved.
 * - Edges that reference non-existent node UIDs are silently dropped to
 *   prevent react-force-graph-3d from creating phantom nodes.
 */
export function adaptApiToForceGraph(payload: ApiGraphPayload): ForceGraphData {
  if (
    !payload ||
    !Array.isArray(payload.nodes) ||
    !Array.isArray(payload.edges)
  ) {
    return EMPTY_GRAPH_DATA;
  }

  // Build a quick lookup set so we can validate edge endpoints.
  const nodeIds = new Set(payload.nodes.map((n) => n.uid));

  const nodes: ForceGraphNode[] = payload.nodes.map((n) => ({
    id: n.uid,
    name: n.name,
    type: n.type,
    color: getEntityColor(n.type),
    label: n.name,
    communityId: n.communityId,
  }));

  const links: ForceGraphLink[] = payload.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      sentiment: e.sentiment,
      color: sentimentToColor(e.sentiment),
    }));

  return { nodes, links };
}
