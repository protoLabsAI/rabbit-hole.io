/**
 * Test Data Management Service
 *
 * Handles creation, tagging, filtering, and cleanup of test data
 * to prevent pollution of production investigation data.
 */

import type {
  TestDataConfig,
  TestDataMetadata,
  TestDataFilter,
  TestDataCleanupResult,
  TestableEvidenceEntry,
  TestableGraphNode,
  TestableGraphEdge,
} from "../types/test-data.types";

import { Neo4jService } from "./Neo4jService";

export class TestDataService {
  private neo4jService: Neo4jService;
  private currentConfig: TestDataConfig | null = null;

  constructor() {
    this.neo4jService = new Neo4jService({
      uri: process.env.NEO4J_URI || "bolt://localhost:7687",
      username: process.env.NEO4J_USERNAME || "neo4j",
      password: process.env.NEO4J_PASSWORD || "evidencegraph2024",
      database: process.env.NEO4J_DATABASE || "neo4j",
    });
  }

  /**
   * Start a new test session
   */
  startTestSession(purpose?: string): TestDataConfig {
    const sessionId = this.generateSessionId();

    this.currentConfig = {
      enabled: true,
      sessionId,
      prefix: `test_${sessionId}`,
      autoCleanupAfter: 24 * 60 * 60 * 1000, // 24 hours
      tags: [
        "TEST_DATA",
        `TEST_SESSION_${sessionId}`,
        ...(purpose ? [`TEST_PURPOSE_${purpose.toUpperCase()}`] : []),
      ],
    };

    console.log(
      `🧪 Started test session: ${sessionId}${purpose ? ` (${purpose})` : ""}`
    );
    return this.currentConfig;
  }

  /**
   * End current test session and optionally cleanup
   */
  async endTestSession(cleanup = false): Promise<TestDataCleanupResult | null> {
    if (!this.currentConfig) {
      return null;
    }

    const sessionId = this.currentConfig.sessionId;
    console.log(`🏁 Ending test session: ${sessionId}`);

    let cleanupResult: TestDataCleanupResult | null = null;

    if (cleanup) {
      cleanupResult = await this.cleanupTestSession(sessionId);
    }

    this.currentConfig = null;
    return cleanupResult;
  }

  /**
   * Add test data metadata to an item
   */
  addTestMetadata<T extends Record<string, any>>(
    item: T,
    config?: TestDataConfig,
    purpose?: string
  ): T & { testData: TestDataMetadata } {
    const testConfig = config || this.currentConfig;

    if (!testConfig) {
      throw new Error("No test session active. Call startTestSession() first.");
    }

    const testMetadata: TestDataMetadata = {
      isTestData: true,
      testSessionId: testConfig.sessionId,
      testCreatedAt: new Date().toISOString(),
      testExpiresAt: testConfig.autoCleanupAfter
        ? new Date(Date.now() + testConfig.autoCleanupAfter).toISOString()
        : undefined,
      testPurpose: purpose,
    };

    // Add test tags to existing tags
    const existingTags = (item as any).tags || [];
    const updatedTags = [...new Set([...existingTags, ...testConfig.tags])];

    return {
      ...item,
      tags: updatedTags,
      testData: testMetadata,
    };
  }

  /**
   * Generate test evidence entry
   */
  generateTestEvidence(
    title: string,
    publisher = "Test Publisher",
    purpose?: string
  ): TestableEvidenceEntry {
    if (!this.currentConfig) {
      throw new Error("No test session active");
    }

    const baseEvidence = {
      id: `ev_${this.currentConfig.prefix}_${Date.now()}`,
      title: `[TEST] ${title}`,
      date: new Date().toISOString().split("T")[0],
      publisher: `${publisher} (Test)`,
      url: `https://example.com/test-evidence/${Date.now()}`,
      type: "analysis" as const,
      notes: `Test evidence created in session ${this.currentConfig.sessionId}`,
    };

    return this.addTestMetadata(baseEvidence, this.currentConfig, purpose);
  }

