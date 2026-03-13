import { describe, it, expect } from "vitest";

import {
  EntitySchema,
  PersonEntitySchema,
  OrganizationEntitySchema,
  PlatformEntitySchema,
  MovementEntitySchema,
  EventEntitySchema,
  RelationshipSchema,
  EvidenceSchema,
  validateRabbitHoleBundle,
} from "../validation-schemas-modular";

describe.skip("Validation Schemas", () => {
  describe("Base EntitySchema", () => {
    it("should validate basic entity structure", () => {
      const validEntity = {
        uid: "person:test_person",
        type: "Person",
        name: "Test Person",
        aliases: ["TP"],
        tags: ["test_entity"],
      };

      const result = EntitySchema.safeParse(validEntity);
      expect(result.success).toBe(true);
    });

    it("should reject invalid entity types", () => {
      const invalidEntity = {
        uid: "invalid:test",
        type: "InvalidType",
        name: "Test",
      };

      const result = EntitySchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
    });

    it("should require name and uid", () => {
      const incompleteEntity = {
        type: "Person",
      };

      const result = EntitySchema.safeParse(incompleteEntity);
      expect(result.success).toBe(false);
    });
  });

  describe("PersonEntitySchema", () => {
    it("should validate person with comprehensive fields", () => {
      const person = {
        uid: "person:elon_musk",
        type: "Person",
        name: "Elon Musk",
        aliases: ["Space Karen"],
        tags: ["tech_ceo"],
        bio: "Entrepreneur and business magnate",
        birthDate: "1971-06-28",
        occupation: "CEO",
        politicalParty: "Independent",
        education: ["University of Pennsylvania"],
        socialMedia: {
          twitter: "@elonmusk",
          linkedin: "elon-musk",
        },
      };

      const result = PersonEntitySchema.safeParse(person);
      expect(result.success).toBe(true);
    });

    it("should reject invalid birth date format", () => {
      const person = {
        uid: "person:test",
        type: "Person",
        name: "Test Person",
        birthDate: "invalid-date",
      };

      const result = PersonEntitySchema.safeParse(person);
      expect(result.success).toBe(false);
    });

    it("should reject invalid age ranges", () => {
      const person = {
        uid: "person:test",
        type: "Person",
        name: "Test Person",
        age: 200,
      };

      const result = PersonEntitySchema.safeParse(person);
      expect(result.success).toBe(false);
    });
  });

  describe("OrganizationEntitySchema", () => {
    it("should validate organization with business properties", () => {
      const organization = {
        uid: "org:tesla_inc",
        type: "Organization",
        name: "Tesla Inc.",
        properties: {
          orgType: "corporation",
          founded: "2003",
          headquarters: "Austin, Texas",
          industry: "Electric Vehicles",
          revenue: 96773000000,
          employees: 140000,
          ceo: "Elon Musk",
          website: "https://tesla.com",
          legalStatus: "active",
          stockTicker: "TSLA",
        },
      };

      const result = OrganizationEntitySchema.safeParse(organization);
      expect(result.success).toBe(true);
    });

    it("should reject negative revenue", () => {
      const organization = {
        uid: "org:test",
        type: "Organization",
        name: "Test Org",
        properties: {
          revenue: -1000,
        },
      };

      const result = OrganizationEntitySchema.safeParse(organization);
      expect(result.success).toBe(false);
    });

    it("should reject invalid website URL", () => {
      const organization = {
        uid: "org:test",
        type: "Organization",
        name: "Test Org",
        properties: {
          website: "not-a-url",
        },
      };

      const result = OrganizationEntitySchema.safeParse(organization);
      expect(result.success).toBe(false);
    });
  });

  describe("PlatformEntitySchema", () => {
    it("should validate platform with digital properties", () => {
      const platform = {
        uid: "platform:twitter",
        type: "Platform",
        name: "Twitter",
        properties: {
          platformType: "social_media",
          launched: "2006-03-21",
          userBase: 450000000,
          parentCompany: "org:x_corp",
          businessModel: "advertising",
          status: "rebranded",
        },
      };

      const result = PlatformEntitySchema.safeParse(platform);
      expect(result.success).toBe(true);
    });

    it("should validate platform type enum", () => {
      const validTypes = [
        "social_media",
        "news",
        "video",
        "podcast",
        "messaging",
        "forum",
        "blog",
        "website",
      ];

      validTypes.forEach((platformType) => {
        const platform = {
          uid: "platform:test",
          type: "Platform",
          name: "Test Platform",
          properties: { platformType },
        };

        const result = PlatformEntitySchema.safeParse(platform);
        expect(result.success).toBe(true);
      });

      // Test invalid type
      const invalidPlatform = {
        uid: "platform:test",
        type: "Platform",
        name: "Test Platform",
        properties: { platformType: "invalid_type" },
      };

      const result = PlatformEntitySchema.safeParse(invalidPlatform);
      expect(result.success).toBe(false);
    });
  });

  describe("MovementEntitySchema", () => {
    it("should validate movement with political properties", () => {
      const movement = {
        uid: "movement:maga",
        type: "Movement",
        name: "MAGA Movement",
        properties: {
          ideology: "populist",
          founded: "2015",
          keyFigures: ["person:donald_trump", "person:steve_bannon"],
          geography: "United States",
          topic: "political",
          status: "active",
          size: "large",
          influence: "national",
        },
      };

      const result = MovementEntitySchema.safeParse(movement);
      expect(result.success).toBe(true);
    });

    it("should validate status enum values", () => {
      const validStatuses = ["active", "dormant", "defunct", "transformed"];

      validStatuses.forEach((status) => {
        const movement = {
          uid: "movement:test",
          type: "Movement",
          name: "Test Movement",
          properties: { status },
        };

        const result = MovementEntitySchema.safeParse(movement);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("EventEntitySchema", () => {
    it("should validate event with temporal properties", () => {
      const event = {
        uid: "event:january_6",
        type: "Event",
        name: "January 6th Capitol Riot",
        properties: {
          date: "2021-01-06",
          location: "Washington, D.C.",
          participants: ["person:donald_trump"],
          organizers: ["person:donald_trump"],
          eventType: "incident",
          impact: "national",
          duration: "6 hours",
          attendance: 10000,
          mediaAttention: "international",
        },
      };

      const result = EventEntitySchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should reject invalid date formats", () => {
      const event = {
        uid: "event:test",
        type: "Event",
        name: "Test Event",
        properties: {
          date: "invalid-date",
        },
      };

      const result = EventEntitySchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it("should validate event type enum", () => {
      const validTypes = [
        "conference",
        "rally",
        "protest",
        "meeting",
        "incident",
        "ceremony",
        "election",
        "legal_proceeding",
      ];

      validTypes.forEach((eventType) => {
        const event = {
          uid: "event:test",
          type: "Event",
          name: "Test Event",
          properties: { eventType },
        };

        const result = EventEntitySchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("RelationshipSchema", () => {
    it("should validate basic relationship", () => {
      const relationship = {
        uid: "rel:musk_owns_tesla",
        type: "OWNS",
        source: "person:elon_musk",
        target: "org:tesla_inc",
        confidence: 0.95,
        at: "2024-01-01T00:00:00Z",
      };

      const result = RelationshipSchema.safeParse(relationship);
      expect(result.success).toBe(true);
    });

    it("should reject invalid confidence range", () => {
      const relationship = {
        uid: "rel:test",
        type: "OWNS",
        source: "person:test",
        target: "org:test",
        confidence: 1.5,
      };

      const result = RelationshipSchema.safeParse(relationship);
      expect(result.success).toBe(false);
    });
  });

  describe("EvidenceSchema", () => {
    it("should validate evidence with reliability", () => {
      const evidence = {
        uid: "evidence:wapo_article",
        kind: "major_media",
        title: "Tesla Quarterly Report",
        publisher: "Washington Post",
        date: "2024-01-15",
        url: "https://washingtonpost.com/tesla-report",
        reliability: 0.9,
      };

      const result = EvidenceSchema.safeParse(evidence);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const evidence = {
        uid: "evidence:test",
        kind: "major_media",
        title: "Test Article",
        publisher: "Test Publisher",
        date: "2024-01-15",
        url: "not-a-url",
      };

      const result = EvidenceSchema.safeParse(evidence);
      expect(result.success).toBe(false);
    });
  });

  describe("Bundle Validation", () => {
    it("should validate complete bundle with references", () => {
      const bundle = {
        evidence: [
          {
            uid: "evidence:test_article",
            kind: "major_media",
            title: "Test Article",
            publisher: "Test Publisher",
            date: "2024-01-15",
            url: "https://test.com/article",
            reliability: 0.8,
          },
        ],
        entities: [
          {
            uid: "person:test_person",
            type: "Person",
            name: "Test Person",
          },
          {
            uid: "org:test_org",
            type: "Organization",
            name: "Test Organization",
            properties: {
              orgType: "corporation",
            },
          },
        ],
        relationships: [
          {
            uid: "rel:person_works_org",
            type: "OWNS",
            source: "person:test_person",
            target: "org:test_org",
            confidence: 0.9,
            properties: {
              evidence_uids: ["evidence:test_article"],
            },
          },
        ],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing entity references", () => {
      const bundle = {
        entities: [
          {
            uid: "person:test_person",
            type: "Person",
            name: "Test Person",
          },
        ],
        relationships: [
          {
            uid: "rel:test",
            type: "OWNS",
            source: "person:test_person",
            target: "org:missing_org", // Missing entity
            confidence: 0.9,
          },
        ],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === "missing_reference")).toBe(
        true
      );
    });

    it("should detect missing evidence references", () => {
      const bundle = {
        entities: [
          {
            uid: "person:test_person",
            type: "Person",
            name: "Test Person",
          },
        ],
        relationships: [
          {
            uid: "rel:test",
            type: "SPEECH_ACT",
            source: "person:test_person",
            target: "person:test_person",
            properties: {
              evidence_uids: ["evidence:missing_evidence"], // Missing evidence
            },
          },
        ],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === "missing_reference")).toBe(
        true
      );
    });
  });
});
