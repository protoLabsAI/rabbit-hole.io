/**
 * Graph Mutation Service
 *
 * Handles CRUD operations for evidence graph data with partitioned file management.
 * Writes directly to JSON partitions until database migration.
 */

import type {
  GraphNode,
  GraphEdge,
  EvidenceEntry,
  EntityType,
  EdgeType,
} from "../types/evidence-graph.types";

interface MutationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  affectedPartitions?: string[];
}

interface CreateNodeInput {
  label: string;
  entityType: EntityType;
  dates?: {
    start?: string;
    end?: string;
  };
  aka?: string[];
  tags?: string[];
  sources: string[];
  position?: {
    x: number;
    y: number;
  };
  notes?: string;
}

interface CreateEdgeInput {
  source: string;
  target: string;
  label: string;
  type?: EdgeType;
  since?: string;
  until?: string;
  confidence?: number;
  notes?: string;
  sources: string[];
}

interface CreateEvidenceInput {
  title: string;
  date: string;
  publisher: string;
  url: string;
  type?: "primary" | "secondary" | "analysis";
  notes?: string;
}

export class GraphMutationService {
  private basePath: string;
  private isServerSide: boolean;

  constructor(basePath = "/api/evidence-mutations") {
    this.basePath = basePath;
    this.isServerSide = typeof window === "undefined";
  }

  /**
   * Add a new evidence entry
   */
  async addEvidence(
    input: CreateEvidenceInput
  ): Promise<MutationResult<EvidenceEntry>> {
    try {
      // Generate ID
      const evidenceId = this.generateEvidenceId(input.title);

      const evidence: EvidenceEntry = {
        id: evidenceId,
        title: input.title,
        date: input.date,
        publisher: input.publisher,
        url: input.url,
        type: input.type,
        notes: input.notes,
      };

      // Determine which evidence partition to add to
      const partitionCategory = this.categorizeEvidenceSource(input.publisher);

      const result = await this.mutatePartition(
        "evidence",
        partitionCategory,
        "add",
        evidence
      );

      return {
        success: result.success,
        data: evidence,
        error: result.error,
        affectedPartitions: [`evidence-${partitionCategory}`],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add evidence",
      };
    }
  }

