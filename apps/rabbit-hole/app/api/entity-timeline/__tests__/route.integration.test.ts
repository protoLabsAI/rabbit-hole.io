/**
 * Entity Timeline API Integration Tests
 *
 * Tests for the entity timeline API with Neo4j integer conversion
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "../[entityUid]/route";

// Mock the Neo4j client and utilities
vi.mock("@protolabsai/database", () => ({
  getGlobalNeo4jClient: vi.fn(() => ({
    executeRead: vi.fn(),
  })),
}));

vi.mock("@protolabsai/utils/atlas", () => ({
  fetchEntityTimeline: vi.fn(),
  validateTimelineFilters: vi.fn(() => ({ isValid: true })),
}));

vi.mock("neo4j-driver", () => ({
  default: {
    int: vi.fn((value: number) => ({ __isNeo4jInteger: true, value })),
  },
}));

describe.skip("Entity Timeline API", () => {
  const createMockRequest = (url: string) => {
    return new NextRequest(url, { method: "GET" });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Parameter Handling", () => {
    it("should handle limit parameter with neo4j.int conversion", async () => {
      const { fetchEntityTimeline } = await import("@protolabsai/utils/atlas");
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);

      mockFetchEntityTimeline.mockResolvedValue({
        entity: {
          uid: "per:test",
          name: "Test Person",
          type: "Person",
          dates: {},
        },
        events: [],
        summary: {
          totalEvents: 0,
          eventsByType: {},
          eventsByImportance: {},
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test?limit=50"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      await GET(request, { params });

      // Verify fetchEntityTimeline was called with client wrapper
      expect(mockFetchEntityTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          executeRead: expect.any(Function),
        }),
        "per:test",
        expect.objectContaining({
          limit: 50,
        })
      );
    });

    it("should handle requests without limit parameter", async () => {
      const { fetchEntityTimeline } = await import("@protolabsai/utils/atlas");
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);

      mockFetchEntityTimeline.mockResolvedValue({
        entity: {
          uid: "per:test",
          name: "Test Person",
          type: "Person",
          dates: {},
        },
        events: [],
        summary: {
          totalEvents: 0,
          eventsByType: {},
          eventsByImportance: {},
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(mockFetchEntityTimeline).toHaveBeenCalledWith(
        expect.any(Object),
        "per:test",
        expect.objectContaining({
          limit: 100, // Default limit
        })
      );
    });

    it("should enforce maximum limit boundaries", async () => {
      const { fetchEntityTimeline } = await import("@protolabsai/utils/atlas");
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);

      mockFetchEntityTimeline.mockResolvedValue({
        entity: { uid: "per:test", name: "Test", type: "Person", dates: {} },
        events: [],
        summary: { totalEvents: 0, eventsByType: {}, eventsByImportance: {} },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test?limit=5000" // Exceeds max
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      await GET(request, { params });

      // Should cap at maximum limit (1000)
      expect(mockFetchEntityTimeline).toHaveBeenCalledWith(
        expect.any(Object),
        "per:test",
        expect.objectContaining({
          limit: 1000,
        })
      );
    });
  });

  describe("Date Range Validation", () => {
    it("should handle valid date ranges", async () => {
      const { fetchEntityTimeline, validateTimelineFilters } = await import(
        "@protolabsai/utils/atlas"
      );
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);
      const mockValidateTimelineFilters = vi.mocked(validateTimelineFilters);

      mockValidateTimelineFilters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockFetchEntityTimeline.mockResolvedValue({
        entity: { uid: "per:test", name: "Test", type: "Person", dates: {} },
        events: [],
        summary: { totalEvents: 0, eventsByType: {}, eventsByImportance: {} },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test?from=2024-01-01&to=2024-12-31"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(mockFetchEntityTimeline).toHaveBeenCalledWith(
        expect.any(Object),
        "per:test",
        expect.objectContaining({
          dateRange: {
            from: "2024-01-01",
            to: "2024-12-31",
          },
        })
      );
    });

    it("should reject invalid date formats", async () => {
      const { validateTimelineFilters } = await import(
        "@protolabsai/utils/atlas"
      );
      const mockValidateTimelineFilters = vi.mocked(validateTimelineFilters);

      mockValidateTimelineFilters.mockReturnValue({
        isValid: false,
        errors: ["Invalid date format"],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test?from=invalid-date"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid date format");
    });
  });

  describe("Error Handling", () => {
    it("should handle entity not found errors", async () => {
      const { fetchEntityTimeline, validateTimelineFilters } = await import(
        "@protolabsai/utils/atlas"
      );
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);
      const mockValidateTimelineFilters = vi.mocked(validateTimelineFilters);

      mockValidateTimelineFilters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockFetchEntityTimeline.mockRejectedValue(
        new Error("Entity per:nonexistent not found")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:nonexistent"
      );
      const params = Promise.resolve({ entityUid: "per:nonexistent" });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Entity per:nonexistent not found");
    });

    it("should handle database connection errors", async () => {
      const { fetchEntityTimeline, validateTimelineFilters } = await import(
        "@protolabsai/utils/atlas"
      );
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);
      const mockValidateTimelineFilters = vi.mocked(validateTimelineFilters);

      mockValidateTimelineFilters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockFetchEntityTimeline.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      const response = await GET(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Database connection failed");
    });
  });

  describe("Response Format", () => {
    it("should return properly formatted timeline response", async () => {
      const { fetchEntityTimeline, validateTimelineFilters } = await import(
        "@protolabsai/utils/atlas"
      );
      const mockFetchEntityTimeline = vi.mocked(fetchEntityTimeline);
      const mockValidateTimelineFilters = vi.mocked(validateTimelineFilters);

      mockValidateTimelineFilters.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const mockTimeline = {
        entity: {
          uid: "per:test",
          name: "Test Person",
          type: "Person",
          dates: { birthDate: "1980-01-01" },
        },
        events: [
          {
            id: "event-1",
            timestamp: "2024-01-15T10:00:00Z",
            eventType: "relationship" as const,
            category: "test",
            title: "Test Event",
            confidence: 0.8,
            importance: "minor" as const,
          },
        ],
        summary: {
          totalEvents: 1,
          eventsByType: { relationship: 1 },
          eventsByImportance: { minor: 1 },
          dateRange: {
            earliest: "2024-01-15T10:00:00Z",
            latest: "2024-01-15T10:00:00Z",
          },
        },
      };

      mockFetchEntityTimeline.mockResolvedValue(mockTimeline);

      const request = createMockRequest(
        "http://localhost:3000/api/entity-timeline/per:test"
      );
      const params = Promise.resolve({ entityUid: "per:test" });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toEqual(mockTimeline);
      expect(data.entity.uid).toBe("per:test");
      expect(data.events).toHaveLength(1);
      expect(data.summary.totalEvents).toBe(1);
    });
  });
});
