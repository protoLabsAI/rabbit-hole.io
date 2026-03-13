/**
 * Comprehensive validation utilities for evidence graph data
 */

import type {
  EvidenceGraphData,
  ValidationResult,
  EntityType,
  GraphNode,
  GraphEdge,
  EvidenceEntry,
} from "../types/evidence-graph.types";
import { isEntityType, isEdgeType } from "../types/evidence-graph.types";

/**
 * Validates evidence graph data and returns detailed results
 */
export function validateEvidenceGraph(
  data: EvidenceGraphData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate meta
  if (!data.meta?.version) errors.push("Meta version is required");
  if (!data.meta?.generated_at) errors.push("Meta generated_at is required");
  if (!data.meta?.description) errors.push("Meta description is required");

  // Validate evidence entries
  const evidenceIds = new Set<string>();
  data.evidence.forEach((evidence, index) => {
    validateEvidenceEntry(evidence, index, errors, warnings, evidenceIds);
  });

  // Validate nodes
  const nodeIds = new Set<string>();
  data.nodes.forEach((node, index) => {
    validateGraphNode(node, index, errors, warnings, nodeIds, evidenceIds);
  });

  // Validate edges
  data.edges.forEach((edge, index) => {
    validateGraphEdge(edge, index, errors, warnings, nodeIds, evidenceIds);
  });

  // Generate statistics
  const stats = generateStats(data);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Validates a single evidence entry
 */
function validateEvidenceEntry(
  evidence: EvidenceEntry,
  index: number,
  errors: string[],
  warnings: string[],
  evidenceIds: Set<string>
) {
  const prefix = `Evidence[${index}]`;

  // Required fields
  if (!evidence.id) errors.push(`${prefix}: id is required`);
  if (!evidence.title) errors.push(`${prefix}: title is required`);
  if (!evidence.date) errors.push(`${prefix}: date is required`);
  if (!evidence.publisher) errors.push(`${prefix}: publisher is required`);
  if (!evidence.url) errors.push(`${prefix}: url is required`);

  // ID format validation
  if (evidence.id && !evidence.id.startsWith("ev_")) {
    warnings.push(`${prefix}: id should start with 'ev_' prefix`);
  }

  // Duplicate ID check
  if (evidence.id) {
    if (evidenceIds.has(evidence.id)) {
      errors.push(`${prefix}: duplicate evidence ID '${evidence.id}'`);
    }
    evidenceIds.add(evidence.id);
  }

  // Date format validation
  if (evidence.date && !isValidDate(evidence.date)) {
    warnings.push(
      `${prefix}: date '${evidence.date}' may not be in ISO format`
    );
  }

  // URL validation
  if (evidence.url && !isValidUrl(evidence.url)) {
    warnings.push(`${prefix}: URL '${evidence.url}' may not be valid`);
  }
}

/**
 * Validates a single graph node
 */
function validateGraphNode(
  node: GraphNode,
  index: number,
  errors: string[],
  warnings: string[],
  nodeIds: Set<string>,
  evidenceIds: Set<string>
) {
  const prefix = `Node[${index}]`;

  // Required fields
  if (!node.id) errors.push(`${prefix}: id is required`);
  if (!node.label) errors.push(`${prefix}: label is required`);
  if (!node.entityType) errors.push(`${prefix}: entityType is required`);
  if (!node.sources || node.sources.length === 0) {
    errors.push(`${prefix}: at least one source is required`);
  }

  // ID format validation
  if (node.id && !node.id.startsWith("n_")) {
    warnings.push(`${prefix}: id should start with 'n_' prefix`);
  }

  // Duplicate ID check
  if (node.id) {
    if (nodeIds.has(node.id)) {
      errors.push(`${prefix}: duplicate node ID '${node.id}'`);
    }
    nodeIds.add(node.id);
  }

  // Entity type validation
  if (node.entityType && !isEntityType(node.entityType)) {
    errors.push(`${prefix}: invalid entityType '${node.entityType}'`);
  }

  // Sources validation
  if (node.sources) {
    node.sources.forEach((sourceId, sourceIndex) => {
      if (!evidenceIds.has(sourceId)) {
        errors.push(
          `${prefix}.sources[${sourceIndex}]: references non-existent evidence '${sourceId}'`
        );
      }
    });
  }

  // Date validation
  if (node.dates) {
    if (node.dates.start && !isValidDate(node.dates.start)) {
      warnings.push(
        `${prefix}: start date '${node.dates.start}' may not be in ISO format`
      );
    }
    if (node.dates.end && !isValidDate(node.dates.end)) {
      warnings.push(
        `${prefix}: end date '${node.dates.end}' may not be in ISO format`
      );
    }
  }

  // Position validation
  if (node.position) {
    if (
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      errors.push(`${prefix}: position must have numeric x and y coordinates`);
    }
  }
}

/**
 * Validates a single graph edge
 */
function validateGraphEdge(
  edge: GraphEdge,
  index: number,
  errors: string[],
  warnings: string[],
  nodeIds: Set<string>,
  evidenceIds: Set<string>
) {
  const prefix = `Edge[${index}]`;

  // Required fields
  if (!edge.id) errors.push(`${prefix}: id is required`);
  if (!edge.source) errors.push(`${prefix}: source is required`);
  if (!edge.target) errors.push(`${prefix}: target is required`);
  if (!edge.label) errors.push(`${prefix}: label is required`);
  if (!edge.sources || edge.sources.length === 0) {
    errors.push(`${prefix}: at least one source is required`);
  }

  // ID format validation
  if (edge.id && !edge.id.startsWith("e_")) {
    warnings.push(`${prefix}: id should start with 'e_' prefix`);
  }

  // Node reference validation
  if (edge.source && !nodeIds.has(edge.source)) {
    errors.push(
      `${prefix}: references non-existent source node '${edge.source}'`
    );
  }
  if (edge.target && !nodeIds.has(edge.target)) {
    errors.push(
      `${prefix}: references non-existent target node '${edge.target}'`
    );
  }

  // Self-loop check
  if (edge.source === edge.target) {
    warnings.push(`${prefix}: edge connects node to itself`);
  }

  // Sources validation
  if (edge.sources) {
    edge.sources.forEach((sourceId, sourceIndex) => {
      if (!evidenceIds.has(sourceId)) {
        errors.push(
          `${prefix}.sources[${sourceIndex}]: references non-existent evidence '${sourceId}'`
        );
      }
    });
  }

  // Confidence validation
  if (edge.confidence !== undefined) {
    if (
      typeof edge.confidence !== "number" ||
      edge.confidence < 0 ||
      edge.confidence > 1
    ) {
      errors.push(`${prefix}: confidence must be a number between 0 and 1`);
    }
    if (edge.confidence < 0.3) {
      warnings.push(
        `${prefix}: very low confidence (${edge.confidence}), consider removing`
      );
    }
  }

  // Edge type validation
  if (edge.type && !isEdgeType(edge.type)) {
    warnings.push(`${prefix}: unrecognized edge type '${edge.type}'`);
  }

  // Date validation
  if (edge.since && !isValidDate(edge.since)) {
    warnings.push(
      `${prefix}: since date '${edge.since}' may not be in ISO format`
    );
  }
  if (edge.until && !isValidDate(edge.until)) {
    warnings.push(
      `${prefix}: until date '${edge.until}' may not be in ISO format`
    );
  }
}

/**
 * Generates statistics about the evidence graph
 */
function generateStats(data: EvidenceGraphData) {
  const entityTypeBreakdown = data.nodes.reduce(
    (acc, node) => {
      acc[node.entityType] = (acc[node.entityType] || 0) + 1;
      return acc;
    },
    {} as Record<EntityType, number>
  );

  const edgeTypeBreakdown = data.edges.reduce(
    (acc, edge) => {
      const type = edge.type || "untyped";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    evidenceCount: data.evidence.length,
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    entityTypeBreakdown,
    edgeTypeBreakdown,
  };
}

/**
 * Validates date string format (ISO-8601 compatible)
 */
function isValidDate(dateString: string): boolean {
  // Accept YYYY, YYYY-MM, or YYYY-MM-DD formats
  const dateRegex = /^\d{4}(-\d{2}(-\d{2})?)?$/;
  return dateRegex.test(dateString);
}

/**
 * Validates URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}
