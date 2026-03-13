/**
 * Graph Data Validation Utility
 *
 * Validates test data against @proto/types schemas and transforms
 * to CanonicalGraphData format for graph visualization.
 */

import { z } from "zod";

import { normalizeEntityType } from "@proto/types";

// Basic entity schema for validation (simplified version for graph visualizer)
const EntitySchema = z.object({
  uid: z.string().min(1, "Entity UID is required"),
  type: z.string(),
  name: z.string().min(1, "Entity name is required"),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  properties: z.record(z.string(), z.any()).optional(),
  // Universal properties
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  created_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  destroyed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z
    .enum([
      "active",
      "inactive",
      "historical",
      "theoretical",
      "fictional",
      "planned",
      "under_construction",
      "defunct",
      "unknown",
    ])
    .optional(),
});
import type {
  CanonicalGraphData,
  CanonicalNode,
  CanonicalEdge,
  CanonicalMetadata,
  SentimentType,
} from "../../types/canonical-graph";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface TestDataFormat {
  entities?: any[];
  relationships?: any[];
  nodes?: any[];
  edges?: any[];
  meta?: any;
  metadata?: any;
}

/**
 * Validate raw test data against entity schemas
 */
export function validateTestData(
  rawData: TestDataFormat
): ValidationResult<TestDataFormat> {
  const errors: string[] = [];

  try {
    // Handle different test data formats
    const entities = rawData.entities || rawData.nodes || [];
    const relationships = rawData.relationships || rawData.edges || [];

    // Validate entities
    if (entities.length > 0) {
      entities.forEach((entity: any, index: number) => {
        try {
          // Use base entity schema for validation
          EntitySchema.parse(entity);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              `Entity ${index}: ${error.issues.map((e) => e.message).join(", ")}`
            );
          } else {
            errors.push(`Entity ${index}: Validation failed`);
          }
        }
      });
    }

    // Basic relationship validation
    if (relationships.length > 0) {
      relationships.forEach((rel: any, index: number) => {
        if (!rel.source || !rel.target) {
          errors.push(`Relationship ${index}: Missing source or target`);
        }
        if (!rel.type && !rel.label) {
          errors.push(`Relationship ${index}: Missing type or label`);
        }
      });
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? rawData : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

/**
 * Transform validated test data to CanonicalGraphData format
 */
export function transformToCanonicalFormat(
  testData: TestDataFormat,
  options: {
    sourceFormat?: "test" | "atlas" | "evidence";
    viewMode?: string;
  } = {}
): ValidationResult<CanonicalGraphData> {
  const { sourceFormat = "test", viewMode = "full-atlas" } = options;

  try {
    const entities = testData.entities || testData.nodes || [];
    const relationships = testData.relationships || testData.edges || [];

    // Transform entities to canonical nodes
    const nodes: CanonicalNode[] = entities.map((entity: any) => ({
      uid: entity.uid || entity.id,
      name: entity.name || entity.label,
      type: normalizeEntityType(entity.type),
      display: {
        title: entity.name || entity.label,
        subtitle: entity.type || "Entity",
        avatar: entity.avatar,
        badges: entity.tags?.slice(0, 4) || entity.aliases?.slice(0, 4),
      },
      metrics: entity.metrics,
      metadata: {
        aliases: entity.aliases,
        tags: entity.tags,
        dates: entity.dates || {
          start: entity.created_date || entity.active_from_date,
          end: entity.destroyed_date || entity.active_to_date,
        },
        sources: entity.sources,
        communityId: entity.communityId,
        position:
          entity.position ||
          (entity.latitude && entity.longitude
            ? {
                x: entity.longitude,
                y: entity.latitude,
              }
            : undefined),
        confidence: entity.confidence || 0.8,
        ...entity.properties, // Include any additional properties
      },
    }));

    // Transform relationships to canonical edges
    const edges: CanonicalEdge[] = relationships.map((rel: any) => ({
      uid: rel.uid || rel.id || `${rel.source}-${rel.target}`,
      source: rel.source,
      target: rel.target,
      type: rel.type || "RELATED_TO",
      sentiment: normalizeSentiment(rel.sentiment || rel.tone),
      intensity: "medium" as const,
      display: {
        label: rel.label || rel.type || "Related",
        excerpt: rel.excerpt?.slice(0, 50),
        color: getSentimentColor(normalizeSentiment(rel.sentiment || rel.tone)),
        timestamp: rel.timestamp || rel.at,
      },
      metadata: {
        confidence: rel.confidence || 0.8,
        sources: rel.sources,
        notes: rel.notes,
        category: rel.category,
        ...rel.properties, // Include any additional properties
      },
    }));

    // Create metadata
    const meta: CanonicalMetadata = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      generatedAt: testData.meta?.generatedAt || new Date().toISOString(),
      schemaVersion: "canonical-v1",
      viewMode: viewMode as any,
      bounded: testData.meta?.bounded || false,
      filters: testData.meta?.filters,
    };

    const canonicalData: CanonicalGraphData = {
      nodes,
      edges,
      meta,
    };

    // Validate the canonical format
    const validation = validateCanonicalData(canonicalData);

    return validation;
  } catch (error) {
    return {
      success: false,
      errors: [
        `Transformation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

/**
 * Validate canonical graph data for consistency
 */
export function validateCanonicalData(
  data: CanonicalGraphData
): ValidationResult<CanonicalGraphData> {
  const errors: string[] = [];

  // Check for orphaned edges
  const nodeIds = new Set(data.nodes.map((n) => n.uid));
  data.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.uid}: Source node ${edge.source} not found`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.uid}: Target node ${edge.target} not found`);
    }
  });

  // Check for duplicate node IDs
  const seenNodeIds = new Set<string>();
  data.nodes.forEach((node) => {
    if (seenNodeIds.has(node.uid)) {
      errors.push(`Duplicate node ID: ${node.uid}`);
    }
    seenNodeIds.add(node.uid);
  });

  // Check for duplicate edge IDs
  const seenEdgeIds = new Set<string>();
  data.edges.forEach((edge) => {
    if (seenEdgeIds.has(edge.uid)) {
      errors.push(`Duplicate edge ID: ${edge.uid}`);
    }
    seenEdgeIds.add(edge.uid);
  });

  // Validate metadata consistency
  if (data.meta.nodeCount !== data.nodes.length) {
    errors.push(
      `Metadata node count mismatch: expected ${data.meta.nodeCount}, got ${data.nodes.length}`
    );
  }
  if (data.meta.edgeCount !== data.edges.length) {
    errors.push(
      `Metadata edge count mismatch: expected ${data.meta.edgeCount}, got ${data.edges.length}`
    );
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Load and validate test data from JSON
 */
export async function validateGraphData(
  jsonData: any,
  options: {
    sourceFormat?: "test" | "atlas" | "evidence";
    viewMode?: string;
  } = {}
): Promise<ValidationResult<CanonicalGraphData>> {
  // Step 1: Validate raw test data format
  const rawValidation = validateTestData(jsonData);
  if (!rawValidation.success) {
    return {
      success: false,
      errors: [
        `Raw data validation failed: ${rawValidation.errors?.join(", ")}`,
      ],
    };
  }

  // Step 2: Transform to canonical format
  const transformation = transformToCanonicalFormat(jsonData, options);
  if (!transformation.success) {
    return transformation;
  }

  return transformation;
}

// Helper functions
// Note: normalizeEntityType is now imported from the centralized types package

function normalizeSentiment(sentiment?: string): SentimentType {
  if (!sentiment) return "neutral";

  const normalized = sentiment.toLowerCase();
  switch (normalized) {
    case "hostile":
    case "negative":
    case "attack":
      return "hostile";
    case "supportive":
    case "positive":
    case "endorsement":
      return "supportive";
    case "ambiguous":
    case "mixed":
      return "ambiguous";
    default:
      return "neutral";
  }
}

function getSentimentColor(sentiment: SentimentType): string {
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
