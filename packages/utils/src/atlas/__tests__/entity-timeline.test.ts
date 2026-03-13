/**
 * Entity Timeline Utilities Tests
 *
 * Comprehensive tests for the clean entity timeline utility functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  fetchEntityInfo,
  generateIntrinsicEvents,
  fetchRelationshipEvents,
  filterTimelineEvents,
  calculateTimelineSummary,
  fetchEntityTimeline,
  validateTimelineFilters,
  createEgoGraphUrl,
  type EntityInfo,
  type TimelineEvent,
  type TimelineFilters,
} from "../entity-timeline";

// Mock Neo4j client - no real service calls
const mockClient = {
  executeRead: vi.fn(),
} as any;

// Mock data generators
const createMockEntityInfo = (
  overrides: Partial<EntityInfo> = {}
): EntityInfo => ({
  uid: "per:john_doe",
  name: "John Doe",
  type: "Person",
  dates: {
    birthDate: "1980-05-15",
    deathDate: undefined,
    founded: undefined,
    dissolved: undefined,
    launched: undefined,
    shutdown: undefined,
    date: undefined,
    endDate: undefined,
    independence: undefined,
  },
  ...overrides,
});

const createMockOrganization = (): EntityInfo => ({
  uid: "org:acme_corp",
  name: "ACME Corp",
  type: "Organization",
  dates: {
    birthDate: undefined,
    deathDate: undefined,
    founded: "2000-01-01",
    dissolved: "2020-12-31",
    launched: undefined,
    shutdown: undefined,
    date: undefined,
    endDate: undefined,
    independence: undefined,
  },
});

const createMockTimelineEvent = (
  overrides: Partial<TimelineEvent> = {}
): TimelineEvent => ({
  id: "event-123",
  timestamp: "2024-01-15T10:30:00Z",
  eventType: "relationship",
  category: "speech_act",
  title: "Test Event",
  description: "A test timeline event",
  confidence: 0.85,
  importance: "major",
  ...overrides,
});

describe("Entity Timeline Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchEntityInfo", () => {
    it("should fetch entity information successfully", async () => {
      const mockRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const data: Record<string, any> = {
            uid: "per:jane_smith",
            name: "Jane Smith",
            type: "Person",
            birthDate: "1985-03-20",
            deathDate: null,
            founded: null,
            dissolved: null,
            launched: null,
            shutdown: null,
            date: null,
            endDate: null,
            independence: null,
          };
          return data[key];
        }),
      };

      mockClient.executeRead.mockResolvedValue({
        records: [mockRecord],
      });

      const result = await fetchEntityInfo(mockClient as any, "per:jane_smith");

      expect(result).toEqual({
        uid: "per:jane_smith",
        name: "Jane Smith",
        type: "Person",
        dates: {
          birthDate: "1985-03-20",
          deathDate: null,
          founded: null,
          dissolved: null,
          launched: null,
          shutdown: null,
          date: null,
          endDate: null,
          independence: null,
        },
      });

      expect(mockClient.executeRead).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (e {uid: $entityUid})"),
        { entityUid: "per:jane_smith" }
      );
    });

    it("should return null for non-existent entity", async () => {
      mockClient.executeRead.mockResolvedValue({
        records: [],
      });

      const result = await fetchEntityInfo(mockClient as any, "per:not_found");

      expect(result).toBeNull();
    });
  });

  describe("generateIntrinsicEvents", () => {
    it("should generate birth and death events for person", () => {
      const entity = createMockEntityInfo({
        dates: {
          birthDate: "1980-05-15",
          deathDate: "2050-12-25",
        },
      });

      const events = generateIntrinsicEvents(entity);

      expect(events).toHaveLength(3); // birth, death, lifespan

      const birthEvent = events.find((e) => e.category === "birth");
      expect(birthEvent).toEqual({
        id: "intrinsic-birth-per:john_doe",
        timestamp: "1980-05-15",
        eventType: "intrinsic",
        category: "birth",
        title: "Birth of John Doe",
        description: "John Doe was born",
        confidence: 1.0,
        importance: "critical",
      });

      const deathEvent = events.find((e) => e.category === "death");
      expect(deathEvent).toEqual({
        id: "intrinsic-death-per:john_doe",
        timestamp: "2050-12-25",
        eventType: "intrinsic",
        category: "death",
        title: "Death of John Doe",
        description: "John Doe died",
        confidence: 1.0,
        importance: "critical",
      });

      const lifespanEvent = events.find((e) => e.category === "lifespan");
      expect(lifespanEvent).toEqual({
        id: "intrinsic-lifespan-per:john_doe",
        timestamp: "1980-05-15",
        endDate: "2050-12-25",
        eventType: "ongoing",
        category: "lifespan",
        title: "Lifespan of John Doe",
        description: "Period of John Doe's life",
        confidence: 1.0,
        importance: "major",
      });
    });

    it("should generate founding and dissolution events for organization", () => {
      const entity = createMockOrganization();
      const events = generateIntrinsicEvents(entity);

      expect(events).toHaveLength(3); // founding, dissolution, operational period

      const foundingEvent = events.find((e) => e.category === "founding");
      expect(foundingEvent).toEqual({
        id: "intrinsic-founding-org:acme_corp",
        timestamp: "2000-01-01",
        eventType: "intrinsic",
        category: "founding",
        title: "Founding of ACME Corp",
        description: "ACME Corp was founded",
        confidence: 1.0,
        importance: "major",
      });

      const operationalEvent = events.find(
        (e) => e.category === "operational_period"
      );
      expect(operationalEvent).toEqual({
        id: "intrinsic-operational-org:acme_corp",
        timestamp: "2000-01-01",
        endDate: "2020-12-31",
        eventType: "ongoing",
        category: "operational_period",
        title: "Operational period of ACME Corp",
        description: "Period when ACME Corp was active",
        confidence: 1.0,
        importance: "major",
      });
    });

    it("should handle entity with no dates", () => {
      const entity = createMockEntityInfo({
        dates: {},
      });

      const events = generateIntrinsicEvents(entity);

      expect(events).toHaveLength(0);
    });
  });

  describe("fetchRelationshipEvents", () => {
    it("should fetch relationship events with proper filtering", async () => {
      const mockRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const data: Record<string, any> = {
            relationshipId: "rel-123",
            relationshipType: "SPEECH_ACT",
            timestamp: "2024-01-15T10:30:00Z",
            endDate: null,
            category: "political_statement",
            description: "Made critical statement about democracy",
            targetUid: "org:democratic_institutions",
            targetName: "Democratic Institutions",
            targetType: "Organization",
            confidence: 0.92,
            importance: "critical",
            evidenceList: [
              {
                uid: "evidence-456",
                title: "Video Recording",
                publisher: "News Outlet",
                url: "https://example.com/video",
                reliability: 0.95,
              },
            ],
          };
          return data[key];
        }),
      };

      mockClient.executeRead.mockResolvedValue({
        records: [mockRecord],
      });

      const filters: TimelineFilters = {
        limit: 50,
        relationshipTypes: ["SPEECH_ACT"],
      };

      const events = await fetchRelationshipEvents(
        mockClient as any,
        "per:test_person",
        filters
      );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        id: "rel-123",
        timestamp: "2024-01-15T10:30:00Z",
        endDate: undefined,
        eventType: "relationship",
        category: "political_statement",
        title: "Made critical statement about democracy",
        description: "Made critical statement about democracy",
        relationshipType: "SPEECH_ACT",
        targetEntity: {
          uid: "org:democratic_institutions",
          name: "Democratic Institutions",
          type: "Organization",
        },
        evidence: [
          {
            uid: "evidence-456",
            title: "Video Recording",
            publisher: "News Outlet",
            url: "https://example.com/video",
            reliability: 0.95,
          },
        ],
        confidence: 0.92,
        importance: "critical",
      });

      expect(mockClient.executeRead).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (source {uid: $entityUid})-[r]->(target)"
        ),
        expect.objectContaining({
          entityUid: "per:test_person",
          relationshipTypes: ["SPEECH_ACT"],
        })
      );
    });

    it("should handle duration events with end dates", async () => {
      const mockRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const data: Record<string, any> = {
            relationshipId: "rel-duration",
            relationshipType: "INVESTIGATION",
            timestamp: "2024-01-01T00:00:00Z",
            endDate: "2024-03-31T23:59:59Z",
            category: "legal_proceedings",
            description: "Ongoing legal investigation",
            targetUid: "org:justice_dept",
            targetName: "Department of Justice",
            targetType: "Organization",
            confidence: 0.88,
            importance: "major",
            evidenceList: [],
          };
          return data[key];
        }),
      };

      mockClient.executeRead.mockResolvedValue({
        records: [mockRecord],
      });

      const events = await fetchRelationshipEvents(
        mockClient as any,
        "per:test_person"
      );

      expect(events[0].eventType).toBe("ongoing");
      expect(events[0].endDate).toBe("2024-03-31T23:59:59Z");
    });
  });

  describe("filterTimelineEvents", () => {
    const mockEvents = [
      createMockTimelineEvent({
        id: "event-1",
        timestamp: "2024-01-15T10:00:00Z",
        category: "political_statement",
        importance: "critical",
      }),
      createMockTimelineEvent({
        id: "event-2",
        timestamp: "2024-02-20T14:00:00Z",
        category: "media_interaction",
        importance: "minor",
      }),
      createMockTimelineEvent({
        id: "event-3",
        timestamp: "2024-03-10T16:00:00Z",
        category: "political_statement",
        importance: "major",
      }),
    ];

    it("should filter by categories", () => {
      const filters: TimelineFilters = {
        categories: ["political_statement"],
      };

      const filtered = filterTimelineEvents(mockEvents, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.category === "political_statement")).toBe(
        true
      );
    });

    it("should filter by importance", () => {
      const filters: TimelineFilters = {
        importance: ["critical", "major"],
      };

      const filtered = filterTimelineEvents(mockEvents, filters);

      expect(filtered).toHaveLength(2);
      expect(
        filtered.every((e) => ["critical", "major"].includes(e.importance))
      ).toBe(true);
    });

    it("should filter by date range", () => {
      const filters: TimelineFilters = {
        dateRange: {
          from: "2024-02-01",
          to: "2024-02-28",
        },
      };

      const filtered = filterTimelineEvents(mockEvents, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("event-2");
    });

    it("should apply multiple filters", () => {
      const filters: TimelineFilters = {
        categories: ["political_statement"],
        importance: ["critical"],
      };

      const filtered = filterTimelineEvents(mockEvents, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("event-1");
    });
  });

  describe("calculateTimelineSummary", () => {
    it("should calculate correct summary statistics", () => {
      const events = [
        createMockTimelineEvent({
          eventType: "intrinsic",
          importance: "critical",
        }),
        createMockTimelineEvent({
          eventType: "relationship",
          importance: "critical",
        }),
        createMockTimelineEvent({
          eventType: "relationship",
          importance: "major",
        }),
        createMockTimelineEvent({
          timestamp: "2024-01-01T00:00:00Z",
          eventType: "ongoing",
          importance: "minor",
        }),
        createMockTimelineEvent({
          timestamp: "2024-03-31T23:59:59Z",
          eventType: "milestone",
          importance: "major",
        }),
      ];

      const summary = calculateTimelineSummary(events);

      expect(summary).toEqual({
        totalEvents: 5,
        eventsByType: {
          intrinsic: 1,
          relationship: 2,
          ongoing: 1,
          milestone: 1,
        },
        eventsByImportance: {
          critical: 2,
          major: 2,
          minor: 1,
        },
        dateRange: {
          earliest: "2024-01-01T00:00:00Z",
          latest: "2024-03-31T23:59:59Z",
        },
      });
    });

    it("should handle empty events array", () => {
      const summary = calculateTimelineSummary([]);

      expect(summary).toEqual({
        totalEvents: 0,
        eventsByType: {},
        eventsByImportance: {},
        dateRange: undefined,
      });
    });
  });

  describe("fetchEntityTimeline", () => {
    it("should fetch complete timeline with intrinsic and relationship events", async () => {
      const entityRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const entityData: Record<string, any> = {
            uid: "per:test_person",
            name: "Test Person",
            type: "Person",
            birthDate: "1980-01-01",
            deathDate: null,
            founded: null,
            dissolved: null,
            launched: null,
            shutdown: null,
            date: null,
            endDate: null,
            independence: null,
          };
          return entityData[key];
        }),
      };

      const relationshipRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const relData: Record<string, any> = {
            relationshipId: "rel-456",
            relationshipType: "OWNS",
            timestamp: "2010-05-15T00:00:00Z",
            endDate: null,
            category: "business",
            description: "Founded startup company",
            targetUid: "org:startup_inc",
            targetName: "Startup Inc",
            targetType: "Organization",
            confidence: 0.95,
            importance: "major",
            evidenceList: [],
          };
          return relData[key];
        }),
      };

      // Mock entity fetch
      mockClient.executeRead
        .mockResolvedValueOnce({
          records: [entityRecord],
        })
        // Mock relationship events fetch
        .mockResolvedValueOnce({
          records: [relationshipRecord],
        });

      const result = await fetchEntityTimeline(
        mockClient as any,
        "per:test_person"
      );

      expect(result.entity.uid).toBe("per:test_person");
      expect(result.events.length).toBeGreaterThan(0);

      // Should have intrinsic birth event
      const birthEvent = result.events.find((e) => e.category === "birth");
      expect(birthEvent).toBeDefined();
      expect(birthEvent?.timestamp).toBe("1980-01-01");

      // Should have relationship event
      const relationshipEvent = result.events.find(
        (e) => e.category === "business"
      );
      expect(relationshipEvent).toBeDefined();
      expect(relationshipEvent?.relationshipType).toBe("OWNS");

      expect(result.summary.totalEvents).toBe(result.events.length);
    });

    it("should throw error for non-existent entity", async () => {
      mockClient.executeRead.mockResolvedValue({
        records: [],
      });

      await expect(
        fetchEntityTimeline(mockClient as any, "per:not_found")
      ).rejects.toThrow("Entity per:not_found not found");
    });

    it("should apply filters correctly", async () => {
      const entityRecord = {
        get: vi.fn().mockImplementation((key: string) => {
          const entityData: Record<string, any> = {
            uid: "per:test_person",
            name: "Test Person",
            type: "Person",
            birthDate: "1980-01-01",
          };
          return entityData[key] || null;
        }),
      };

      mockClient.executeRead
        .mockResolvedValueOnce({ records: [entityRecord] })
        .mockResolvedValueOnce({ records: [] });

      const filters: TimelineFilters = {
        importance: ["critical"],
        limit: 10,
      };

      const result = await fetchEntityTimeline(
        mockClient as any,
        "per:test_person",
        filters
      );

      // Should only include critical importance events
      const criticalEvents = result.events.filter(
        (e) => e.importance === "critical"
      );
      expect(criticalEvents.length).toBe(result.events.length);
    });
  });

  describe("validateTimelineFilters", () => {
    it("should validate correct filters", () => {
      const filters: TimelineFilters = {
        dateRange: {
          from: "2024-01-01",
          to: "2024-12-31",
        },
        importance: ["critical", "major"],
        limit: 100,
      };

      const validation = validateTimelineFilters(filters);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject invalid date format", () => {
      const filters: TimelineFilters = {
        dateRange: {
          from: "01/01/2024", // Wrong format
          to: "2024-12-31",
        },
      };

      const validation = validateTimelineFilters(filters);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "From date must be in YYYY-MM-DD format"
      );
    });

    it("should reject invalid date order", () => {
      const filters: TimelineFilters = {
        dateRange: {
          from: "2024-12-31",
          to: "2024-01-01", // After from date
        },
      };

      const validation = validateTimelineFilters(filters);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("From date must be before to date");
    });

    it("should reject invalid limit", () => {
      const filters: TimelineFilters = {
        limit: 2000, // Too high
      };

      const validation = validateTimelineFilters(filters);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Limit must be between 1 and 1000");
    });

    it("should reject invalid importance values", () => {
      const filters: TimelineFilters = {
        importance: ["critical", "super-critical"] as any, // Invalid value
      };

      const validation = validateTimelineFilters(filters);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Invalid importance values: super-critical"
      );
    });
  });

  describe("createEgoGraphUrl", () => {
    it("should create correct ego graph URL", () => {
      const url = createEgoGraphUrl("per:test_person", "2024-01-15T10:30:00Z");

      expect(url).toBe(
        "http://localhost:3000/atlas?mode=ego&center=per:test_person&date=2024-01-15"
      );
    });

    it("should use custom base URL", () => {
      const url = createEgoGraphUrl(
        "per:test_person",
        "2024-01-15T10:30:00Z",
        "https://rabbit-hole.io"
      );

      expect(url).toBe(
        "https://rabbit-hole.io/atlas?mode=ego&center=per:test_person&date=2024-01-15"
      );
    });

    it("should extract date from ISO timestamp", () => {
      const url = createEgoGraphUrl("org:test_org", "2024-03-20T15:45:30.123Z");

      expect(url).toContain("date=2024-03-20");
    });
  });
});
