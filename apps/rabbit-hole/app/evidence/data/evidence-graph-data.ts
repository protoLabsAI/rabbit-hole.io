// Import the evidence graph data from the docs directory with positions
// import evidenceGraphJson from "../../../docs/evidence-graphs/evidence_graph_positions.json";
// Import strongly typed interfaces
import {
  EvidenceGraphData,
  EvidenceEntry,
  GraphNode,
  GraphEdge,
  EntityType,
  EdgeType,
  EvidenceType,
  ValidationResult,
  isEvidenceGraphData,
} from "../types/evidence-graph.types";

// Re-export types for convenience
export type {
  EvidenceGraphData,
  EvidenceEntry,
  GraphNode,
  GraphEdge,
  EntityType,
  EdgeType,
  EvidenceType,
  ValidationResult,
};

export { isEvidenceGraphData };

/**
 * Validate and cast the imported JSON data to the strongly typed interface
 */
function validateEvidenceGraphData(data: unknown): EvidenceGraphData {
  if (!isEvidenceGraphData(data)) {
    throw new Error("Invalid evidence graph data structure");
  }

  // Additional runtime validation could be added here
  console.log(
    `📊 Loaded evidence graph v${data.meta.version} with ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.evidence.length} evidence entries`
  );

  return data;
}

/**
 * Strongly typed evidence graph data with runtime validation
 */
export const evidenceGraphData: EvidenceGraphData = {
  nodes: [],
  edges: [],
  evidence: [],
  meta: {
    generated_at: new Date().toISOString(),
    version: "1.0",
    description: "Empty placeholder data",
  },
};
