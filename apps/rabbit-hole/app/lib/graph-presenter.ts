/**
 * Graph Presenter - Type-Safe Display Model
 *
 * Converts raw Neo4j query results to structured display models
 * with proper type safety and whitelisting for security.
 */

// Removed neo4j-driver import - use Math.floor() for numeric conversions

import {
  ALL_ENTITY_TYPES,
  EntityType,
  ALL_RELATIONSHIP_TYPES,
  RelationshipType,
} from "@protolabsai/types";

// Use types from the schema system (single source of truth)
const ALLOWED_RELATIONSHIP_TYPES = ALL_RELATIONSHIP_TYPES;
const ALLOWED_ENTITY_TYPES = ALL_ENTITY_TYPES;

type AllowedRelationshipType = RelationshipType;
type AllowedEntityType = EntityType;

// Display model interfaces
export interface DisplayNode {
  id: string;
  entityType: string;
  display: {
    title: string;
    subtitle?: string;
    avatar?: string;
    badges?: string[];
  };
  metrics: {
    speechActs?: {
      hostile: number;
      supportive: number;
      neutral: number;
      total: number;
    };
    degree?: {
      in: number;
      out: number;
      total: number;
    };
    lastActiveAt?: string;
    activityInWindow?: number;
  };
  communityId?: number;
  position?: { x: number; y: number };
}

export interface DisplayEdge {
  id: string;
  source: string;
  target: string;
  type: AllowedRelationshipType;
  tone: "hostile" | "supportive" | "neutral" | "ambiguous";
  intensity: "low" | "medium" | "high" | "extreme";
  excerpt: string; // max 25 chars
  confidence: number;
  at?: string;
  ui: {
    chip: string;
    color: string;
    timestamp?: string;
  };
}

/**
 * Convert Neo4j node record to display model
 */
export function toDisplayNode(record: any): DisplayNode {
  const uid = record.get("uid");
  const name = record.get("name") || record.get("label") || uid;
  const type = record.get("type");
  const aliases = record.get("aliases") || [];
  const tags = record.get("tags") || [];

  // Validate entity type
  if (!isAllowedEntityType(type)) {
    console.warn(`⚠️ Unknown entity type: ${type}, defaulting to Organization`);
  }

  // Build display badges from tags and aliases
  const badges = [
    ...aliases.slice(0, 2), // Max 2 aliases
    ...tags.slice(0, 3), // Max 3 tags
  ].slice(0, 4); // Max 4 total badges

  // Extract metrics safely
  const speechActs = {
    hostile: record.get("speechActs_hostile") || 0,
    supportive: record.get("speechActs_supportive") || 0,
    neutral: record.get("speechActs_neutral") || 0,
    total: record.get("speechActs_total") || 0,
  };

  const degree = {
    in: record.get("degree_in") || 0,
    out: record.get("degree_out") || 0,
    total: record.get("degree_total") || 0,
  };

  return {
    id: uid,
    entityType: type.toLowerCase(),
    display: {
      title: name,
      subtitle: type,
      badges: badges.length > 0 ? badges : undefined,
    },
    metrics: {
      speechActs,
      degree,
      lastActiveAt: record.get("lastActiveAt")?.toString(),
      activityInWindow: record.get("activityCount")
        ? typeof record.get("activityCount") === "object"
          ? Math.floor(record.get("activityCount"))
          : record.get("activityCount")
        : undefined,
    },
    communityId: record.get("communityId")
      ? typeof record.get("communityId") === "object"
        ? Math.floor(record.get("communityId"))
        : record.get("communityId")
      : undefined,
    position: record.get("position") || generateRandomPosition(),
  };
}

/**
 * Convert Neo4j relationship record to display model
 */
export function toDisplayEdge(record: any): DisplayEdge {
  const uid = record.get("uid");
  const type = record.get("type");
  const sourceUid = record.get("sourceUid");
  const targetUid = record.get("targetUid");
  const sentiment = record.get("sentiment") || "neutral";
  const category = record.get("category");
  const intensity = record.get("intensity") || "medium";
  const confidence = record.get("confidence") || 0.8;
  const excerpt = record.get("excerpt") || "";
  const at = record.get("at");

  // Validate relationship type
  if (!isAllowedRelationshipType(type)) {
    console.warn(
      `⚠️ Unknown relationship type: ${type}, allowing through but flagging`
    );
  }

  // Create human-readable chip
  const chip = category || type.toLowerCase().replace(/_/g, " ");

  // Truncate excerpt to 25 chars max
  const truncatedExcerpt =
    excerpt.length > 25 ? excerpt.substring(0, 22) + "..." : excerpt;

  return {
    id: uid,
    source: sourceUid,
    target: targetUid,
    type: type as AllowedRelationshipType,
    tone: normalizeTone(sentiment),
    intensity: normalizeIntensity(intensity),
    excerpt: truncatedExcerpt,
    confidence,
    at: at?.toString(),
    ui: {
      chip,
      color: getToneColor(normalizeTone(sentiment)),
      timestamp: at ? new Date(at).toLocaleDateString() : undefined,
    },
  };
}

