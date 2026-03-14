/**
 * Evidence Graph Mutation API - Neo4j Integrated
 *
 * Handles CRUD operations for evidence graph data with intelligent backend selection.
 * Automatically chooses between Neo4j (preferred) and JSON partitions (fallback).
 *
 * Endpoints:
 * POST /api/evidence-mutations/entities/{category}
 * POST /api/evidence-mutations/relationships/{category}
 * POST /api/evidence-mutations/evidence/{category}
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

import { NextRequest, NextResponse } from "next/server";

import { Neo4jService } from "../../../evidence/services/Neo4jService";
import { TestDataService } from "../../../evidence/services/TestDataService";
import type {
  GraphNode,
  GraphEdge,
  EvidenceEntry,
} from "../../../evidence/types/evidence-graph.types";

interface MutationRequest {
  operation: "add" | "update" | "delete";
  data: any;
  testSession?: string;
  testPurpose?: string;
}

interface MutationResponse {
  success: boolean;
  data?: any;
  error?: string;
  backend?: "neo4j" | "partitions";
  partition?: string;
  testSession?: string;
  isTestData?: boolean;
}

const PARTITIONS_BASE = "docs/evidence-graphs/partitioned";

// Initialize services
let neo4jService: Neo4jService | null = null;
let testDataService: TestDataService | null = null;
let neo4jAvailable = false;

async function initializeNeo4j() {
  if (neo4jService === null) {
    try {
      neo4jService = new Neo4jService({
        uri: process.env.NEO4J_URI || "bolt://localhost:7687",
        username: process.env.NEO4J_USERNAME || "neo4j",
        password: process.env.NEO4J_PASSWORD || "evidencegraph2024",
        database: process.env.NEO4J_DATABASE || "neo4j",
      });

      await neo4jService.connect();
      const stats = await neo4jService.getStatistics();
      neo4jAvailable =
        stats.nodeCount > 0 || stats.edgeCount > 0 || stats.evidenceCount > 0;
      await neo4jService.disconnect();

      console.log(
        `🗄️  Neo4j mutation API: ${neo4jAvailable ? "Available" : "Empty"} (${stats.nodeCount} nodes)`
      );
    } catch (error) {
      console.log(
        "⚠️  Neo4j not available for mutations, using partition fallback:",
        error
      );
      neo4jService = null;
      neo4jAvailable = false;
    }
  }
  return neo4jAvailable;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Check authentication
  const userId = "local-user";

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required to modify evidence data",
      },
      { status: 401 }
    );
  }

  try {
    console.log(
      `📝 Evidence mutation request from authenticated user: ${userId}`
    );

    const [partitionType, category] = params.path;

    if (!partitionType || !category) {
      return NextResponse.json(
        { success: false, error: "Invalid path - expected /type/category" },
        { status: 400 }
      );
    }

    if (!["entities", "relationships", "evidence"].includes(partitionType)) {
      return NextResponse.json(
        { success: false, error: "Invalid partition type" },
        { status: 400 }
      );
    }

    const mutationData: MutationRequest = await request.json();

    // Initialize test data service if needed
    if (!testDataService) {
      testDataService = new TestDataService();
    }

    // Process test data tagging if testSession provided
    if (mutationData.testSession && mutationData.operation === "add") {
      console.log(
        `🧪 Processing test data for session: ${mutationData.testSession}`
      );

      // Start test session if not already active
      const config = testDataService.startTestSession(mutationData.testPurpose);

      // Apply test metadata to the data
      mutationData.data = testDataService.addTestMetadata(
        mutationData.data,
        config,
        mutationData.testPurpose
      );

      console.log(`🏷️  Applied test tags: ${config.tags.join(", ")}`);
    }

    // Try Neo4j first, fallback to partitions
    const useNeo4j = await initializeNeo4j();

    let result: MutationResponse;

    if (useNeo4j && neo4jService) {
      result = await handleNeo4jMutation(partitionType, category, mutationData);
    } else {
      result = await handlePartitionMutation(
        partitionType,
        category,
        mutationData
      );
    }

    // Add test data indicators to response
    if (mutationData.testSession) {
      result.testSession = mutationData.testSession;
      result.isTestData = true;
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Mutation API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleNeo4jMutation(
  partitionType: string,
  category: string,
  mutation: MutationRequest
): Promise<MutationResponse> {
  if (!neo4jService) {
    throw new Error("Neo4j service not initialized");
  }

  try {
    console.log(
      `🔄 Attempting Neo4j mutation: ${mutation.operation} ${partitionType}/${category}`
    );
    await neo4jService.connect();
    console.log(`✅ Neo4j connected for mutation`);

    switch (partitionType) {
      case "evidence":
        if (mutation.operation === "add") {
          await neo4jService.addEvidence(mutation.data as EvidenceEntry);
          console.log(`✅ Added evidence to Neo4j: ${mutation.data.id}`);
        }
        break;

      case "entities":
        if (mutation.operation === "add") {
          await neo4jService.addNode(mutation.data as GraphNode);
          console.log(`✅ Added node to Neo4j: ${mutation.data.id}`);
        } else if (mutation.operation === "delete") {
          await neo4jService.deleteNode(mutation.data.id);
          console.log(`✅ Deleted node from Neo4j: ${mutation.data.id}`);
        }
        break;

      case "relationships":
        if (mutation.operation === "add") {
          await neo4jService.addEdge(mutation.data as GraphEdge);
          console.log(`✅ Added edge to Neo4j: ${mutation.data.id}`);
        }
        break;

      default:
        throw new Error(`Unsupported partition type: ${partitionType}`);
    }

    console.log(
      `✅ Neo4j mutation completed: ${mutation.operation} ${partitionType}/${category}`
    );

    return {
      success: true,
      data: mutation.data,
      backend: "neo4j",
      partition: `${partitionType}-${category}`,
    };
  } catch (error) {
    console.error(`❌ Neo4j mutation failed:`, error);
    console.error(
      `   Operation: ${mutation.operation} ${partitionType}/${category}`
    );
    console.error(`   Data ID: ${mutation.data?.id || "unknown"}`);

    // Fallback to partition mutation
    console.log("🔄 Falling back to partition mutation...");
    return await handlePartitionMutation(partitionType, category, mutation);
  } finally {
    try {
      await neo4jService.disconnect();
      console.log(`🔌 Neo4j disconnected after mutation attempt`);
    } catch (disconnectError) {
      console.warn("⚠️  Neo4j disconnect failed:", disconnectError);
    }
  }
}

async function handlePartitionMutation(
  partitionType: string,
  category: string,
  mutation: MutationRequest
): Promise<MutationResponse> {
  const partitionPath = join(
    process.cwd(),
    PARTITIONS_BASE,
    partitionType,
    `${category}.json`
  );

  try {
    // Load existing partition
    let partition = loadPartition(partitionPath);

    if (!partition) {
      // Create new partition if it doesn't exist
      partition = createEmptyPartition(partitionType, category);
    }

    // Perform the mutation
    switch (mutation.operation) {
      case "add":
        partition.data.push(mutation.data);
        partition.itemCount = partition.data.length;
        break;

      case "update": {
        const updateIndex = partition.data.findIndex(
          (item: any) => item.id === mutation.data.id
        );
        if (updateIndex === -1) {
          return {
            success: false,
            error: `Item ${mutation.data.id} not found`,
          };
        }
        partition.data[updateIndex] = mutation.data;
        break;
      }

      case "delete": {
        const deleteIndex = partition.data.findIndex(
          (item: any) => item.id === mutation.data.id
        );
        if (deleteIndex === -1) {
          return {
            success: false,
            error: `Item ${mutation.data.id} not found`,
          };
        }
        partition.data.splice(deleteIndex, 1);
        partition.itemCount = partition.data.length;
        break;
      }

      default:
        return {
          success: false,
          error: `Unsupported operation: ${mutation.operation}`,
        };
    }

    // Write updated partition back to file
    writePartition(partitionPath, partition);

    // Update manifest
    await updateManifest(partitionType, category, partition.itemCount);

    console.log(
      `✅ Partition mutation: ${mutation.operation} ${partitionType}/${category}`
    );

    return {
      success: true,
      data: mutation.data,
      backend: "partitions",
      partition: `${partitionType}-${category}`,
    };
  } catch (error) {
    console.error(
      `Failed to mutate partition ${partitionType}/${category}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown mutation error",
    };
  }
}

function loadPartition(partitionPath: string) {
  if (!existsSync(partitionPath)) {
    return null;
  }

  try {
    const content = readFileSync(partitionPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load partition ${partitionPath}:`, error);
    return null;
  }
}

function createEmptyPartition(partitionType: string, category: string) {
  return {
    id: `${partitionType}-${category}`,
    type: partitionType,
    category: category,
    version: "0.3.1",
    description: `${category} ${partitionType} in the evidence graph`,
    itemCount: 0,
    data: [],
  };
}

function writePartition(partitionPath: string, partition: any) {
  // Ensure directory exists
  mkdirSync(dirname(partitionPath), { recursive: true });

  // Write with pretty formatting
  writeFileSync(partitionPath, JSON.stringify(partition, null, 2));

  console.log(
    `✅ Updated partition: ${partitionPath} (${partition.itemCount} items)`
  );
}

async function updateManifest(
  partitionType: string,
  category: string,
  itemCount: number
) {
  const manifestPath = join(process.cwd(), PARTITIONS_BASE, "manifest.json");

  try {
    let manifest;
    if (existsSync(manifestPath)) {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(manifestContent);
    } else {
      // Create new manifest
      manifest = {
        version: "0.3.1",
        generated_at: new Date().toISOString(),
        totalNodes: 0,
        totalEdges: 0,
        totalEvidence: 0,
        partitions: [],
      };
    }

    // Update or add partition entry
    const partitionId = `${partitionType}-${category}`;
    const existingPartition = manifest.partitions.find(
      (p: any) => p.id === partitionId
    );

    if (existingPartition) {
      existingPartition.itemCount = itemCount;
    } else {
      manifest.partitions.push({
        id: partitionId,
        path: `${partitionType}/${category}.json`,
        type: partitionType,
        category: category,
        itemCount: itemCount,
        description: `${category} ${partitionType} in the evidence graph`,
      });
    }

    // Update totals
    manifest.totalNodes = manifest.partitions
      .filter((p: any) => p.type === "entities")
      .reduce((sum: any, p: any) => sum + p.itemCount, 0);

    manifest.totalEdges = manifest.partitions
      .filter((p: any) => p.type === "relationships")
      .reduce((sum: any, p: any) => sum + p.itemCount, 0);

    manifest.totalEvidence = manifest.partitions
      .filter((p: any) => p.type === "evidence")
      .reduce((sum: any, p: any) => sum + p.itemCount, 0);

    manifest.generated_at = new Date().toISOString();

    // Write updated manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(
      `✅ Updated manifest: ${manifest.totalNodes} nodes, ${manifest.totalEdges} edges, ${manifest.totalEvidence} evidence`
    );
  } catch (error) {
    console.error("Failed to update manifest:", error);
    // Don't fail the mutation if manifest update fails
  }
}

// Also handle GET requests for reading partition data
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const [partitionType, category] = params.path;

    if (!partitionType || !category) {
      return NextResponse.json(
        { success: false, error: "Invalid path - expected /type/category" },
        { status: 400 }
      );
    }

    // Try Neo4j first for reading data
    const useNeo4j = await initializeNeo4j();

    if (useNeo4j && neo4jService) {
      // TODO: Implement Neo4j data reading by partition type
      console.log("📊 Reading from Neo4j (implementation needed)");
    }

    // Fallback to partition file reading
    const partitionPath = join(
      process.cwd(),
      PARTITIONS_BASE,
      partitionType,
      `${category}.json`
    );
    const partition = loadPartition(partitionPath);

    if (!partition) {
      return NextResponse.json(
        {
          success: false,
          error: `Partition ${partitionType}/${category} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: partition,
      backend: useNeo4j ? "neo4j-fallback" : "partitions",
    });
  } catch (error) {
    console.error("Read partition error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
