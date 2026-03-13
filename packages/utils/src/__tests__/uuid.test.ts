/**
 * UUID Generation Utilities Tests
 */

import { describe, it, expect } from "vitest";

import {
  generateSecureUUID,
  generateSecureUUIDs,
  isValidUUID,
  generateShareToken,
  generateSessionId,
  generateApiKey,
  parseUUID,
} from "../uuid";

describe("UUID Generation Utilities", () => {
  describe("generateSecureUUID", () => {
    it("should generate a valid UUID v4", () => {
      const uuid = generateSecureUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(isValidUUID(uuid)).toBe(true);
    });

    it("should generate unique UUIDs", () => {
      const uuid1 = generateSecureUUID();
      const uuid2 = generateSecureUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it("should generate UUIDs with version 4", () => {
      const uuid = generateSecureUUID();
      const parsed = parseUUID(uuid);
      expect(parsed.isValid).toBe(true);
      expect(parsed.version).toBe(4);
    });
  });

  describe("generateSecureUUIDs", () => {
    it("should generate multiple unique UUIDs", () => {
      const uuids = generateSecureUUIDs(5);
      expect(uuids).toHaveLength(5);

      // Check all are valid
      uuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });

      // Check all are unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(5);
    });

    it("should return empty array for zero or negative count", () => {
      expect(generateSecureUUIDs(0)).toEqual([]);
      expect(generateSecureUUIDs(-1)).toEqual([]);
    });

    it("should handle large counts", () => {
      const uuids = generateSecureUUIDs(100);
      expect(uuids).toHaveLength(100);

      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(100);
    });
  });

  describe("isValidUUID", () => {
    it("should validate correct UUID v4 format", () => {
      // Generate actual v4 UUIDs for testing
      const validUuids = [
        generateSecureUUID(),
        generateSecureUUID(),
        generateSecureUUID(),
      ];

      validUuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should reject invalid UUID formats", () => {
      const invalidUuids = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716", // Too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // Too long
        "550e8400-e29b-51d4-a716-446655440000", // Wrong version (5 instead of 4)
        "550e8400e29b41d4a716446655440000", // No hyphens
        "",
        "123",
      ];

      invalidUuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe("generateShareToken", () => {
    it("should generate a valid UUID", () => {
      const token = generateShareToken();
      expect(isValidUUID(token)).toBe(true);
    });

    it("should be an alias for generateSecureUUID", () => {
      const token1 = generateShareToken();
      const token2 = generateSecureUUID();

      // Both should be valid UUIDs
      expect(isValidUUID(token1)).toBe(true);
      expect(isValidUUID(token2)).toBe(true);

      // Should be different values
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateSessionId", () => {
    it("should generate a valid UUID", () => {
      const sessionId = generateSessionId();
      expect(isValidUUID(sessionId)).toBe(true);
    });
  });

  describe("generateApiKey", () => {
    it("should generate a valid UUID without hyphens", () => {
      const apiKey = generateApiKey();
      expect(apiKey).not.toContain("-");
      expect(apiKey).toHaveLength(32); // UUID without hyphens
      expect(apiKey).toMatch(/^[0-9a-f]{32}$/i);
    });

    it("should be based on UUID v4", () => {
      const apiKey = generateApiKey();
      // Add hyphens back to validate as UUID
      const uuidFormat = apiKey.replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        "$1-$2-$3-$4-$5"
      );
      expect(isValidUUID(uuidFormat)).toBe(true);
    });
  });

  describe("parseUUID", () => {
    it("should parse valid UUID v4", () => {
      const uuid = generateSecureUUID();
      const parsed = parseUUID(uuid);

      expect(parsed.isValid).toBe(true);
      expect(parsed.version).toBe(4);
      expect(parsed.variant).toBe("rfc4122");
    });

    it("should handle invalid UUIDs", () => {
      const invalidUuid = "not-a-uuid";
      const parsed = parseUUID(invalidUuid);

      expect(parsed.isValid).toBe(false);
      expect(parsed.version).toBeUndefined();
      expect(parsed.variant).toBeUndefined();
    });

    it("should parse UUID variants correctly", () => {
      // Test with known UUID formats
      const uuid = generateSecureUUID();
      const parsed = parseUUID(uuid);

      expect(parsed.variant).toBe("rfc4122");
    });

    it("should parse UUID versions correctly", () => {
      const uuid = generateSecureUUID();
      const parsed = parseUUID(uuid);

      expect(parsed.version).toBe(4);
    });
  });

  describe("UUID security and uniqueness", () => {
    it("should generate cryptographically random UUIDs", () => {
      const uuids = generateSecureUUIDs(1000);
      const uniqueUuids = new Set(uuids);

      // Should be completely unique
      expect(uniqueUuids.size).toBe(1000);
    });

    it("should not follow predictable patterns", () => {
      const uuids = generateSecureUUIDs(10);

      // Check that sequential UUIDs don't have obvious patterns
      for (let i = 0; i < uuids.length - 1; i++) {
        const uuid1 = uuids[i].replace(/-/g, "");
        const uuid2 = uuids[i + 1].replace(/-/g, "");

        // Should not differ by just incrementing
        const diff = Math.abs(
          parseInt(uuid1.slice(0, 8), 16) - parseInt(uuid2.slice(0, 8), 16)
        );
        expect(diff).toBeGreaterThan(1);
      }
    });
  });
});
