/**
 * Knowledge Graph Context Utilities
 *
 * Helper functions to fetch current graph entities and relationships
 * for providing context to AI agents.
 */

import { PersonEntity, Relationship } from "@proto/types";

export interface KnowledgeGraphContext {
  personEntities: PersonEntity[];
  relationships: Relationship[];
  totalNodes: number;
  totalEdges: number;
}

/**
 * Fetches current knowledge graph context for AI agents
 */
interface ApiResponse {
  success: boolean;
  data: {
    nodes: any[];
    edges: any[];
    meta: any;
  };
}

export async function getKnowledgeGraphContext(): Promise<KnowledgeGraphContext> {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/atlas-v2`
    );
    const data = (await response.json()) as ApiResponse;

    if (!data.success) {
      throw new Error("Failed to fetch knowledge graph data");
    }

    const { nodes, edges, meta } = data.data;

    // Extract person entities
    const personEntities: PersonEntity[] = nodes
      .filter((node: any) => node.entityType === "person")
      .map((node: any) => ({
        uid: node.id,
        name: node.label,
        type: "Person" as const,
        tags: node.tags,
        id: node.id, // Legacy field for compatibility
        // Additional fields would be populated from full entity data
      }));

    // Extract relationships
    const relationships: Relationship[] = edges.map((edge: any) => ({
      uid: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      confidence: edge.confidence || 0.8,
    }));

    return {
      personEntities,
      relationships,
      totalNodes: meta.nodeCount,
      totalEdges: meta.edgeCount,
    };
  } catch (error) {
    console.error("Failed to fetch knowledge graph context:", error);
    return {
      personEntities: [],
      relationships: [],
      totalNodes: 0,
      totalEdges: 0,
    };
  }
}

/**
 * Gets just the person entity names for relationship discovery
 */
export async function getPersonEntityNames(): Promise<string[]> {
  const context = await getKnowledgeGraphContext();
  return context.personEntities.map((entity) => entity.name);
}

/**
 * Formats knowledge graph context for AI agent prompts
 */
export function formatKnowledgeGraphContext(
  context: KnowledgeGraphContext
): string {
  const personNames = context.personEntities.map((p) => p.name).slice(0, 20);
  const relationshipSample = context.relationships.slice(0, 10);

  return `**Current Knowledge Graph:**
- **${context.totalNodes} total entities** (${
    context.personEntities.length
  } people)
- **${context.totalEdges} relationships**

**Key People (${personNames.length}/${context.personEntities.length}):**
${personNames.join(", ")}

**Sample Relationships:**
${relationshipSample
  .map((rel) => `- ${rel.source} → ${rel.target} (${rel.type})`)
  .join("\n")}`;
}

/**
 * Creates a research request with full knowledge graph context
 */
export async function createPersonResearchRequest(
  targetPersonName: string,
  options: {
    researchDepth?: "basic" | "detailed" | "comprehensive";
    focusAreas?: string[];
  } = {}
) {
  const context = await getKnowledgeGraphContext();

  return {
    targetPersonName,
    existingPersonEntities: context.personEntities,
    existingRelationships: context.relationships,
    researchDepth: options.researchDepth || "detailed",
    focusAreas: options.focusAreas || [
      "biographical",
      "political",
      "business",
      "relationships",
    ],
  };
}
