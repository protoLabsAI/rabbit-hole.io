/**
 * Partitioned Graph Loader Service
 *
 * Handles loading and combining evidence graph data from multiple partitioned files.
 * Provides caching, lazy loading, and topic-based graph assembly.
 */

import type {
  EvidenceGraphData,
  GraphNode,
  GraphEdge,
  EvidenceEntry,
  EntityType,
  EdgeType,
} from "../types/evidence-graph.types";

// Partition interface matching the script output
interface GraphPartition<T = any> {
  id: string;
  type: "entities" | "relationships" | "evidence" | "layout";
  category: string;
  version: string;
  description: string;
  itemCount: number;
  data: T[];
  dependencies?: string[];
}

interface PartitionManifest {
  version: string;
  generated_at: string;
  totalNodes: number;
  totalEdges: number;
  totalEvidence: number;
  partitions: Array<{
    id: string;
    path: string;
    type: string;
    category: string;
    itemCount: number;
    description: string;
  }>;
}

interface LoadOptions {
  /** Entity types to include */
  entityTypes?: EntityType[];
  /** Edge types to include */
  edgeTypes?: EdgeType[];
  /** Specific node IDs to include (with connections) */
  focusNodes?: string[];
  /** Include nodes within N degrees of focus nodes */
  expandRadius?: number;
  /** Maximum nodes to return (for performance) */
  maxNodes?: number;
  /** Whether to include evidence entries */
  includeEvidence?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class PartitionedGraphLoader {
  private cache = new Map<string, CacheEntry<GraphPartition>>();
  private manifest: PartitionManifest | null = null;
  private basePath: string;
  private cacheTimeout = 1000 * 60 * 10; // 10 minutes

  constructor(basePath = "/evidence-graphs/partitioned") {
    this.basePath = basePath;
  }

  /**
   * Initialize the loader by fetching the partition manifest
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.basePath}/manifest.json`);
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`);
      }
      const manifest = (await response.json()) as PartitionManifest;
      this.manifest = manifest;
      console.log(
        `Loaded partition manifest v${manifest.version} with ${manifest.partitions.length} partitions`
      );
    } catch (error) {
      console.warn(
        "Failed to load partitioned data, falling back to monolithic file"
      );
      throw error;
    }
  }

  /**
   * Load a specific partition by ID
   */
  async loadPartition<T>(partitionId: string): Promise<GraphPartition<T>> {
    // Check cache first
    const cacheEntry = this.cache.get(partitionId);
    if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
      return cacheEntry.data as GraphPartition<T>;
    }

    if (!this.manifest) {
      await this.initialize();
    }

    const partitionInfo = this.manifest!.partitions.find(
      (p) => p.id === partitionId
    );
    if (!partitionInfo) {
      throw new Error(`Partition '${partitionId}' not found`);
    }

    try {
      const response = await fetch(`${this.basePath}/${partitionInfo.path}`);
      if (!response.ok) {
        throw new Error(
          `Failed to load partition ${partitionId}: ${response.statusText}`
        );
      }

      const partition = (await response.json()) as GraphPartition<T>;

      // Cache the result
      this.cache.set(partitionId, {
        data: partition,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.cacheTimeout,
      });

      console.log(
        `📦 Loaded partition '${partitionId}' (${partition.itemCount} items)`
      );
      return partition;
    } catch (error) {
      console.error(`❌ Failed to load partition '${partitionId}':`, error);
      throw error;
    }
  }

  /**
   * Load all partitions of a specific type
   */
  async loadPartitionsByType(type: string): Promise<GraphPartition[]> {
    if (!this.manifest) {
      await this.initialize();
    }

    const relevantPartitions = this.manifest!.partitions.filter(
      (p) => p.type === type
    );
    const partitions = await Promise.all(
      relevantPartitions.map((p) => this.loadPartition(p.id))
    );

    return partitions;
  }