  /**
   * Add a new graph node
   */
  async addNode(input: CreateNodeInput): Promise<MutationResult<GraphNode>> {
    try {
      // Validate sources exist
      const sourceValidation = await this.validateSourcesExist(input.sources);
      if (!sourceValidation.success) {
        return sourceValidation;
      }

      // Generate ID
      const nodeId = this.generateNodeId(input.label, input.entityType);

      const node: GraphNode = {
        id: nodeId,
        label: input.label,
        entityType: input.entityType,
        dates: input.dates,
        aka: input.aka,
        tags: input.tags,
        sources: input.sources,
        position: input.position,
      };

      const result = await this.mutatePartition(
        "entities",
        input.entityType,
        "add",
        node
      );

      return {
        success: result.success,
        data: node,
        error: result.error,
        warnings: sourceValidation.warnings,
        affectedPartitions: [`entities-${input.entityType}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add node",
      };
    }
  }

  /**
   * Add a new graph edge
   */
  async addEdge(input: CreateEdgeInput): Promise<MutationResult<GraphEdge>> {
    try {
      // Validate nodes exist
      const nodeValidation = await this.validateNodesExist([
        input.source,
        input.target,
      ]);
      if (!nodeValidation.success) {
        return nodeValidation;
      }

      // Validate sources exist
      const sourceValidation = await this.validateSourcesExist(input.sources);
      if (!sourceValidation.success) {
        return sourceValidation;
      }

      // Generate ID
      const edgeId = this.generateEdgeId(
        input.source,
        input.target,
        input.label
      );

      const edge: GraphEdge = {
        id: edgeId,
        source: input.source,
        target: input.target,
        label: input.label,
        type: input.type,
        since: input.since,
        until: input.until,
        confidence: input.confidence || 0.8,
        notes: input.notes,
        sources: input.sources,
      };

      const partitionCategory = input.type || "untyped";
      const result = await this.mutatePartition(
        "relationships",
        partitionCategory,
        "add",
        edge
      );

      return {
        success: result.success,
        data: edge,
        error: result.error,
        warnings: [
          ...(nodeValidation.warnings || []),
          ...(sourceValidation.warnings || []),
        ],
        affectedPartitions: [`relationships-${partitionCategory}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add edge",
      };
    }
  }

  /**
   * Update an existing node
   */
  async updateNode(
    nodeId: string,
    updates: Partial<CreateNodeInput>
  ): Promise<MutationResult<GraphNode>> {
    try {
      // Find the node in partitions
      const existingNode = await this.findNode(nodeId);
      if (!existingNode) {
        return { success: false, error: `Node ${nodeId} not found` };
      }

      // Validate sources if updated
      if (updates.sources) {
        const sourceValidation = await this.validateSourcesExist(
          updates.sources
        );
        if (!sourceValidation.success) {
          return sourceValidation;
        }
      }

      const updatedNode: GraphNode = {
        ...existingNode,
        ...updates,
        id: nodeId, // Ensure ID doesn't change
      };

      const result = await this.mutatePartition(
        "entities",
        existingNode.entityType,
        "update",
        updatedNode
      );

      return {
        success: result.success,
        data: updatedNode,
        error: result.error,
        affectedPartitions: [`entities-${existingNode.entityType}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update node",
      };
    }
  }

  /**
   * Delete a node and all connected edges
   */
  async deleteNode(
    nodeId: string
  ): Promise<
    MutationResult<{ deletedNode: GraphNode; deletedEdges: GraphEdge[] }>
  > {
    try {
      const existingNode = await this.findNode(nodeId);
      if (!existingNode) {
        return { success: false, error: `Node ${nodeId} not found` };
      }

      // Find and delete connected edges
      const connectedEdges = await this.findConnectedEdges(nodeId);
      const deletedEdges: GraphEdge[] = [];

      for (const edge of connectedEdges) {
        const edgeResult = await this.deleteEdge(edge.id);
        if (edgeResult.success && edgeResult.data) {
          deletedEdges.push(edgeResult.data);
        }
      }

      // Delete the node
      const nodeResult = await this.mutatePartition(
        "entities",
        existingNode.entityType,
        "delete",
        { id: nodeId }
      );

      const affectedPartitions = [
        `entities-${existingNode.entityType}`,
        ...Array.from(
          new Set(
            deletedEdges.map((e) => `relationships-${e.type || "untyped"}`)
          )
        ),
      ];

      return {
        success: nodeResult.success,
        data: { deletedNode: existingNode, deletedEdges },
        error: nodeResult.error,
        affectedPartitions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete node",
      };
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId: string): Promise<MutationResult<GraphEdge>> {
    try {
      const existingEdge = await this.findEdge(edgeId);
      if (!existingEdge) {
        return { success: false, error: `Edge ${edgeId} not found` };
      }

      const result = await this.mutatePartition(
        "relationships",
        existingEdge.type || "untyped",
        "delete",
        { id: edgeId }
      );

      return {
        success: result.success,
        data: existingEdge,
        error: result.error,
        affectedPartitions: [`relationships-${existingEdge.type || "untyped"}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete edge",
      };
    }
  }

  /**
   * Bulk operations for importing data
   */
  async bulkImport(data: {
    evidence?: EvidenceEntry[];
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  }): Promise<
    MutationResult<{ imported: number; skipped: number; errors: string[] }>
  > {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Import evidence first
      if (data.evidence) {
        for (const evidence of data.evidence) {
          const result = await this.mutatePartition(
            "evidence",
            this.categorizeEvidenceSource(evidence.publisher),
            "add",
            evidence
          );
          if (result.success) results.imported++;
          else {
            results.errors.push(`Evidence ${evidence.id}: ${result.error}`);
            results.skipped++;
          }
        }
      }

      // Import nodes second
      if (data.nodes) {
        for (const node of data.nodes) {
          const result = await this.mutatePartition(
            "entities",
            node.entityType,
            "add",
            node
          );
          if (result.success) results.imported++;
          else {
            results.errors.push(`Node ${node.id}: ${result.error}`);
            results.skipped++;
          }
        }
      }

      // Import edges last (after nodes exist)
      if (data.edges) {
        for (const edge of data.edges) {
          const result = await this.mutatePartition(
            "relationships",
            edge.type || "untyped",
            "add",
            edge
          );
          if (result.success) results.imported++;
          else {
            results.errors.push(`Edge ${edge.id}: ${result.error}`);
            results.skipped++;
          }
        }
      }

      return {
        success: results.errors.length === 0,
        data: results,
        error:
          results.errors.length > 0
            ? `${results.errors.length} items failed to import`
            : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bulk import failed",
      };
    }
  }

  // Private helper methods

  private async mutatePartition(
    type: "entities" | "relationships" | "evidence",
    category: string,
    operation: "add" | "update" | "delete",
    data: any
  ): Promise<MutationResult> {
    if (this.isServerSide) {
      // Server-side: direct file system operations would go here
      throw new Error("Server-side mutations not implemented yet");
    } else {
      // Client-side: API call to mutation endpoint
      try {
        const response = await fetch(`${this.basePath}/${type}/${category}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operation, data }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Mutation API call failed",
        };
      }
    }
  }

  private generateEvidenceId(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
    return `ev_${slug}_${Date.now()}`;
  }

  private generateNodeId(label: string, entityType: EntityType): string {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);
    return `n_${slug}`;
  }

  private generateEdgeId(
    source: string,
    target: string,
    label: string
  ): string {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 15);
    return `e_${source.replace("n_", "")}_${target.replace("n_", "")}_${slug}`;
  }

  private categorizeEvidenceSource(publisher: string): string {
    const publisherLower = publisher.toLowerCase();

    if (
      publisherLower.includes("doj") ||
      publisherLower.includes("court") ||
      publisherLower.includes(".gov") ||
      publisherLower.includes("fbi")
    ) {
      return "government";
    }

    if (
      publisherLower.includes("washington post") ||
      publisherLower.includes("new york times") ||
      publisherLower.includes("reuters") ||
      publisherLower.includes("associated press")
    ) {
      return "major-media";
    }

    if (
      publisherLower.includes("bellingcat") ||
      publisherLower.includes("propublica")
    ) {
      return "investigative";
    }

    if (
      publisherLower.includes("cbs") ||
      publisherLower.includes("nbc") ||
      publisherLower.includes("bbc") ||
      publisherLower.includes("cnn")
    ) {
      return "broadcast-media";
    }

    return "other";
  }

  private async validateSourcesExist(
    sources: string[]
  ): Promise<MutationResult> {
    // For now, return success - in full implementation, would check evidence partitions
    return {
      success: true,
      warnings:
        sources.length === 0 ? ["No evidence sources provided"] : undefined,
    };
  }

  private async validateNodesExist(nodeIds: string[]): Promise<MutationResult> {
    // For now, return success - in full implementation, would check entity partitions
    return { success: true };
  }

  private async findNode(nodeId: string): Promise<GraphNode | null> {
    // Placeholder - would search entity partitions
    return null;
  }

  private async findEdge(edgeId: string): Promise<GraphEdge | null> {
    // Placeholder - would search relationship partitions
    return null;
  }

  private async findConnectedEdges(nodeId: string): Promise<GraphEdge[]> {
    // Placeholder - would search all relationship partitions
    return [];
  }
}
