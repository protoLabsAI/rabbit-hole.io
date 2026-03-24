/**
 * Atlas Visual Schema — maps entity types and relationship types to
 * Cosmograph visual properties (color, size, shape indicators).
 *
 * Uses the same color palette as packages/utils/src/atlas/entity-styling.ts.
 */

// ─── Entity Type → Visual Properties ────────────────────────────────

export interface EntityVisualConfig {
  color: string;
  size: number; // relative point size multiplier
  label: string; // human-readable type name
}

export const ENTITY_VISUALS: Record<string, EntityVisualConfig> = {
  person: { color: "#60A5FA", size: 1.0, label: "Person" },
  organization: { color: "#F59E0B", size: 1.2, label: "Organization" },
  technology: { color: "#10B981", size: 0.9, label: "Technology" },
  concept: { color: "#8B5CF6", size: 0.8, label: "Concept" },
  event: { color: "#EF4444", size: 1.1, label: "Event" },
  location: { color: "#EC4899", size: 1.0, label: "Location" },
  country: { color: "#14B8A6", size: 1.3, label: "Country" },
  platform: { color: "#F97316", size: 1.0, label: "Platform" },
  movement: { color: "#A855F7", size: 1.1, label: "Movement" },
  publication: { color: "#6366F1", size: 0.9, label: "Publication" },
  law: { color: "#D946EF", size: 0.8, label: "Law" },
  product: { color: "#22D3EE", size: 0.9, label: "Product" },
  disease: { color: "#FB7185", size: 0.8, label: "Disease" },
  species: { color: "#4ADE80", size: 0.8, label: "Species" },
};

const DEFAULT_ENTITY_VISUAL: EntityVisualConfig = {
  color: "#6B7280",
  size: 0.7,
  label: "Entity",
};

export function getEntityVisual(type: string): EntityVisualConfig {
  return ENTITY_VISUALS[type?.toLowerCase()] ?? DEFAULT_ENTITY_VISUAL;
}

// ─── Relationship Type → Visual Properties ──────────────────────────

export interface RelationshipVisualConfig {
  color: string;
  width: number; // relative link width
  label: string;
  particles: boolean; // show directional particle flow
}

/** Sentiment-based edge colors (matches getSentimentColor in entity-styling.ts) */
const SENTIMENT_COLORS: Record<string, string> = {
  hostile: "#EF4444",
  supportive: "#22C55E",
  neutral: "#6B7280",
};

export const RELATIONSHIP_VISUALS: Record<string, RelationshipVisualConfig> = {
  RELATED_TO: { color: "#475569", width: 0.5, label: "Related To", particles: false },
  AUTHORED: { color: "#60A5FA", width: 0.8, label: "Authored", particles: true },
  FOUNDED: { color: "#F59E0B", width: 1.0, label: "Founded", particles: true },
  WORKS_AT: { color: "#10B981", width: 0.6, label: "Works At", particles: false },
  PART_OF: { color: "#8B5CF6", width: 0.7, label: "Part Of", particles: false },
  ATTACKS: { color: "#EF4444", width: 1.0, label: "Attacks", particles: true },
  SUPPORTS: { color: "#22C55E", width: 0.8, label: "Supports", particles: true },
  OPPOSES: { color: "#F97316", width: 0.8, label: "Opposes", particles: true },
  MEMBER_OF: { color: "#14B8A6", width: 0.6, label: "Member Of", particles: false },
  LOCATED_IN: { color: "#EC4899", width: 0.5, label: "Located In", particles: false },
};

const DEFAULT_RELATIONSHIP_VISUAL: RelationshipVisualConfig = {
  color: "#334155",
  width: 0.4,
  label: "Connected",
  particles: false,
};

export function getRelationshipVisual(
  type: string,
  sentiment?: string
): RelationshipVisualConfig {
  const base = RELATIONSHIP_VISUALS[type] ?? DEFAULT_RELATIONSHIP_VISUAL;
  // Override color with sentiment if available
  if (sentiment && SENTIMENT_COLORS[sentiment]) {
    return { ...base, color: SENTIMENT_COLORS[sentiment] };
  }
  return base;
}

// ─── Legend Data ─────────────────────────────────────────────────────

export function getEntityLegend(): Array<{ type: string; color: string; label: string }> {
  return Object.entries(ENTITY_VISUALS).map(([type, config]) => ({
    type,
    color: config.color,
    label: config.label,
  }));
}
