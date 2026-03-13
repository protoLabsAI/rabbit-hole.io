/**
 * Shared Timeline Processor Tests
 *
 * Comprehensive vitest tests for consolidated timeline processing logic.
 * Tests both individual and batch processing scenarios.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  processTimelineRequest,
  processBatchTimelineRequests,
  type TimelineRequest,
} from "../shared-timeline-processor";

// Mock the dependencies
vi.mock("@proto/database", () => ({
  getGlobalNeo4jClient: vi.fn(),
}));

vi.mock("@proto/utils", () => ({
  createNeo4jClientWithIntegerConversion: vi.fn(),
  fetchEntityTimeline: vi.fn(),
  validateTimelineFilters: vi.fn(),
}));

const mockClient = {
  executeRead: vi.fn(),
};

const mockTimeline = {
  entity: {
    uid: "person:test_person",
    name: "Test Person",
    type: "Person",
    dates: {
      birthDate: "1980-01-01",
      deathDate: null,
    },
  },
  events: [
    {
      id: "birth-event",
      timestamp: "1980-01-01T00:00:00Z",
      eventType: "intrinsic",
      category: "birth",
      title: "Birth",
      importance: "major",
    },
    {
      id: "rel-event",
      timestamp: "2020-01-15T10:30:00Z",
      eventType: "relationship",
      category: "political",
      title: "ENDORSES Candidate X",
      importance: "minor",
    },
  ],
  summary: {
    totalEvents: 2,
    eventsByType: { intrinsic: 1, relationship: 1 },
    eventsByImportance: { major: 1, minor: 1 },
  },
};

describe.skip("Shared Timeline Processor", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mocks
    const { getGlobalNeo4jClient } = vi.mocked(await import("@proto/database"));
    const {
      createNeo4jClientWithIntegerConversion,
      fetchEntityTimeline,
      validateTimelineFilters,
    } = vi.mocked(await import("@proto/utils"));

    getGlobalNeo4jClient.mockReturnValue(mockClient as any);
    createNeo4jClientWithIntegerConversion.mockReturnValue(mockClient as any);
    validateTimelineFilters.mockReturnValue({ isValid: true, errors: [] });
    fetchEntityTimeline.mockResolvedValue(mockTimeline as any);
  });

  describe("processTimelineRequest", () => {
    it("should process valid timeline request successfully", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        timeWindow: {
          from: "2020-01-01",
          to: "2024-12-31",
        },
        importance: ["critical", "major"],
        limit: 100,
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toBeNull();
      expect(result.entityUid).toBe("person:test_person");
      expect(result.events).toHaveLength(2);
      expect(result.summary.entity.name).toBe("Test Person");
    });

    it("should handle requests without time window", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        importance: ["critical", "major", "minor"],
        limit: 50,
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toBeNull();
      expect(result.entityUid).toBe("person:test_person");
      expect(result.events).toHaveLength(2);
    });

    it("should validate entity UID format", async () => {
      const request: TimelineRequest = {
        entityUid: "invalid-uid-format",
        timeWindow: {
          from: "2020-01-01",
          to: "2024-12-31",
        },
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Invalid entity UID format");
      expect(result.events).toHaveLength(0);
    });

    it("should validate date format in time window", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        timeWindow: {
          from: "2020/01/01", // Invalid format
          to: "2024-12-31",
        },
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Date validation failed");
      expect(result.events).toHaveLength(0);
    });

    it("should validate date range order", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        timeWindow: {
          from: "2024-12-31",
          to: "2020-01-01", // End before start
        },
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Date validation failed");
      expect(result.events).toHaveLength(0);
    });

    it("should enforce pagination limits", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        limit: 9999, // Above max limit
      };

      const result = await processTimelineRequest(request, {
        maxLimit: 1000,
      });

      expect(result.error).toBeNull();
      // Should verify that limit was capped to maxLimit in the call to fetchEntityTimeline
    });

    it("should handle entity not found errors", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));
      fetchEntityTimeline.mockRejectedValue(
        new Error("Entity person:nonexistent not found")
      );

      const request: TimelineRequest = {
        entityUid: "person:nonexistent",
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("not found");
      expect(result.events).toHaveLength(0);
    });

    it("should handle filter validation failures", async () => {
      const { validateTimelineFilters } = vi.mocked(
        await import("@proto/utils")
      );
      validateTimelineFilters.mockReturnValue({
        isValid: false,
        errors: ["Invalid importance level"],
      });

      const request: TimelineRequest = {
        entityUid: "person:test_person",
        importance: ["invalid_importance"],
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Filter validation failed");
      expect(result.events).toHaveLength(0);
    });

    it("should handle database connection errors", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));
      fetchEntityTimeline.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request: TimelineRequest = {
        entityUid: "person:test_person",
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Database connection failed");
      expect(result.events).toHaveLength(0);
    });
  });

  describe("processBatchTimelineRequests", () => {
    it("should process multiple valid requests", async () => {
      const requests: TimelineRequest[] = [
        {
          entityUid: "person:test_person_1",
          timeWindow: { from: "2020-01-01", to: "2024-12-31" },
        },
        {
          entityUid: "person:test_person_2",
          timeWindow: { from: "2021-01-01", to: "2024-12-31" },
        },
      ];

      const batchResult = await processBatchTimelineRequests(requests);

      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.metadata.totalRequests).toBe(2);
      expect(batchResult.metadata.successfulRequests).toBe(2);
      expect(batchResult.metadata.failedRequests).toBe(0);
    });

    it("should handle empty batch requests", async () => {
      const requests: TimelineRequest[] = [];

      const batchResult = await processBatchTimelineRequests(requests);

      expect(batchResult.results).toHaveLength(0);
      expect(batchResult.metadata.totalRequests).toBe(0);
      expect(batchResult.metadata.successfulRequests).toBe(0);
      expect(batchResult.metadata.failedRequests).toBe(0);
    });

    it("should enforce batch size limits", async () => {
      const requests: TimelineRequest[] = new Array(25)
        .fill(null)
        .map((_, i) => ({
          entityUid: `person:test_person_${i}`,
        }));

      await expect(processBatchTimelineRequests(requests)).rejects.toThrow(
        "Too many requests - maximum 20 entities per batch"
      );
    });

    it("should handle mixed success and failure scenarios", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));

      // Mock different outcomes for different entities
      fetchEntityTimeline
        .mockResolvedValueOnce(mockTimeline as any) // Success for first entity
        .mockRejectedValueOnce(new Error("Entity not found")) // Failure for second entity
        .mockResolvedValueOnce(mockTimeline as any); // Success for third entity

      const requests: TimelineRequest[] = [
        { entityUid: "person:test_person_1" },
        { entityUid: "person:nonexistent" },
        { entityUid: "person:test_person_3" },
      ];

      const batchResult = await processBatchTimelineRequests(requests);

      expect(batchResult.results).toHaveLength(3);
      expect(batchResult.metadata.totalRequests).toBe(3);
      expect(batchResult.metadata.successfulRequests).toBe(2);
      expect(batchResult.metadata.failedRequests).toBe(1);

      // Check individual results
      expect(batchResult.results[0].error).toBeNull();
      expect(batchResult.results[1].error).toContain("not found");
      expect(batchResult.results[2].error).toBeNull();
    });

    it("should process requests with different parameters in parallel", async () => {
      const requests: TimelineRequest[] = [
        {
          entityUid: "person:test_person_1",
          timeWindow: { from: "2020-01-01", to: "2024-12-31" },
          importance: ["critical"],
          limit: 50,
        },
        {
          entityUid: "person:test_person_2",
          importance: ["major", "minor"],
          limit: 200,
        },
        {
          entityUid: "person:test_person_3",
          // No additional parameters - should use defaults
        },
      ];

      const batchResult = await processBatchTimelineRequests(requests);

      expect(batchResult.results).toHaveLength(3);
      expect(batchResult.metadata.successfulRequests).toBe(3);

      // All should have processed successfully with their specific parameters
      batchResult.results.forEach((result) => {
        expect(result.error).toBeNull();
        expect(result.events).toHaveLength(2);
      });
    });

    it("should handle validation errors in batch processing", async () => {
      const requests: TimelineRequest[] = [
        { entityUid: "person:valid_person" },
        { entityUid: "invalid-uid" }, // Invalid format
        {
          entityUid: "person:another_valid",
          timeWindow: { from: "invalid-date", to: "2024-12-31" },
        },
      ];

      const batchResult = await processBatchTimelineRequests(requests);

      expect(batchResult.results).toHaveLength(3);
      expect(batchResult.metadata.totalRequests).toBe(3);
      expect(batchResult.metadata.successfulRequests).toBe(1);
      expect(batchResult.metadata.failedRequests).toBe(2);

      // Check specific error messages
      expect(batchResult.results[0].error).toBeNull();
      expect(batchResult.results[1].error).toContain(
        "Invalid entity UID format"
      );
      expect(batchResult.results[2].error).toContain("Date validation failed");
    });
  });

  describe("Date Validation", () => {
    it("should accept valid ISO date formats", async () => {
      const validDates = [
        "2024-01-01",
        "2024-12-31",
        "2000-06-15",
        "1980-02-29", // Leap year
      ];

      for (const date of validDates) {
        const request: TimelineRequest = {
          entityUid: "person:test_person",
          timeWindow: { from: date, to: "2024-12-31" },
        };

        const result = await processTimelineRequest(request);
        expect(result.error).toBeNull();
      }
    });

    it("should reject invalid date formats", async () => {
      const invalidDates = [
        "2024/01/01", // Wrong separators
        "01-15-2024", // Wrong order
        "2024-1-15", // Missing leading zeros
        "15/01/2024", // European format
        "2024-13-01", // Invalid month
        "2024-01-32", // Invalid day
        "not-a-date",
        "",
      ];

      for (const date of invalidDates) {
        const request: TimelineRequest = {
          entityUid: "person:test_person",
          timeWindow: { from: date, to: "2024-12-31" },
        };

        const result = await processTimelineRequest(request);
        expect(result.error).toContain("Date validation failed");
      }
    });
  });

  describe("Entity UID Validation", () => {
    it("should accept valid entity UID formats", async () => {
      const validUIDs = [
        "person:donald_trump",
        "org:meta",
        "event:2024_election",
        "movement:qanon",
        "platform:truth_social",
      ];

      for (const uid of validUIDs) {
        const request: TimelineRequest = { entityUid: uid };
        const result = await processTimelineRequest(request);
        expect(result.error).toBeNull();
      }
    });

    it("should reject invalid entity UID formats", async () => {
      const invalidUIDs = [
        "donald_trump", // Missing type prefix
        "person:", // Missing identifier
        "person donald_trump", // Space instead of colon
        "PERSON:TRUMP", // Uppercase type
        "person:trump space", // Space in identifier
        "",
      ];

      for (const uid of invalidUIDs) {
        const request: TimelineRequest = { entityUid: uid };
        const result = await processTimelineRequest(request);
        expect(result.error).toContain("Invalid entity UID format");
      }
    });
  });

  describe("Pagination Limits", () => {
    it("should enforce maximum limits", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));

      const request: TimelineRequest = {
        entityUid: "person:test_person",
        limit: 5000, // Way above max
      };

      await processTimelineRequest(request, { maxLimit: 1000 });

      // Verify that the limit was capped
      expect(fetchEntityTimeline).toHaveBeenCalledWith(
        expect.anything(),
        "person:test_person",
        expect.objectContaining({
          limit: 1000, // Should be capped
        })
      );
    });

    it("should enforce minimum limits", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));

      const request: TimelineRequest = {
        entityUid: "person:test_person",
        limit: -5, // Negative limit
      };

      await processTimelineRequest(request);

      // Verify that the limit was set to minimum
      expect(fetchEntityTimeline).toHaveBeenCalledWith(
        expect.anything(),
        "person:test_person",
        expect.objectContaining({
          limit: 1, // Should be minimum
        })
      );
    });

    it("should use default limit when not specified", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));

      const request: TimelineRequest = {
        entityUid: "person:test_person",
        // No limit specified
      };

      await processTimelineRequest(request, { defaultLimit: 150 });

      expect(fetchEntityTimeline).toHaveBeenCalledWith(
        expect.anything(),
        "person:test_person",
        expect.objectContaining({
          limit: 150, // Should use default
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle fetchEntityTimeline failures gracefully", async () => {
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));
      fetchEntityTimeline.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request: TimelineRequest = {
        entityUid: "person:test_person",
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toBe("Database connection failed");
      expect(result.events).toHaveLength(0);
      expect(result.summary).toBeNull();
    });

    it("should handle filter validation failures", async () => {
      const { validateTimelineFilters } = vi.mocked(
        await import("@proto/utils")
      );
      validateTimelineFilters.mockReturnValue({
        isValid: false,
        errors: ["Invalid importance level", "Invalid date range"],
      });

      const request: TimelineRequest = {
        entityUid: "person:test_person",
        importance: ["invalid"],
      };

      const result = await processTimelineRequest(request);

      expect(result.error).toContain("Filter validation failed");
      expect(result.error).toContain("Invalid importance level");
    });
  });

  describe("Performance & Logging", () => {
    it("should log processing start and completion", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const request: TimelineRequest = {
        entityUid: "person:test_person",
      };

      await processTimelineRequest(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("🔍 Processing timeline for person:test_person")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "✅ Timeline processed for person:test_person: 2 events"
        )
      );

      consoleSpy.mockRestore();
    });

    it("should log errors appropriately", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { fetchEntityTimeline } = vi.mocked(await import("@proto/utils"));
      fetchEntityTimeline.mockRejectedValue(new Error("Test error"));

      const request: TimelineRequest = {
        entityUid: "person:test_person",
      };

      await processTimelineRequest(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "❌ Timeline processing failed for person:test_person:"
        ),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration with Analytics", () => {
    it("should return data structure compatible with analytics page", async () => {
      const request: TimelineRequest = {
        entityUid: "person:test_person",
        timeWindow: { from: "2020-01-01", to: "2024-12-31" },
        importance: ["critical", "major", "minor"],
        limit: 200,
      };

      const result = await processTimelineRequest(request);

      // Verify structure matches what analytics page expects
      expect(result).toEqual({
        entityUid: "person:test_person",
        events: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            timestamp: expect.any(String),
            eventType: expect.any(String),
            category: expect.any(String),
            title: expect.any(String),
            importance: expect.any(String),
          }),
        ]),
        summary: expect.objectContaining({
          totalEvents: expect.any(Number),
          eventsByType: expect.any(Object),
          eventsByImportance: expect.any(Object),
          entity: expect.objectContaining({
            uid: "person:test_person",
            name: "Test Person",
            type: "Person",
          }),
        }),
        error: null,
      });
    });
  });
});
