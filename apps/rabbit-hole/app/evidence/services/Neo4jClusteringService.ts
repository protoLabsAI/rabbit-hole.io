/**
 * Neo4j Clustering Service
 *
 * Provides advanced community detection and clustering analysis using Neo4j's
 * Graph Data Science algorithms for evidence graph visualization.
 */

import neo4j, { Driver, Session } from "neo4j-driver";

import type {
  ClusterAlgorithm,
  ClusteringResult,
  GraphCluster,
  ClusterMetrics,
  GlobalClusterMetrics,
  ClusterAnalysisConfig,
  ClusterEdge,
  ClusterStyle,
} from "../types/cluster.types";
import { DEFAULT_CLUSTER_STYLES } from "../types/cluster.types";

interface Neo4jClusteringConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export class Neo4jClusteringService {
  private driver: Driver;
  private database: string;

  constructor(config: Neo4jClusteringConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      {
        // Connection settings for clustering workloads
        connectionAcquisitionTimeout: 60000,
        maxConnectionPoolSize: 50,
        connectionTimeout: 30000,
        maxTransactionRetryTime: 30000,
      }
    );
    this.database = config.database || "neo4j";
  }

  /**
   * Test Neo4j connection and ensure clustering capabilities
   */
  async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    capabilities?: string[];
  }> {
    try {
      // Test basic connectivity
      await this.driver.verifyConnectivity();

      const session = this.driver.session({ database: this.database });

      try {
        // Check if Graph Data Science library is available (Neo4j 5.x syntax)
        const gdsCheck = await session.run(`
          CALL gds.version()
          YIELD gdsVersion
          RETURN gdsVersion
        `);

        const version = gdsCheck.records[0]?.get("gdsVersion");

        // Test basic graph projection capability
        const projectionTest = await session.run(`
          CALL gds.graph.list()
          YIELD graphName
          RETURN count(*) as graphCount
        `);

        return {
          connected: true,
          capabilities: [
            `Neo4j Graph Data Science ${version}`,
            "Community Detection Algorithms",
            "Graph Projections",
            "Clustering Analysis",
          ],
        };
      } catch (gdsError) {
        console.warn("GDS library not available:", gdsError);
        return {
          connected: true,
          error:
            "Neo4j Graph Data Science library not installed. Please install GDS for clustering functionality.",
          capabilities: ["Basic Neo4j (clustering requires GDS plugin)"],
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error("Neo4j connection test failed:", error);
      return {
        connected: false,
        error: `Neo4j connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Perform complete clustering analysis with specified algorithm
   */
  async analyzeGraph(
    algorithm: ClusterAlgorithm,
    config: ClusterAnalysisConfig
  ): Promise<ClusteringResult> {
    const session = this.driver.session({ database: this.database });
    const startTime = Date.now();

    try {
      // Ensure graph projection exists
      await this.ensureGraphProjection(session);

      // Run clustering algorithm
      const clusters = await this.runClusteringAlgorithm(
        session,
        algorithm,
        config
      );

      // Calculate cluster metrics
      const clustersWithMetrics = await this.calculateClusterMetrics(
        session,
        clusters
      );

      // Calculate inter-cluster relationships
      const clusterEdges = await this.calculateClusterEdges(
        session,
        clustersWithMetrics
      );

      // Generate global metrics
      const globalMetrics = this.calculateGlobalMetrics(
        clustersWithMetrics,
        clusterEdges
      );

      // Create node-to-cluster mapping
      const nodeClusterMap = this.createNodeClusterMap(clustersWithMetrics);

      const computationTime = Date.now() - startTime;

      return {
        algorithm,
        parameters: this.getAlgorithmParameters(algorithm, config),
        generatedAt: new Date().toISOString(),
        computationTime,
        clusters: clustersWithMetrics,
        globalMetrics,
        nodeClusterMap,
        clusterEdges,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Run multiple clustering algorithms and compare results
   */
  async compareClusteringAlgorithms(
    algorithms: ClusterAlgorithm[],
    config: ClusterAnalysisConfig
  ): Promise<{ [algorithm: string]: ClusteringResult }> {
    const results: { [algorithm: string]: ClusteringResult } = {};

    for (const algorithm of algorithms) {
      try {
        results[algorithm] = await this.analyzeGraph(algorithm, config);
      } catch (error) {
        console.warn(`Failed to run ${algorithm} clustering:`, error);
      }
    }

    return results;
  }

  /**
   * Get clustering recommendations based on graph characteristics
   */
  async getClusteringRecommendations(): Promise<{
    recommended: ClusterAlgorithm[];
    reasons: string[];
    graphStats: any;
  }> {
    const session = this.driver.session({ database: this.database });

    try {
      // Get basic graph statistics
      const graphStats = await this.getGraphStatistics(session);

      const recommendations: ClusterAlgorithm[] = [];
      const reasons: string[] = [];

      // Louvain - generally excellent for most graphs
      recommendations.push("louvain");
      reasons.push(
        "Louvain: Excellent modularity optimization, works well for most graphs"
      );

      // Label Propagation - fast for large graphs
      if (graphStats.nodeCount > 1000) {
        recommendations.push("label_propagation");
        reasons.push("Label Propagation: Fast performance for large graphs");
      }

      // Leiden - high quality alternative to Louvain
      if (graphStats.nodeCount < 5000) {
        recommendations.push("leiden");
        reasons.push(
          "Leiden: Higher quality than Louvain, best for detailed analysis"
        );
      }

      // Weakly Connected - for disconnected components
      if (graphStats.componentCount > 1) {
        recommendations.push("weakly_connected");
        reasons.push(
          "Weakly Connected: Multiple disconnected components detected"
        );
      }

      return {
        recommended: recommendations,
        reasons,
        graphStats,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Ensure graph projection exists for clustering algorithms
   */
  private async ensureGraphProjection(session: Session): Promise<void> {
    // Check if projection already exists
    const checkQuery = `
      CALL gds.graph.exists('evidenceGraph')
      YIELD exists
      RETURN exists
    `;

    const checkResult = await session.run(checkQuery);
    const exists = checkResult.records[0]?.get("exists");

    if (exists) {
      // Drop existing projection to ensure clean state
      console.log(
        "Dropping existing graph projection to ensure clean state..."
      );
      await session.run(`CALL gds.graph.drop('evidenceGraph') YIELD graphName`);
    }

    // Create fresh graph projection (only numeric properties for GDS compatibility)
    const projectionQuery = `
      CALL gds.graph.project(
        'evidenceGraph',
        'GraphNode',
        {
          RELATES_TO: {
            type: 'RELATES_TO',
            properties: ['confidence']
          }
        }
      )
      YIELD graphName, nodeCount, relationshipCount
      RETURN graphName, nodeCount, relationshipCount
    `;

    const result = await session.run(projectionQuery);
    const record = result.records[0];

    console.log(
      `✅ Created graph projection: ${record.get("nodeCount")} nodes, ${record.get("relationshipCount")} relationships`
    );
  }

  /**
   * Run specific clustering algorithm
   */
  private async runClusteringAlgorithm(
    session: Session,
    algorithm: ClusterAlgorithm,
    config: ClusterAnalysisConfig
  ): Promise<GraphCluster[]> {
    const queries = {
      louvain: `
        CALL gds.louvain.stream('evidenceGraph', {
          relationshipWeightProperty: 'confidence',
          includeIntermediateCommunities: true,
          maxLevels: 10,
          maxIterations: 10
        })
        YIELD nodeId, communityId, intermediateCommunityIds
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, communityId, n.entityType as entityType
      `,
      label_propagation: `
        CALL gds.labelPropagation.stream('evidenceGraph', {
          relationshipWeightProperty: 'confidence',
          maxIterations: 10
        })
        YIELD nodeId, communityId
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, communityId, n.entityType as entityType
      `,
      leiden: `
        CALL gds.leiden.stream('evidenceGraph', {
          relationshipWeightProperty: 'confidence',
          includeIntermediateCommunities: true,
          gamma: 1.0,
          theta: 0.01
        })
        YIELD nodeId, communityId
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, communityId, n.entityType as entityType
      `,
      weakly_connected: `
        CALL gds.wcc.stream('evidenceGraph')
        YIELD nodeId, componentId
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, componentId as communityId, n.entityType as entityType
      `,
      strongly_connected: `
        CALL gds.alpha.scc.stream('evidenceGraph')
        YIELD nodeId, componentId
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, componentId as communityId, n.entityType as entityType
      `,
      k_core: `
        CALL gds.k1coloring.stream('evidenceGraph')
        YIELD nodeId, color
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, color as communityId, n.entityType as entityType
      `,
      triangle_count: `
        CALL gds.triangleCount.stream('evidenceGraph')
        YIELD nodeId, triangleCount
        MATCH (n) WHERE id(n) = nodeId
        WITH n.id as nodeId, triangleCount, n.entityType as entityType
        WITH nodeId, CASE 
          WHEN triangleCount = 0 THEN 0
          WHEN triangleCount <= 2 THEN 1
          WHEN triangleCount <= 5 THEN 2
          ELSE 3
        END as communityId, entityType
        RETURN nodeId, communityId, entityType
      `,
    };

    const query = queries[algorithm];
    if (!query) {
      throw new Error(`Unsupported clustering algorithm: ${algorithm}`);
    }

    const result = await session.run(query);
    const nodeClusterMap = new Map<number, string[]>();

    // Group nodes by cluster
    for (const record of result.records) {
      const communityId = record.get("communityId").toNumber();
      const nodeId = record.get("nodeId");

      if (!nodeClusterMap.has(communityId)) {
        nodeClusterMap.set(communityId, []);
      }
      nodeClusterMap.get(communityId)!.push(nodeId);
    }

    // Convert to cluster objects
    const clusters: GraphCluster[] = [];
    let clusterIndex = 0;

    for (const [communityId, nodeIds] of nodeClusterMap.entries()) {
      // Filter small clusters if configured
      if (nodeIds.length < config.minClusterSize) {
        continue;
      }

      const clusterId = `cluster_${algorithm}_${communityId}`;
      const clusterStyle = this.getClusterStyle(algorithm);

      clusters.push({
        id: clusterId,
        name: `${algorithm.charAt(0).toUpperCase() + algorithm.slice(1)} Cluster ${clusterIndex + 1}`,
        algorithm,
        metrics: {
          nodeCount: nodeIds.length,
          internalEdges: 0, // Will be calculated later
          externalEdges: 0,
          modularity: 0,
          clustering: 0,
          avgConfidence: 0,
          density: 0,
        },
        nodeIds,
        style: clusterStyle,
        position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      });

      clusterIndex++;
    }

    return clusters;
  }

  /**
   * Calculate detailed metrics for each cluster
   */
  private async calculateClusterMetrics(
    session: Session,
    clusters: GraphCluster[]
  ): Promise<GraphCluster[]> {
    const updatedClusters: GraphCluster[] = [];

    for (const cluster of clusters) {
      // Get internal edges
      const internalEdgesQuery = `
        MATCH (n1:GraphNode)-[r:RELATES_TO]-(n2:GraphNode)
        WHERE n1.id IN $nodeIds AND n2.id IN $nodeIds
        RETURN count(r) as internalEdges, avg(r.confidence) as avgConfidence
      `;

      const internalResult = await session.run(internalEdgesQuery, {
        nodeIds: cluster.nodeIds,
      });

      // Get external edges
      const externalEdgesQuery = `
        MATCH (n1:GraphNode)-[r:RELATES_TO]-(n2:GraphNode)
        WHERE n1.id IN $nodeIds AND NOT n2.id IN $nodeIds
        RETURN count(r) as externalEdges
      `;

      const externalResult = await session.run(externalEdgesQuery, {
        nodeIds: cluster.nodeIds,
      });

      const internalEdges =
        internalResult.records[0]?.get("internalEdges").toNumber() || 0;
      const externalEdges =
        externalResult.records[0]?.get("externalEdges").toNumber() || 0;
      const avgConfidence =
        internalResult.records[0]?.get("avgConfidence") || 0;

      // Calculate clustering coefficient
      const clustering = this.calculateClusteringCoefficient(
        cluster.nodeIds.length,
        internalEdges
      );

      // Calculate density
      const maxPossibleEdges =
        (cluster.nodeIds.length * (cluster.nodeIds.length - 1)) / 2;
      const density =
        maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;

      // Calculate modularity contribution
      const totalEdges = internalEdges + externalEdges;
      const modularity = totalEdges > 0 ? internalEdges / totalEdges - 0.5 : 0;

      const updatedMetrics: ClusterMetrics = {
        nodeCount: cluster.nodeIds.length,
        internalEdges,
        externalEdges,
        modularity,
        clustering,
        avgConfidence,
        density,
        silhouette: this.calculateSilhouette(internalEdges, externalEdges),
      };

      updatedClusters.push({
        ...cluster,
        metrics: updatedMetrics,
      });
    }

    return updatedClusters;
  }

  /**
   * Calculate edges between clusters
   */
  private async calculateClusterEdges(
    session: Session,
    clusters: GraphCluster[]
  ): Promise<ClusterEdge[]> {
    const clusterEdges: ClusterEdge[] = [];
    const clusterMap = new Map<string, GraphCluster>();

    clusters.forEach((cluster) => {
      cluster.nodeIds.forEach((nodeId) => {
        clusterMap.set(nodeId, cluster);
      });
    });

    // Query all inter-cluster relationships
    const interClusterQuery = `
      MATCH (n1:GraphNode)-[r:RELATES_TO]-(n2:GraphNode)
      WHERE n1.id IN $allNodeIds AND n2.id IN $allNodeIds
      RETURN n1.id as source, n2.id as target, r.confidence as confidence, r.type as edgeType
    `;

    const allNodeIds = clusters.flatMap((c) => c.nodeIds);
    const result = await session.run(interClusterQuery, { allNodeIds });

    const clusterConnectionMap = new Map<
      string,
      {
        edgeCount: number;
        totalConfidence: number;
        edgeTypes: Set<string>;
      }
    >();

    for (const record of result.records) {
      const sourceNode = record.get("source");
      const targetNode = record.get("target");
      const confidence = record.get("confidence");
      const edgeType = record.get("edgeType");

      const sourceCluster = clusterMap.get(sourceNode);
      const targetCluster = clusterMap.get(targetNode);

      if (
        sourceCluster &&
        targetCluster &&
        sourceCluster.id !== targetCluster.id
      ) {
        const connectionKey = `${sourceCluster.id}-${targetCluster.id}`;

        if (!clusterConnectionMap.has(connectionKey)) {
          clusterConnectionMap.set(connectionKey, {
            edgeCount: 0,
            totalConfidence: 0,
            edgeTypes: new Set(),
          });
        }

        const connection = clusterConnectionMap.get(connectionKey)!;
        connection.edgeCount++;
        connection.totalConfidence += confidence;
        connection.edgeTypes.add(edgeType);
      }
    }

    // Convert to ClusterEdge objects
    for (const [connectionKey, connection] of clusterConnectionMap.entries()) {
      const [sourceClusterId, targetClusterId] = connectionKey.split("-");
      const avgConfidence = connection.totalConfidence / connection.edgeCount;

      clusterEdges.push({
        id: `ce_${sourceClusterId}_${targetClusterId}`,
        sourceCluster: sourceClusterId,
        targetCluster: targetClusterId,
        edgeCount: connection.edgeCount,
        avgConfidence,
        strength: Math.min(connection.edgeCount / 10, 1), // Normalize strength
        edgeTypes: Array.from(connection.edgeTypes),
      });
    }

    return clusterEdges;
  }

  /**
   * Calculate global clustering metrics
   */
  private calculateGlobalMetrics(
    clusters: GraphCluster[],
    clusterEdges: ClusterEdge[]
  ): GlobalClusterMetrics {
    const totalNodes = clusters.reduce(
      (sum, cluster) => sum + cluster.metrics.nodeCount,
      0
    );
    const clusterSizes = clusters.map((c) => c.metrics.nodeCount);

    const avgClusterSize = totalNodes / clusters.length;
    const variance =
      clusterSizes.reduce(
        (sum, size) => sum + Math.pow(size - avgClusterSize, 2),
        0
      ) / clusters.length;
    const clusterSizeStdDev = Math.sqrt(variance);

    const globalModularity =
      clusters.reduce((sum, cluster) => {
        return sum + cluster.metrics.modularity * cluster.metrics.nodeCount;
      }, 0) / totalNodes;

    const globalSilhouette =
      clusters.reduce((sum, cluster) => {
        return (
          sum + (cluster.metrics.silhouette || 0) * cluster.metrics.nodeCount
        );
      }, 0) / totalNodes;

    return {
      clusterCount: clusters.length,
      globalModularity,
      avgClusterSize,
      clusterSizeStdDev,
      coverage: 1.0, // Assuming all nodes are clustered
      globalSilhouette,
    };
  }

  /**
   * Create node-to-cluster mapping
   */
  private createNodeClusterMap(
    clusters: GraphCluster[]
  ): Record<string, string> {
    const nodeClusterMap: Record<string, string> = {};

    clusters.forEach((cluster) => {
      cluster.nodeIds.forEach((nodeId) => {
        nodeClusterMap[nodeId] = cluster.id;
      });
    });

    return nodeClusterMap;
  }

  /**
   * Get basic graph statistics
   */
  private async getGraphStatistics(session: Session): Promise<any> {
    const statsQuery = `
      MATCH (n:GraphNode)
      OPTIONAL MATCH (n)-[r:RELATES_TO]-()
      WITH count(DISTINCT n) as nodeCount, count(r) as edgeCount
      MATCH (n:GraphNode)
      WITH nodeCount, edgeCount, collect(DISTINCT n.entityType) as entityTypes
      CALL {
        MATCH (n:GraphNode)
        WHERE NOT EXISTS { MATCH (n)-[:RELATES_TO]-() }
        RETURN count(n) as isolatedNodes
      }
      CALL gds.wcc.stats('evidenceGraph') YIELD componentCount
      RETURN nodeCount, edgeCount, entityTypes, isolatedNodes, componentCount
    `;

    const result = await session.run(statsQuery);
    const record = result.records[0];

    return {
      nodeCount: record.get("nodeCount").toNumber(),
      edgeCount: record.get("edgeCount").toNumber(),
      entityTypes: record.get("entityTypes"),
      isolatedNodes: record.get("isolatedNodes").toNumber(),
      componentCount: record.get("componentCount").toNumber(),
    };
  }

  /**
   * Get cluster style based on algorithm
   */
  private getClusterStyle(algorithm: ClusterAlgorithm): ClusterStyle {
    const defaultStyle = DEFAULT_CLUSTER_STYLES[algorithm];

    return {
      color: defaultStyle.color || "#3B82F6",
      backgroundColor:
        defaultStyle.backgroundColor || "rgba(59, 130, 246, 0.1)",
      borderColor: defaultStyle.borderColor || "#3B82F6",
      borderWidth: 2,
      borderStyle: "solid",
      scale: 1.0,
      highlighted: false,
    };
  }

  /**
   * Calculate clustering coefficient for a cluster
   */
  private calculateClusteringCoefficient(
    nodeCount: number,
    edgeCount: number
  ): number {
    if (nodeCount < 2) return 0;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
  }

  /**
   * Calculate silhouette score for cluster quality
   */
  private calculateSilhouette(
    internalEdges: number,
    externalEdges: number
  ): number {
    if (internalEdges + externalEdges === 0) return 0;

    const avgInternalDistance = internalEdges > 0 ? 1 / internalEdges : 1;
    const avgExternalDistance = externalEdges > 0 ? 1 / externalEdges : 1;

    const silhouette =
      (avgExternalDistance - avgInternalDistance) /
      Math.max(avgInternalDistance, avgExternalDistance);

    return Math.max(-1, Math.min(1, silhouette));
  }

  /**
   * Get algorithm parameters used
   */
  private getAlgorithmParameters(
    algorithm: ClusterAlgorithm,
    config: ClusterAnalysisConfig
  ): Record<string, any> {
    return {
      algorithm,
      minClusterSize: config.minClusterSize,
      maxClusters: config.maxClusters,
      weightProperty: config.weightProperty || "confidence",
      includeSingletons: config.includeSingletons,
      resolution: config.resolution || 1.0,
    };
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
}
