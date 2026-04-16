/**
 * Comprehensive Tests for Bulk Import Validation
 *
 * Test-driven development for orphaned node detection, reference integrity,
 * and schema validation using Vitest
 */

import { describe, it, expect } from "vitest";

import { EntitySchema } from "@protolabsai/types";

import {
  validateBulkImport,
  formatValidationErrors,
  RelationshipSchema,
  SpeechActSchema,
  EvidenceSchema,
} from "../bulk-import-validation";

describe.skip("Bulk Import Validation", () => {
  describe("Entity Schema Validation", () => {
    it("should validate a correct entity", () => {
      const validEntity = {
        uid: "person:test_person", // Updated to match @protolabsai/types schema
        entity_type: "person", // Updated field name
        label: "Test Person", // Updated field name
        bio: "A test person",
      };

      const result = EntitySchema.safeParse(validEntity);
      expect(result.success).toBe(true);
    });

    it("should reject entity with missing required fields", () => {
      const invalidEntity = {
        uid: "", // Empty UID
        entity_type: "person",
        label: "", // Empty label
      };

      const result = EntitySchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
      expect(result.error?.errors).toContainEqual(
        expect.objectContaining({ message: "Person UID is required" })
      );
      expect(result.error?.errors).toContainEqual(
        expect.objectContaining({ message: "Entity label is required" })
      );
    });

    it("should reject entity with invalid type", () => {
      const invalidEntity = {
        id: "per:test",
        type: "InvalidType",
        name: "Test",
      };

      const result = EntitySchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe("Invalid entity type");
    });

    it("should validate entity with optional biographical fields", () => {
      const richEntity = {
        id: "per:rich_person",
        type: "Person",
        name: "Rich Person",
        bio: "A wealthy individual",
        birthDate: "1970-01-01",
        nationality: "US",
        occupation: "Businessman",
        politicalParty: "Independent",
        education: ["Harvard", "MIT"],
        netWorth: 1000000,
        residence: "New York",
      };

      const result = EntitySchema.safeParse(richEntity);
      expect(result.success).toBe(true);
    });

    it("should reject invalid birth date format", () => {
      const invalidEntity = {
        id: "per:test",
        type: "Person",
        name: "Test",
        birthDate: "1970/01/01", // Wrong format
      };

      const result = EntitySchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Birth date must be in YYYY-MM-DD format"
      );
    });
  });

  describe("Relationship Schema Validation", () => {
    it("should validate a correct relationship", () => {
      const validRelationship = {
        id: "rel:test",
        source: "per:person1",
        target: "per:person2",
        type: "ENDORSES",
        label: "endorses",
        confidence: 0.8,
      };

      const result = RelationshipSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    it("should reject relationship with invalid type", () => {
      const invalidRelationship = {
        id: "rel:test",
        source: "per:person1",
        target: "per:person2",
        type: "INVALID_TYPE",
        label: "invalid",
      };

      const result = RelationshipSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe("Invalid relationship type");
    });

    it("should reject relationship with invalid confidence range", () => {
      const invalidRelationship = {
        id: "rel:test",
        source: "per:person1",
        target: "per:person2",
        type: "ENDORSES",
        label: "endorses",
        confidence: 1.5, // Out of range
      };

      const result = RelationshipSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Confidence must be between 0 and 1"
      );
    });
  });

  describe("Speech Act Schema Validation", () => {
    it("should validate a correct speech act", () => {
      const validSpeechAct = {
        id: "speech:test",
        speaker_id: "per:speaker",
        category: "endorsement",
        sentiment: "supportive",
        intensity: "medium",
        text_excerpt: "Test quote",
        at: "2024-01-01T00:00:00.000Z",
      };

      const result = SpeechActSchema.safeParse(validSpeechAct);
      expect(result.success).toBe(true);
    });

    it("should reject speech act with invalid category", () => {
      const invalidSpeechAct = {
        id: "speech:test",
        speaker_id: "per:speaker",
        category: "invalid_category",
      };

      const result = SpeechActSchema.safeParse(invalidSpeechAct);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Invalid speech act category"
      );
    });

    it("should reject speech act with invalid date format", () => {
      const invalidSpeechAct = {
        id: "speech:test",
        speaker_id: "per:speaker",
        category: "endorsement",
        at: "2024-01-01", // Wrong format
      };

      const result = SpeechActSchema.safeParse(invalidSpeechAct);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Date must be in ISO format"
      );
    });
  });

  describe("Evidence Schema Validation", () => {
    it("should validate correct evidence", () => {
      const validEvidence = {
        id: "ev:test",
        title: "Test Evidence",
        publisher: "Test Publisher",
        date: "2024-01-01",
        url: "https://example.com",
        kind: "research",
        reliability: 0.9,
      };

      const result = EvidenceSchema.safeParse(validEvidence);
      expect(result.success).toBe(true);
    });

    it("should reject evidence with invalid URL", () => {
      const invalidEvidence = {
        id: "ev:test",
        title: "Test Evidence",
        publisher: "Test Publisher",
        url: "not-a-url",
      };

      const result = EvidenceSchema.safeParse(invalidEvidence);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe("Must be a valid URL");
    });
  });

  describe("Orphaned Node Detection", () => {
    it("should detect orphaned entities with no relationships", () => {
      const data = {
        entities: [
          {
            id: "per:orphaned",
            type: "Person",
            name: "Orphaned Person",
          },
          {
            id: "per:connected",
            type: "Person",
            name: "Connected Person",
          },
        ],
        relationships: [
          {
            id: "rel:self_ref",
            source: "per:connected",
            target: "per:connected",
            type: "CHILD_OF", // Valid self-reference
            label: "child of self",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("orphaned_node");
      expect(result.errors[0].message).toContain("Orphaned Person");
    });

    it("should not report orphaned nodes when no relationships exist", () => {
      const data = {
        entities: [
          {
            id: "per:alone",
            type: "Person",
            name: "Alone Person",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Reference Integrity", () => {
    it("should detect missing entity references in relationships", () => {
      const data = {
        entities: [
          {
            id: "per:existing",
            type: "Person",
            name: "Existing Person",
          },
        ],
        relationships: [
          {
            id: "rel:broken",
            source: "per:existing",
            target: "per:nonexistent", // Missing entity
            type: "ENDORSES",
            label: "endorses",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_reference",
          message: expect.stringContaining("per:nonexistent"),
        })
      );
    });

    it("should detect missing speaker reference in speech acts", () => {
      const data = {
        entities: [
          {
            id: "per:existing",
            type: "Person",
            name: "Existing Person",
          },
        ],
        speech_acts: [
          {
            id: "speech:broken",
            speaker_id: "per:nonexistent", // Missing entity
            category: "endorsement",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_reference",
          message: expect.stringContaining("per:nonexistent"),
        })
      );
    });

    it("should detect missing platform reference in speech acts", () => {
      const data = {
        entities: [
          {
            id: "per:speaker",
            type: "Person",
            name: "Speaker",
          },
        ],
        speech_acts: [
          {
            id: "speech:broken",
            speaker_id: "per:speaker",
            platform_id: "plt:nonexistent", // Missing platform
            category: "endorsement",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_reference",
          message: expect.stringContaining("plt:nonexistent"),
        })
      );
    });
  });

  describe("Self-Referential Relationship Validation", () => {
    it("should allow valid self-referential relationships", () => {
      const data = {
        entities: [
          {
            id: "per:person",
            type: "Person",
            name: "Test Person",
          },
        ],
        relationships: [
          {
            id: "rel:valid_self",
            source: "per:person",
            target: "per:person",
            type: "CHILD_OF", // Valid self-reference
            label: "child of",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.type === "validation")).toHaveLength(
        0
      );
    });

    it("should reject invalid self-referential relationships", () => {
      const data = {
        entities: [
          {
            id: "per:person",
            type: "Person",
            name: "Test Person",
          },
        ],
        relationships: [
          {
            id: "rel:invalid_self",
            source: "per:person",
            target: "per:person",
            type: "ENDORSES", // Invalid self-reference
            label: "endorses self",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "validation",
          message: expect.stringContaining(
            'Self-referential relationship "ENDORSES" not allowed'
          ),
        })
      );
    });
  });

  describe("Marriage Relationship Validation", () => {
    it("should detect duplicate marriage relationships", () => {
      const data = {
        entities: [
          {
            id: "per:person1",
            type: "Person",
            name: "Person 1",
          },
          {
            id: "per:person2",
            type: "Person",
            name: "Person 2",
          },
        ],
        relationships: [
          {
            id: "rel:marriage1",
            source: "per:person1",
            target: "per:person2",
            type: "MARRIED_TO",
            label: "married to",
          },
          {
            id: "rel:marriage2",
            source: "per:person2",
            target: "per:person1",
            type: "MARRIED_TO",
            label: "married to",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "validation",
          message: expect.stringContaining("Duplicate marriage relationship"),
        })
      );
    });
  });

  describe("Complex Integration Tests", () => {
    it("should handle a complete valid import", () => {
      const data = {
        entities: [
          {
            id: "per:trump",
            type: "Person",
            name: "Donald Trump",
            bio: "45th President",
            birthDate: "1946-06-14",
            occupation: "Politician",
          },
          {
            id: "per:bannon",
            type: "Person",
            name: "Steve Bannon",
            bio: "Political strategist",
          },
          {
            id: "plt:twitter",
            type: "Platform",
            name: "Twitter",
          },
        ],
        relationships: [
          {
            id: "rel:trump_bannon",
            source: "per:trump",
            target: "per:bannon",
            type: "AMPLIFIES",
            label: "amplifies",
            confidence: 0.8,
          },
        ],
        speech_acts: [
          {
            id: "speech:trump_tweet",
            speaker_id: "per:trump",
            platform_id: "plt:twitter",
            category: "endorsement",
            sentiment: "supportive",
            text_excerpt: "Great guy!",
            at: "2024-01-01T00:00:00.000Z",
          },
        ],
        evidence: [
          {
            id: "ev:news_article",
            title: "Trump Endorses Bannon",
            publisher: "News Corp",
            date: "2024-01-01",
            url: "https://example.com/article",
            kind: "news_article",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.entities).toHaveLength(3);
      expect(result.data?.relationships).toHaveLength(1);
      expect(result.data?.speech_acts).toHaveLength(1);
      expect(result.data?.evidence).toHaveLength(1);
    });

    it("should handle multiple validation errors", () => {
      const data = {
        entities: [
          {
            id: "per:valid",
            type: "Person",
            name: "Valid Person",
          },
        ],
        relationships: [
          {
            id: "rel:broken_ref1",
            source: "per:nonexistent", // Missing reference
            target: "per:valid",
            type: "ENDORSES",
            label: "broken source",
          },
          {
            id: "rel:broken_ref2",
            source: "per:valid",
            target: "per:also_missing", // Missing reference
            type: "AMPLIFIES",
            label: "broken target",
          },
          {
            id: "rel:duplicate_marriage1",
            source: "per:valid",
            target: "per:valid",
            type: "MARRIED_TO", // Invalid self-marriage
            label: "married to self",
          },
        ],
        speech_acts: [
          {
            id: "speech:broken_speaker",
            speaker_id: "per:missing_speaker", // Missing reference
            category: "endorsement",
          },
        ],
      };

      const result = validateBulkImport(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);

      // Check for reference errors
      expect(
        result.errors.some(
          (e) =>
            e.type === "missing_reference" &&
            e.message.includes("per:nonexistent")
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.type === "missing_reference" &&
            e.message.includes("per:also_missing")
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.type === "missing_reference" &&
            e.message.includes("per:missing_speaker")
        )
      ).toBe(true);

      // Check for validation errors
      expect(
        result.errors.some(
          (e) =>
            e.type === "validation" && e.message.includes("Self-referential")
        )
      ).toBe(true);
    });
  });

  describe("Error Formatting", () => {
    it("should format validation errors correctly", () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: "validation" as const,
            message: "Field is required",
            field: "name",
          },
          {
            type: "missing_reference" as const,
            message: "Entity not found",
            itemId: "per:missing",
          },
          {
            type: "orphaned_node" as const,
            message: "Node has no connections",
            itemId: "per:orphan",
          },
        ],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toBe("Validation Error (name): Field is required");
      expect(formatted[1]).toBe("Reference Error: Entity not found");
      expect(formatted[2]).toBe("Warning: Node has no connections");
    });
  });
});