  /**
   * Generate test node
   */
  generateTestNode(
    label: string,
    entityType: "person" | "platform" | "event" | "movement" | "media",
    sources: string[] = [],
    purpose?: string
  ): TestableGraphNode {
    if (!this.currentConfig) {
      throw new Error("No test session active");
    }

    const baseNode = {
      id: `n_${this.currentConfig.prefix}_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      label: `[TEST] ${label}`,
      entityType,
      sources,
      position: {
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
      },
    };

    return this.addTestMetadata(baseNode, this.currentConfig, purpose);
  }

  /**
   * Generate test edge
   */
  generateTestEdge(
    source: string,
    target: string,
    label: string,
    sources: string[] = [],
    purpose?: string
  ): TestableGraphEdge {
    if (!this.currentConfig) {
      throw new Error("No test session active");
    }

    const baseEdge = {
      id: `e_${this.currentConfig.prefix}_${source.replace("n_", "")}_${target.replace("n_", "")}`,
      source,
      target,
      label: `[TEST] ${label}`,
      type: "test_relationship",
      confidence: 0.5, // Lower confidence for test data
      sources,
      notes: `Test relationship created in session ${this.currentConfig.sessionId}`,
    };

    return this.addTestMetadata(baseEdge, this.currentConfig, purpose);
  }

  /**
   * Check if an item is test data
   */
  isTestData(item: any): boolean {
    return (
      item.testData?.isTestData === true ||
      (item.tags &&
        Array.isArray(item.tags) &&
        item.tags.includes("TEST_DATA")) ||
      (item.id && (item.id.includes("test_") || item.id.includes("_test_"))) ||
      (item.label && item.label.includes("[TEST]"))
    );
  }

  /**
   * Filter test data from results
   */
  filterTestData<T extends any[]>(items: T, filter: TestDataFilter): T {
    if (filter.testDataOnly) {
      return items.filter((item) => this.isTestData(item)) as T;
    }

    if (filter.includeTestData === false) {
      return items.filter((item) => !this.isTestData(item)) as T;
    }

    if (filter.testSessionId) {
      return items.filter(
        (item) => item.testData?.testSessionId === filter.testSessionId
      ) as T;
    }

    if (filter.testPurpose) {
      return items.filter(
        (item) => item.testData?.testPurpose === filter.testPurpose
      ) as T;
    }

    return items;
  }

  /**
   * Cleanup test data from Neo4j
   */
  async cleanupTestDataNeo4j(
    sessionId?: string,
    olderThan?: Date
  ): Promise<TestDataCleanupResult> {
    const result: TestDataCleanupResult = {
      success: false,
      deletedItems: { evidence: 0, nodes: 0, edges: 0 },
      sessions: [],
      errors: [],
      databaseBackend: "neo4j",
    };

    try {
      await this.neo4jService.connect();
      const session = (this.neo4jService as any).getSession();

      try {
        // Build cleanup filters
        let whereClause = "WHERE ";
        const conditions: string[] = [];

        if (sessionId) {
          conditions.push(
            `any(tag IN n.tags WHERE tag = 'TEST_SESSION_${sessionId}')`
          );
        } else {
          conditions.push(`any(tag IN n.tags WHERE tag = 'TEST_DATA')`);
        }

        if (olderThan) {
          conditions.push(
            `n.updated_at < datetime('${olderThan.toISOString()}')`
          );
        }

        whereClause += conditions.join(" AND ");

        // Get list of sessions being deleted
        const sessionsResult = await session.run(`
          MATCH (n) ${whereClause}
          WITH n.tags as tags
          UNWIND tags as tag
          WITH tag WHERE tag STARTS WITH 'TEST_SESSION_'
          RETURN DISTINCT substring(tag, 13) as sessionId
        `);

        result.sessions = sessionsResult.records.map((record: any) =>
          record.get("sessionId")
        );

        // Count items to be deleted
        const countsResult = await session.run(`
          MATCH (e:Evidence) ${whereClause.replace("n.", "e.")}
          WITH count(e) as evidenceCount
          MATCH (n:GraphNode) ${whereClause}
          WITH evidenceCount, count(n) as nodeCount
          MATCH ()-[r:RELATES_TO]->() WHERE any(tag IN r.tags WHERE tag = 'TEST_DATA')
          RETURN evidenceCount, nodeCount, count(r) as edgeCount
        `);

        if (countsResult.records.length > 0) {
          const counts = countsResult.records[0];
          result.deletedItems = {
            evidence: counts.get("evidenceCount").toNumber(),
            nodes: counts.get("nodeCount").toNumber(),
            edges: counts.get("edgeCount").toNumber(),
          };
        }

        // Delete test relationships first (to avoid orphaned references)
        await session.run(`
          MATCH ()-[r:RELATES_TO]->() 
          WHERE any(tag IN r.tags WHERE tag = 'TEST_DATA')
          ${sessionId ? `AND any(tag IN r.tags WHERE tag = 'TEST_SESSION_${sessionId}')` : ""}
          DELETE r
        `);

        // Delete test nodes (this will also delete any remaining relationships)
        await session.run(`
          MATCH (n:GraphNode) ${whereClause}
          DETACH DELETE n
        `);

        // Delete test evidence
        await session.run(`
          MATCH (e:Evidence) ${whereClause.replace("n.", "e.")}
          DELETE e
        `);

        result.success = true;
        console.log(
          `🧹 Cleaned up test data: ${result.deletedItems.evidence} evidence, ${result.deletedItems.nodes} nodes, ${result.deletedItems.edges} edges`
        );
      } finally {
        await session.close();
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Neo4j cleanup failed"
      );
      console.error("❌ Test data cleanup failed:", error);
    } finally {
      await this.neo4jService.disconnect();
    }

    return result;
  }

  /**
   * Cleanup test data from JSON partitions
   */
  async cleanupTestDataPartitions(
    sessionId?: string
  ): Promise<TestDataCleanupResult> {
    const result: TestDataCleanupResult = {
      success: false,
      deletedItems: { evidence: 0, nodes: 0, edges: 0 },
      sessions: [],
      errors: [],
      databaseBackend: "partitions",
    };

    // TODO: Implement partition cleanup
    // This would involve reading each partition file, filtering out test data, and rewriting

    result.errors.push(
      "Partition cleanup not yet implemented - use Neo4j for test data management"
    );
    return result;
  }

  /**
   * Cleanup all test data regardless of backend
   */
  async cleanupTestData(
    sessionId?: string,
    olderThan?: Date
  ): Promise<TestDataCleanupResult> {
    // Try Neo4j first
    try {
      return await this.cleanupTestDataNeo4j(sessionId, olderThan);
    } catch (error) {
      console.warn("Neo4j cleanup failed, trying partitions:", error);
      return await this.cleanupTestDataPartitions(sessionId);
    }
  }

  /**
   * Get all test sessions
   */
  async getTestSessions(): Promise<
    Array<{
      sessionId: string;
      itemCount: number;
      createdAt: string;
      purpose?: string;
    }>
  > {
    try {
      await this.neo4jService.connect();
      const session = (this.neo4jService as any).getSession();

      try {
        const result = await session.run(`
          MATCH (n) 
          WHERE any(tag IN n.tags WHERE tag STARTS WITH 'TEST_SESSION_')
          WITH n.tags as tags, n.testData.testCreatedAt as createdAt, n.testData.testPurpose as purpose
          UNWIND tags as tag
          WITH tag, createdAt, purpose WHERE tag STARTS WITH 'TEST_SESSION_'
          WITH substring(tag, 13) as sessionId, createdAt, purpose
          RETURN sessionId, count(*) as itemCount, min(createdAt) as earliestCreated, collect(DISTINCT purpose)[0] as purpose
          ORDER BY earliestCreated DESC
        `);

        return result.records.map((record: any) => ({
          sessionId: record.get("sessionId"),
          itemCount: record.get("itemCount").toNumber(),
          createdAt: record.get("earliestCreated") || new Date().toISOString(),
          purpose: record.get("purpose"),
        }));
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error("Failed to get test sessions:", error);
      return [];
    } finally {
      await this.neo4jService.disconnect();
    }
  }

  /**
   * Validate that production data isn't mixed with test data
   */
  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    testDataCount: number;
    productionDataCount: number;
  }> {
    const issues: string[] = [];
    let testDataCount = 0;
    let productionDataCount = 0;

    try {
      await this.neo4jService.connect();
      const session = (this.neo4jService as any).getSession();

      try {
        // Count test vs production data
        const countResult = await session.run(`
          MATCH (n)
          WITH n, any(tag IN n.tags WHERE tag = 'TEST_DATA') as isTest
          RETURN 
            sum(CASE WHEN isTest THEN 1 ELSE 0 END) as testCount,
            sum(CASE WHEN NOT isTest THEN 1 ELSE 0 END) as prodCount
        `);

        if (countResult.records.length > 0) {
          testDataCount = countResult.records[0].get("testCount").toNumber();
          productionDataCount = countResult.records[0]
            .get("prodCount")
            .toNumber();
        }

        // Check for test data mixed with production references
        const mixedRefsResult = await session.run(`
          MATCH (prod)-[r:RELATES_TO]-(test)
          WHERE NOT any(tag IN prod.tags WHERE tag = 'TEST_DATA')
            AND any(tag IN test.tags WHERE tag = 'TEST_DATA')
          RETURN prod.id, test.id, r.label
          LIMIT 10
        `);

        mixedRefsResult.records.forEach((record: any) => {
          issues.push(
            `Production node ${record.get("prod.id")} connected to test node ${record.get("test.id")}`
          );
        });

        // Check for test evidence supporting production claims
        const mixedEvidenceResult = await session.run(`
          MATCH (prod:GraphNode)-[:SUPPORTED_BY]->(testEvidence:Evidence)
          WHERE NOT any(tag IN prod.tags WHERE tag = 'TEST_DATA')
            AND any(tag IN testEvidence.tags WHERE tag = 'TEST_DATA')
          RETURN prod.id, testEvidence.id
          LIMIT 10
        `);

        mixedEvidenceResult.records.forEach((record: any) => {
          issues.push(
            `Production node ${record.get("prod.id")} references test evidence ${record.get("testEvidence.id")}`
          );
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      issues.push(`Validation failed: ${error}`);
    } finally {
      await this.neo4jService.disconnect();
    }

    return {
      isValid: issues.length === 0,
      issues,
      testDataCount,
      productionDataCount,
    };
  }

  /**
   * Get current test session
   */
  getCurrentSession(): TestDataConfig | null {
    return this.currentConfig;
  }

  /**
   * Check if test mode is active
   */
  isTestModeActive(): boolean {
    return this.currentConfig?.enabled === true;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  /**
   * Cleanup specific test session
   */
  private async cleanupTestSession(
    sessionId: string
  ): Promise<TestDataCleanupResult> {
    return await this.cleanupTestDataNeo4j(sessionId);
  }
}
