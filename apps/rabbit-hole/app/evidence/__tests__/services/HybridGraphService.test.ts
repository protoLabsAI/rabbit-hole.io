/**
 * Hybrid Graph Service Tests
 *
 * Tests the intelligent backend selection logic that chooses between
 * Neo4j and JSON partitions based on availability and performance needs.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { HybridGraphService } from "../../services/HybridGraphService";
import { setupTestEnvironment, mockEvidenceGraphData } from "../setup";

// Mock the config module
vi.mock("../../../config/database.config", () => ({
  getDefaultConfig: () => ({
    type: "partitions",
    neo4j: {
      uri: "bolt://localhost:7687",
      username: "neo4j",
      password: "test",
      database: "test",
    },
    partitions: {
      basePath: "/test/partitions",
      enableCaching: true,
      cacheTtl: 600000,
    },
    performance: {
      maxNodes: 10000,
      batchSize: 1000,
      queryTimeout: 30000,
    },
  }),
  validateConfig: () => ({ isValid: true, errors: [] }),
}));

describe.skip("HybridGraphService", () => {
  let hybridService: HybridGraphService;
  let mockFetch: any;

  beforeEach(() => {
    setupTestEnvironment();
    hybridService = new HybridGraphService();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe("Backend Detection", () => {
    it("should detect Neo4j as preferred when available with data", async () => {
      // Mock successful status API response with Neo4j data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            neo4j: {
              available: true,
              nodeCount: 30,
              edgeCount: 25,
              evidenceCount: 15,
            },
            partitions: {
              available: true,
              totalNodes: 30,
              totalEdges: 25,
              totalEvidence: 15,
            },
            recommendation: {
              backend: "neo4j",
              reason: "Neo4j contains data and provides superior performance",
              performanceProfile: "medium",
            },
          }),
      });

      const status = await hybridService.initialize();

      expect(status.activeBackend).toBe("neo4j");
      expect(status.neo4jAvailable).toBe(true);
      expect(status.partitionsAvailable).toBe(true);
      expect(status.performanceProfile).toBe("medium");
    });

    it("should fall back to partitions when Neo4j unavailable", async () => {
      // Mock status API response with Neo4j unavailable
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            neo4j: {
              available: false,
              nodeCount: 0,
              error: "Connection failed",
            },
            partitions: {
              available: true,
              totalNodes: 30,
              totalEdges: 25,
              totalEvidence: 15,
            },
            recommendation: {
              backend: "partitions",
              reason: "Only partitions available",
              performanceProfile: "medium",
            },
          }),
      });

      const status = await hybridService.initialize();

      expect(status.activeBackend).toBe("partitions");
      expect(status.neo4jAvailable).toBe(false);
      expect(status.partitionsAvailable).toBe(true);
    });

    it("should handle status API failure gracefully", async () => {
      // Mock failed status API
      mockFetch.mockRejectedValueOnce(new Error("API failed"));

      // Mock partition loader for fallback
      const mockPartitionLoader = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };
      (hybridService as any).partitionLoader = mockPartitionLoader;

      const status = await hybridService.initialize();

      expect(status.activeBackend).toBe("partitions");
      expect(status.reason).toContain("Server status check failed");
    });
  });

  describe("Performance Profile Detection", () => {
    it("should classify performance profiles correctly", async () => {
      const testCases = [
        { nodeCount: 50, expected: "small" },
        { nodeCount: 5000, expected: "medium" },
        { nodeCount: 50000, expected: "large" },
        { nodeCount: 500000, expected: "enterprise" },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              neo4j: { available: true, nodeCount: testCase.nodeCount },
              partitions: { available: true, totalNodes: testCase.nodeCount },
              recommendation: {
                backend: "neo4j",
                performanceProfile: testCase.expected,
              },
            }),
        });

        const status = await hybridService.initialize();
        expect(status.performanceProfile).toBe(testCase.expected);
      }
    });
  });

  describe("Data Loading", () => {
    beforeEach(async () => {
      // Initialize with Neo4j backend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            neo4j: { available: true, nodeCount: 30 },
            partitions: { available: true, totalNodes: 30 },
            recommendation: { backend: "neo4j", performanceProfile: "medium" },
          }),
      });

      await hybridService.initialize();
    });

    it("should load data via Neo4j API when Neo4j is active backend", async () => {
      // Mock successful Neo4j API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: mockEvidenceGraphData,
            backend: "neo4j",
          }),
      });

      const result = await hybridService.loadGraph({ maxNodes: 100 });

      expect(result).toEqual(mockEvidenceGraphData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/evidence-graph?")
      );
    });

    it("should include query parameters in Neo4j API calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: mockEvidenceGraphData,
          }),
      });

      await hybridService.loadGraph({
        entityTypes: ["person", "platform"],
        focusNodes: ["n_test"],
        maxNodes: 500,
        includeEvidence: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/entityTypes=person%2Cplatform/)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/focusNodes=n_test/)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/maxNodes=500/)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/includeEvidence=false/)
      );
    });

    it("should fall back to partitions when Neo4j API fails", async () => {
      // Mock failed Neo4j API
      mockFetch.mockRejectedValueOnce(new Error("Neo4j API failed"));

      // Mock successful partition loading
      const mockPartitionLoader = {
        loadGraph: vi.fn().mockResolvedValue(mockEvidenceGraphData),
      };
      (hybridService as any).partitionLoader = mockPartitionLoader;

      const result = await hybridService.loadGraph();

      expect(result).toEqual(mockEvidenceGraphData);
      expect(mockPartitionLoader.loadGraph).toHaveBeenCalled();
    });
  });

  describe("Performance Recommendations", () => {
    it("should recommend Neo4j for large datasets", async () => {
      // Initialize with large dataset scenario
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            neo4j: { available: false },
            partitions: { available: true, totalNodes: 15000 },
            recommendation: {
              backend: "partitions",
              performanceProfile: "large",
            },
          }),
      });

      await hybridService.initialize();
      const recommendations = hybridService.getPerformanceRecommendations();

      expect(recommendations.recommendations).toContainEqual(
        expect.stringContaining("Consider migrating to Neo4j")
      );
    });

    it("should provide accurate performance estimates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            neo4j: { available: true },
            recommendation: { backend: "neo4j" },
          }),
      });

      await hybridService.initialize();
      const recommendations = hybridService.getPerformanceRecommendations();

      expect(recommendations.estimatedPerformance.loadTime).toBe("< 1s");
      expect(recommendations.estimatedPerformance.memoryUsage).toBe(
        "Low (streaming)"
      );
      expect(recommendations.estimatedPerformance.queryPerformance).toBe(
        "Excellent"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization failures gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Complete API failure"));

      // Mock partition loader failure too
      const mockPartitionLoader = {
        initialize: vi.fn().mockRejectedValue(new Error("Partition failure")),
      };
      (hybridService as any).partitionLoader = mockPartitionLoader;

      const status = await hybridService.initialize();

      expect(status.activeBackend).toBe("unavailable");
      expect(status.reason).toContain("Server status check failed");
    });

    it("should throw error when no backends available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            recommendation: { backend: "unavailable" },
          }),
      });

      await hybridService.initialize();

      await expect(hybridService.loadGraph()).rejects.toThrow(
        "No database backend available"
      );
    });

    it("should require initialization before operations", () => {
      expect(() => {
        hybridService.getStatus();
      }).toThrow("Service not initialized");

      expect(() => {
        hybridService.getPerformanceRecommendations();
      }).toThrow("Service not initialized");
    });
  });
});