  /**
   * Load a complete evidence graph based on options
   */
  async loadGraph(options: LoadOptions = {}): Promise<EvidenceGraphData> {
    const {
      entityTypes,
      edgeTypes,
      focusNodes,
      expandRadius = 2,
      maxNodes = 1000,
      includeEvidence = true,
    } = options;

    console.log("🔄 Loading partitioned graph with options:", options);

    let allNodes: GraphNode[] = [];
    let allEdges: GraphEdge[] = [];
    const allEvidence: EvidenceEntry[] = [];

    // Load entity partitions
    if (entityTypes && entityTypes.length > 0) {
      for (const entityType of entityTypes) {
        try {
          const partition = await this.loadPartition<GraphNode>(
            `entities-${entityType}`
          );
          allNodes.push(...partition.data);
        } catch (error) {
          console.warn(`⚠️  Failed to load ${entityType} entities:`, error);
        }
      }
    } else {
      // Load all entity types
      const entityPartitions = await this.loadPartitionsByType("entities");
      entityPartitions.forEach((partition) => {
        allNodes.push(...partition.data);
      });
    }

    // Load relationship partitions
    if (edgeTypes && edgeTypes.length > 0) {
      for (const edgeType of edgeTypes) {
        try {
          const partition = await this.loadPartition<GraphEdge>(
            `relationships-${edgeType}`
          );
          allEdges.push(...partition.data);
        } catch (error) {
          console.warn(`⚠️  Failed to load ${edgeType} relationships:`, error);
        }
      }
    } else {
      // Load all relationship types
      const edgePartitions = await this.loadPartitionsByType("relationships");
      edgePartitions.forEach((partition) => {
        allEdges.push(...partition.data);
      });
    }

    // Focus on specific nodes if requested
    if (focusNodes && focusNodes.length > 0) {
      const focusedResult = this.expandFromFocusNodes(
        allNodes,
        allEdges,
        focusNodes,
        expandRadius
      );
      allNodes = focusedResult.nodes;
      allEdges = focusedResult.edges;
    }

    // Limit nodes for performance
    if (allNodes.length > maxNodes) {
      console.warn(
        `⚠️  Limiting nodes from ${allNodes.length} to ${maxNodes} for performance`
      );
      allNodes = allNodes.slice(0, maxNodes);

      // Filter edges to only include those between remaining nodes
      const nodeIds = new Set(allNodes.map((n) => n.id));
      allEdges = allEdges.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }

    // Load evidence if requested
    if (includeEvidence) {
      // Determine which evidence is needed based on nodes and edges
      const evidenceIds = new Set<string>();
      allNodes.forEach((node) =>
        node.sources.forEach((id) => evidenceIds.add(id))
      );
      allEdges.forEach((edge) =>
        edge.sources.forEach((id) => evidenceIds.add(id))
      );

      // Load relevant evidence partitions
      const evidencePartitions = await this.loadPartitionsByType("evidence");
      evidencePartitions.forEach((partition) => {
        const relevantEvidence = partition.data.filter((e) =>
          evidenceIds.has(e.id)
        );
        allEvidence.push(...relevantEvidence);
      });
    }

    // Construct final graph data
    const graphData: EvidenceGraphData = {
      meta: {
        version: this.manifest?.version || "0.0.0",
        generated_at: new Date().toISOString(),
        description: `Dynamically loaded graph: ${allNodes.length} nodes, ${allEdges.length} edges, ${allEvidence.length} evidence`,
      },
      evidence: allEvidence,
      nodes: allNodes,
      edges: allEdges,
    };

    console.log(
      `✅ Assembled graph: ${allNodes.length} nodes, ${allEdges.length} edges, ${allEvidence.length} evidence`
    );

    return graphData;
  }

  /**
   * Load a pre-defined topic subgraph
   */
  async loadTopic(topicId: string): Promise<EvidenceGraphData> {
    try {
      const partition = await this.loadPartition<{
        nodes: GraphNode[];
        edges: GraphEdge[];
      }>(`topic-${topicId}`);
      const subgraph = partition.data[0];

      // Load evidence for the topic
      const evidenceIds = new Set<string>();
      subgraph.nodes.forEach((node) =>
        node.sources.forEach((id) => evidenceIds.add(id))
      );
      subgraph.edges.forEach((edge) =>
        edge.sources.forEach((id) => evidenceIds.add(id))
      );

      const allEvidence: EvidenceEntry[] = [];
      const evidencePartitions = await this.loadPartitionsByType("evidence");
      evidencePartitions.forEach((partition) => {
        const relevantEvidence = partition.data.filter((e) =>
          evidenceIds.has(e.id)
        );
        allEvidence.push(...relevantEvidence);
      });

      return {
        meta: {
          version: partition.version,
          generated_at: new Date().toISOString(),
          description: `${partition.description} (${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges)`,
        },
        evidence: allEvidence,
        nodes: subgraph.nodes,
        edges: subgraph.edges,
      };
    } catch (error) {
      console.error(`❌ Failed to load topic '${topicId}':`, error);
      throw error;
    }
  }

  /**
   * Get available topics
   */
  async getAvailableTopics(): Promise<
    Array<{ id: string; description: string; itemCount: number }>
  > {
    if (!this.manifest) {
      await this.initialize();
    }

    return this.manifest!.partitions.filter(
      (p) => p.type === "layout" && p.category === "topic-cluster"
    ).map((p) => ({
      id: p.id.replace("topic-", ""),
      description: p.description,
      itemCount: p.itemCount,
    }));
  }

  /**
   * Search for nodes across all partitions
   */
  async searchNodes(query: string, limit = 10): Promise<GraphNode[]> {
    const allNodes: GraphNode[] = [];
    const entityPartitions = await this.loadPartitionsByType("entities");

    entityPartitions.forEach((partition) => {
      allNodes.push(...partition.data);
    });

    const results = allNodes
      .filter(
        (node) =>
          node.label.toLowerCase().includes(query.toLowerCase()) ||
          node.aka?.some((alias) =>
            alias.toLowerCase().includes(query.toLowerCase())
          )
      )
      .slice(0, limit);

    return results;
  }

  /**
   * Expand graph from focus nodes
   */
  private expandFromFocusNodes(
    allNodes: GraphNode[],
    allEdges: GraphEdge[],
    focusNodes: string[],
    radius: number
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const includedNodeIds = new Set(focusNodes);

    // Expand outward for specified radius
    for (let i = 0; i < radius; i++) {
      const currentSize = includedNodeIds.size;

      allEdges.forEach((edge) => {
        if (includedNodeIds.has(edge.source)) includedNodeIds.add(edge.target);
        if (includedNodeIds.has(edge.target)) includedNodeIds.add(edge.source);
      });

      // Stop if no new nodes were added
      if (includedNodeIds.size === currentSize) break;
    }

    const nodes = allNodes.filter((node) => includedNodeIds.has(node.id));
    const edges = allEdges.filter(
      (edge) =>
        includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target)
    );

    return { nodes, edges };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🗑️  Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; totalSizeBytes: number } {
    const entries = this.cache.size;
    const totalSizeBytes = Array.from(this.cache.values()).reduce(
      (total, entry) => total + JSON.stringify(entry.data).length,
      0
    );

    return { entries, totalSizeBytes };
  }
}