/**
 * Type guards for security
 */
function isAllowedEntityType(type: string): type is AllowedEntityType {
  return (ALLOWED_ENTITY_TYPES as readonly string[]).includes(type);
}

function isAllowedRelationshipType(
  type: string
): type is AllowedRelationshipType {
  return (ALLOWED_RELATIONSHIP_TYPES as readonly string[]).includes(type);
}

/**
 * Normalize tone to known values
 */
function normalizeTone(
  sentiment: string
): "hostile" | "supportive" | "neutral" | "ambiguous" {
  const normalized = sentiment?.toLowerCase();
  switch (normalized) {
    case "hostile":
    case "negative":
    case "attacking":
      return "hostile";
    case "supportive":
    case "positive":
    case "endorsing":
      return "supportive";
    case "ambiguous":
    case "mixed":
    case "unclear":
      return "ambiguous";
    default:
      return "neutral";
  }
}

/**
 * Normalize intensity to known values
 */
function normalizeIntensity(
  intensity: string
): "low" | "medium" | "high" | "extreme" {
  const normalized = intensity?.toLowerCase();
  switch (normalized) {
    case "low":
    case "mild":
    case "weak":
      return "low";
    case "high":
    case "strong":
      return "high";
    case "extreme":
    case "severe":
    case "maximum":
      return "extreme";
    default:
      return "medium";
  }
}

/**
 * Get tone color for UI
 */
function getToneColor(
  tone: "hostile" | "supportive" | "neutral" | "ambiguous"
): string {
  const colorMap = {
    hostile: "#DC2626", // Red
    supportive: "#059669", // Green
    neutral: "#6B7280", // Gray
    ambiguous: "#F59E0B", // Amber
  };
  return colorMap[tone];
}

/**
 * Generate random position for layout
 */
function generateRandomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * 800 - 400,
    y: Math.random() * 600 - 300,
  };
}

/**
 * Build safe TYPE predicate for Cypher queries
 */
export function buildTypePredicate(relationshipTypes: string[]): string {
  // Filter to only allowed types for security
  const safeTypes = relationshipTypes.filter(isAllowedRelationshipType);

  if (safeTypes.length === 0) {
    return ""; // No filter if no valid types
  }

  return `AND type(r) IN [${safeTypes.map((t) => `'${t}'`).join(", ")}]`;
}

/**
 * Build safe entity type predicate
 */
export function buildEntityTypePredicate(entityTypes: string[]): string {
  // Capitalize and filter to allowed types
  const safeTypes = entityTypes
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .filter(isAllowedEntityType);

  if (safeTypes.length === 0) {
    return "";
  }

  return `AND labels(n)[0] IN [${safeTypes.map((t) => `'${t}'`).join(", ")}]`;
}

/**
 * Validate and clean query parameters
 */
export function sanitizeQueryParams(searchParams: URLSearchParams) {
  const nodeLimit = Math.min(
    Math.floor(parseInt(searchParams.get("nodeLimit") || "100")),
    1000
  );
  const edgeLimit = Math.min(
    Math.floor(parseInt(searchParams.get("edgeLimit") || "200")),
    2000
  );
  const hops = Math.min(
    Math.floor(parseInt(searchParams.get("hops") || "1")),
    2
  );

  return {
    nodeLimit,
    edgeLimit,
    hops,
    minActivity: Math.max(
      Math.floor(parseInt(searchParams.get("minActivity") || "1")),
      1
    ),
    sentiments:
      searchParams
        .get("sentiments")
        ?.split(",")
        .filter((s) =>
          ["hostile", "supportive", "neutral", "ambiguous"].includes(s)
        ) || undefined,
    entityTypes:
      searchParams
        .get("types")
        ?.split(",")
        .filter((s) =>
          ALLOWED_ENTITY_TYPES.map((t) => t.toLowerCase()).includes(
            s.toLowerCase()
          )
        ) || undefined,
    relationshipTypes:
      searchParams
        .get("relationshipTypes")
        ?.split(",")
        .filter((s) =>
          ALLOWED_RELATIONSHIP_TYPES.includes(s as AllowedRelationshipType)
        ) || undefined,
    fromDate: searchParams.get("from") || undefined, // No default date filter - include all relationships
    toDate: searchParams.get("to") || new Date().toISOString().split("T")[0],
  };
}
