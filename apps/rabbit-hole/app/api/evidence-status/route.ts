/**
 * Evidence Graph Status API
 *
 * Provides server-side status checks for database backends
 * since client-side code cannot directly connect to Neo4j
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { Neo4jService } from "../../evidence/services/Neo4jService";

interface DatabaseStatus {
  neo4j: {
    available: boolean;
    connected: boolean;
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
    error?: string;
  };
  partitions: {
    available: boolean;
    totalNodes: number;
    totalEdges: number;
    totalEvidence: number;
    error?: string;
  };
  recommendation: {
    backend: "neo4j" | "partitions" | "unavailable";
    reason: string;
    performanceProfile: "small" | "medium" | "large" | "enterprise";
  };
}

export async function GET(request: NextRequest) {
  try {
    const status: DatabaseStatus = {
      neo4j: {
        available: false,
        connected: false,
        nodeCount: 0,
        edgeCount: 0,
        evidenceCount: 0,
      },
      partitions: {
        available: false,
        totalNodes: 0,
        totalEdges: 0,
        totalEvidence: 0,
      },
      recommendation: {
        backend: "unavailable",
        reason: "Checking backends...",
        performanceProfile: "small",
      },
    };

    // Check Neo4j availability (server-side only)
    try {
      const neo4jService = new Neo4jService({
        uri: process.env.NEO4J_URI || "bolt://localhost:7687",
        username:
          process.env.NEO4J_USERNAME || process.env.NEO4J_USER || "neo4j",
        password: process.env.NEO4J_PASSWORD || "",
        database: process.env.NEO4J_DATABASE || "neo4j",
      });

      await neo4jService.connect();
      const stats = await neo4jService.getStatistics();
      await neo4jService.disconnect();

      status.neo4j = {
        available: true,
        connected: true,
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        evidenceCount: stats.evidenceCount,
      };

      console.log(
        `✅ Neo4j status: ${stats.nodeCount} nodes, ${stats.edgeCount} edges, ${stats.evidenceCount} evidence`
      );
    } catch (error) {
      status.neo4j.error =
        error instanceof Error ? error.message : "Neo4j connection failed";
      console.log(`❌ Neo4j not available: ${status.neo4j.error}`);
    }

    // Check partition availability
    try {
      const manifestPath = join(
        process.cwd(),
        "docs/evidence-graphs/partitioned/manifest.json"
      );

      if (existsSync(manifestPath)) {
        const manifestContent = readFileSync(manifestPath, "utf-8");
        const manifest = JSON.parse(manifestContent);

        status.partitions = {
          available: true,
          totalNodes: manifest.totalNodes || 0,
          totalEdges: manifest.totalEdges || 0,
          totalEvidence: manifest.totalEvidence || 0,
        };

        console.log(
          `✅ Partitions status: ${status.partitions.totalNodes} nodes, ${status.partitions.totalEdges} edges, ${status.partitions.totalEvidence} evidence`
        );
      } else {
        status.partitions.error = "Manifest file not found";
      }
    } catch (error) {
      status.partitions.error =
        error instanceof Error ? error.message : "Partition check failed";
      console.log(`❌ Partitions not available: ${status.partitions.error}`);
    }

    // Determine recommendation
    const totalNeo4jItems =
      status.neo4j.nodeCount +
      status.neo4j.edgeCount +
      status.neo4j.evidenceCount;
    const totalPartitionItems =
      status.partitions.totalNodes +
      status.partitions.totalEdges +
      status.partitions.totalEvidence;

    if (status.neo4j.available && totalNeo4jItems > 0) {
      // Neo4j has data - use it
      status.recommendation = {
        backend: "neo4j",
        reason: `Neo4j contains ${totalNeo4jItems} items and provides superior performance`,
        performanceProfile:
          totalNeo4jItems > 10000
            ? "enterprise"
            : totalNeo4jItems > 1000
              ? "large"
              : totalNeo4jItems > 100
                ? "medium"
                : "small",
      };
    } else if (status.partitions.available && totalPartitionItems > 0) {
      // Partitions available
      status.recommendation = {
        backend: "partitions",
        reason: status.neo4j.available
          ? `Partitions contain ${totalPartitionItems} items, Neo4j is empty - consider migrating`
          : `Only partitions available with ${totalPartitionItems} items`,
        performanceProfile:
          totalPartitionItems > 10000
            ? "enterprise"
            : totalPartitionItems > 1000
              ? "large"
              : totalPartitionItems > 100
                ? "medium"
                : "small",
      };
    } else {
      status.recommendation = {
        backend: "unavailable",
        reason: "No data sources available",
        performanceProfile: "small",
      };
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Status check failed:", error);
    return NextResponse.json(
      {
        error: "Status check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
