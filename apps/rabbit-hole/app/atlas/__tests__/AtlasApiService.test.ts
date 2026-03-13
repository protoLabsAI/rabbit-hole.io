import { describe, test, expect, beforeEach, vi } from "vitest";

import { AtlasApiService } from "../services/AtlasApiService";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe.skip("AtlasApiService", () => {
  let service: AtlasApiService;

  beforeEach(() => {
    service = new AtlasApiService();
    mockFetch.mockClear();
  });

  describe("loadGraphData", () => {
    test("loads full atlas data correctly", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodes: [{ id: "1", label: "Test", entityType: "person" }],
          edges: [{ id: "e1", source: "1", target: "2", label: "knows" }],
          meta: { nodeCount: 1, edgeCount: 1, generatedAt: "2024-01-01" },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.loadGraphData({
        viewMode: "full-atlas",
        centerEntity: null,
        communityId: null,
        timeWindow: { from: "2024-01-01", to: "2024-12-31" },
        egoSettings: { hops: 1, nodeLimit: 50, sentiments: null },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/atlas-v2?pageSize=500"
      );
      expect(result.success).toBe(true);
      expect(result.data.nodes).toHaveLength(1);
      expect(result.data.edges).toHaveLength(1);
    });

    test("loads ego network data with correct parameters", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodes: [{ id: "center", label: "Center", entityType: "person" }],
          edges: [],
          nodeCount: 1,
          edgeCount: 0,
          meta: { bounded: true },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.loadGraphData({
        viewMode: "ego",
        centerEntity: "person-123",
        communityId: null,
        timeWindow: { from: "2024-01-01", to: "2024-12-31" },
        egoSettings: { hops: 2, nodeLimit: 100, sentiments: ["supportive"] },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/graph-tiles/ego/person-123?nodeLimit=100&hops=2&sentiments=supportive"
      );
      expect(result.success).toBe(true);
    });

    test("loads community data with time window", async () => {
      const mockResponse = {
        success: true,
        data: { nodes: [], edges: [], nodeCount: 0, edgeCount: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.loadGraphData({
        viewMode: "community",
        centerEntity: null,
        communityId: 5,
        timeWindow: { from: "2024-01-01", to: "2024-06-30" },
        egoSettings: { hops: 1, nodeLimit: 50, sentiments: null },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/graph-tiles/community/5?nodeLimit=200&edgeLimit=400&from=2024-01-01&to=2024-06-30"
      );
    });

    test("loads timeslice data with correct parameters", async () => {
      const mockResponse = {
        success: true,
        data: { nodes: [], edges: [], nodeCount: 0, edgeCount: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.loadGraphData({
        viewMode: "timeslice",
        centerEntity: null,
        communityId: null,
        timeWindow: { from: "2024-03-01", to: "2024-03-31" },
        egoSettings: { hops: 1, nodeLimit: 50, sentiments: null },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/graph-tiles/timeslice?from=2024-03-01&to=2024-03-31&nodeLimit=300&edgeLimit=600&minActivity=1"
      );
    });

    test("handles API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: false, error: "Database error" }),
      });

      const result = await service.loadGraphData({
        viewMode: "full-atlas",
        centerEntity: null,
        communityId: null,
        timeWindow: { from: "2024-01-01", to: "2024-12-31" },
        egoSettings: { hops: 1, nodeLimit: 50, sentiments: null },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    test("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.loadGraphData({
        viewMode: "full-atlas",
        centerEntity: null,
        communityId: null,
        timeWindow: { from: "2024-01-01", to: "2024-12-31" },
        egoSettings: { hops: 1, nodeLimit: 50, sentiments: null },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  describe("loadNodeDetails", () => {
    test("loads node details successfully", async () => {
      const mockDetails = {
        success: true,
        data: {
          id: "person-123",
          label: "John Doe",
          details: { bio: "Test bio" },
          relationships: [],
          evidence: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDetails),
      });

      const result = await service.loadNodeDetails("person-123");

      expect(mockFetch).toHaveBeenCalledWith("/api/atlas-details/person-123");
      expect(result.success).toBe(true);
      expect(result.data.id).toBe("person-123");
    });

    test("handles node details API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: false, error: "Node not found" }),
      });

      const result = await service.loadNodeDetails("invalid-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Node not found");
    });
  });

  describe("refreshGraphData", () => {
    test("refreshes graph data from atlas endpoint", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodes: [{ id: "1", label: "Updated", entityType: "person" }],
          edges: [],
          meta: { nodeCount: 1, edgeCount: 0, refreshedAt: "2024-01-01" },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.refreshGraphData();

      expect(mockFetch).toHaveBeenCalledWith("/api/atlas-v2");
      expect(result.success).toBe(true);
      expect(result.data.nodes).toHaveLength(1);
    });
  });

  describe("loadTimeline", () => {
    test("loads timeline data for entity", async () => {
      const mockTimeline = {
        success: true,
        data: {
          timeline: [{ date: "2024-01-01", event: "Test event" }],
          summary: {
            dateRange: { earliest: "2024-01-01", latest: "2024-12-31" },
            relationshipTypes: { KNOWS: 5, WORKS_AT: 2 },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTimeline),
      });

      const result = await service.loadTimeline("person-123");

      expect(mockFetch).toHaveBeenCalledWith("/api/entity-timeline/person-123");
      expect(result.success).toBe(true);
      expect(result.data.timeline).toHaveLength(1);
    });
  });

  describe("entityResearch", () => {
    test("performs entity research with correct payload", async () => {
      const mockResponse = {
        success: true,
        data: { structuredEntity: { id: "new-person", name: "Jane Doe" } },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.entityResearch({
        targetPersonName: "Jane Doe",
        researchDepth: "detailed",
        focusAreas: ["biographical", "political"],
        existingPersonEntities: [],
        dataSourceConfig: { wikipedia: { enabled: true, maxResults: 2 } },
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/research/entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEntityName: "Jane Doe",
          entityType: "person",
          researchDepth: "detailed",
          rawData: [],
          focusAreas: ["biographical", "political"],
        }),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("exportBundle", () => {
    test("creates export URL with filters", async () => {
      const filters = {
        entityTypes: ["person", "organization"],
        timeWindow: { from: "2024-01-01", to: "2024-06-30" },
      };

      const exportUrl = service.buildExportUrl(filters);

      expect(exportUrl).toBe(
        "/api/export-bundle?types=person%2Corganization&from=2024-01-01&to=2024-06-30"
      );
    });

    test("handles empty filters", () => {
      const exportUrl = service.buildExportUrl({});
      expect(exportUrl).toBe("/api/export-bundle");
    });
  });
});
