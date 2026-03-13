/**
 * Share Token Utilities Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  ShareToken,
  ShareTokenRow,
  CreateShareRequest,
  ShareType,
} from "@proto/types";

import {
  createSecureShareToken,
  calculateExpirationDate,
  isShareTokenExpired,
  isShareTokenRevoked,
  validateShareTokenState,
  dbRowToShareToken,
  generateShareUrl,
  generatePreviewUrl,
  validateCreateShareRequest,
  generateDefaultShareTitle,
  generateDefaultShareDescription,
  createShareMetadata,
} from "../share-tokens";
import { isValidUUID } from "../uuid";

describe("Share Token Utilities", () => {
  describe("createSecureShareToken", () => {
    it("should generate a valid UUID token", () => {
      const token = createSecureShareToken();
      expect(isValidUUID(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const token1 = createSecureShareToken();
      const token2 = createSecureShareToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("calculateExpirationDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    it("should calculate correct expiration date", () => {
      const expiration = calculateExpirationDate(7);
      expect(expiration.toISOString()).toBe("2024-01-22T12:00:00.000Z");
    });

    it("should handle different day values", () => {
      expect(calculateExpirationDate(1).toISOString()).toBe(
        "2024-01-16T12:00:00.000Z"
      );
      expect(calculateExpirationDate(30).toISOString()).toBe(
        "2024-02-14T12:00:00.000Z"
      );
    });

    it("should handle zero and negative values", () => {
      expect(calculateExpirationDate(0).toISOString()).toBe(
        "2024-01-15T12:00:00.000Z"
      );
      expect(calculateExpirationDate(-1).toISOString()).toBe(
        "2024-01-14T12:00:00.000Z"
      );
    });
  });

  describe("isShareTokenExpired", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    it("should detect expired tokens", () => {
      const expiredDate = new Date("2024-01-14T12:00:00Z");
      expect(isShareTokenExpired(expiredDate)).toBe(true);
      expect(isShareTokenExpired(expiredDate.toISOString())).toBe(true);
    });

    it("should detect valid tokens", () => {
      const futureDate = new Date("2024-01-16T12:00:00Z");
      expect(isShareTokenExpired(futureDate)).toBe(false);
      expect(isShareTokenExpired(futureDate.toISOString())).toBe(false);
    });

    it("should handle exact expiration time", () => {
      const exactTime = new Date("2024-01-15T12:00:00Z");
      expect(isShareTokenExpired(exactTime)).toBe(false);
    });
  });

  describe("isShareTokenRevoked", () => {
    it("should detect revoked tokens", () => {
      const revokedDate = new Date("2024-01-10T12:00:00Z");
      expect(isShareTokenRevoked(revokedDate)).toBe(true);
      expect(isShareTokenRevoked(revokedDate.toISOString())).toBe(true);
    });

    it("should detect non-revoked tokens", () => {
      expect(isShareTokenRevoked(null)).toBe(false);
    });
  });

  describe("validateShareTokenState", () => {
    const createMockToken = (overrides?: Partial<ShareToken>): ShareToken => ({
      token: "test-token",
      createdBy: "user123",
      entityUid: "per:test_person",
      shareType: "timeline" as ShareType,
      parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      expiresAt: "2024-12-31T23:59:59Z",
      revokedAt: null,
      viewCount: 0,
      createdAt: "2024-01-15T12:00:00Z",
      cacheDuration: 604800,
      title: null,
      description: null,
      ...overrides,
    });

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    it("should validate active tokens", () => {
      const token = createMockToken();
      const result = validateShareTokenState(token);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should invalidate revoked tokens", () => {
      const token = createMockToken({ revokedAt: "2024-01-10T12:00:00Z" });
      const result = validateShareTokenState(token);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Token has been revoked");
    });

    it("should invalidate expired tokens", () => {
      const token = createMockToken({ expiresAt: "2024-01-14T12:00:00Z" });
      const result = validateShareTokenState(token);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Token has expired");
    });
  });

  describe("dbRowToShareToken", () => {
    it("should convert database row to ShareToken interface", () => {
      const mockRow: ShareTokenRow = {
        token: "test-uuid",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
        expires_at: new Date("2024-12-31T23:59:59Z"),
        revoked_at: null,
        view_count: 5,
        created_at: new Date("2024-01-15T12:00:00Z"),
        cache_duration: 604800,
        title: "Test Title",
        description: "Test Description",
      };

      const shareToken = dbRowToShareToken(mockRow);

      expect(shareToken).toEqual({
        token: "test-uuid",
        createdBy: "user123",
        entityUid: "per:test_person",
        shareType: "timeline",
        parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
        expiresAt: "2024-12-31T23:59:59.000Z",
        revokedAt: null,
        viewCount: 5,
        createdAt: "2024-01-15T12:00:00.000Z",
        cacheDuration: 604800,
        title: "Test Title",
        description: "Test Description",
      });
    });

    it("should handle revoked tokens", () => {
      const mockRow: ShareTokenRow = {
        token: "test-uuid",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: {},
        expires_at: new Date("2024-12-31T23:59:59Z"),
        revoked_at: new Date("2024-01-20T12:00:00Z"),
        view_count: 0,
        created_at: new Date("2024-01-15T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      };

      const shareToken = dbRowToShareToken(mockRow);
      expect(shareToken.revokedAt).toBe("2024-01-20T12:00:00.000Z");
    });
  });

  describe("URL generation", () => {
    const mockToken = "test-token-123";

    describe("generateShareUrl", () => {
      it("should generate correct share URL with default base", () => {
        const url = generateShareUrl(mockToken);
        expect(url).toBe("http://localhost:3000/share/test-token-123");
      });

      it("should generate correct share URL with custom base", () => {
        const url = generateShareUrl(mockToken, "https://rabbit-hole.io");
        expect(url).toBe("https://rabbit-hole.io/share/test-token-123");
      });

      it("should use environment variable for base URL", () => {
        const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;
        process.env.NEXT_PUBLIC_BASE_URL = "https://production.example.com";

        const url = generateShareUrl(mockToken);
        expect(url).toBe("https://production.example.com/share/test-token-123");

        // Restore original environment
        if (originalEnv) {
          process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_BASE_URL;
        }
      });
    });

    describe("generatePreviewUrl", () => {
      it("should generate correct preview URL with default base", () => {
        const url = generatePreviewUrl(mockToken);
        expect(url).toBe(
          "http://localhost:3000/api/share/test-token-123/preview.png"
        );
      });

      it("should generate correct preview URL with custom base", () => {
        const url = generatePreviewUrl(mockToken, "https://rabbit-hole.io");
        expect(url).toBe(
          "https://rabbit-hole.io/api/share/test-token-123/preview.png"
        );
      });
    });
  });

  describe("validateCreateShareRequest", () => {
    const validRequest: CreateShareRequest = {
      entityUid: "per:test_person",
      shareType: "timeline" as ShareType,
      parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      expiresInDays: 7,
      cacheDurationSeconds: 604800,
      customTitle: "Test Share",
      customDescription: "Test description",
    };

    it("should validate correct request", () => {
      const result = validateCreateShareRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid entityUid", () => {
      const invalidRequests = [
        { ...validRequest, entityUid: "" },
        { ...validRequest, entityUid: "invalid-format" },
        { ...validRequest, entityUid: undefined as any },
      ];

      invalidRequests.forEach((request) => {
        const result = validateCreateShareRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'entityUid must be in format "namespace:identifier"'
        );
      });
    });

    it("should reject invalid shareType", () => {
      const invalidRequests = [
        { ...validRequest, shareType: "invalid" as ShareType },
        { ...validRequest, shareType: "" as ShareType },
        { ...validRequest, shareType: undefined as any },
      ];

      invalidRequests.forEach((request) => {
        const result = validateCreateShareRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "shareType must be one of: timeline, graph, entity"
        );
      });
    });

    it("should reject invalid parameters", () => {
      const invalidRequests = [
        { ...validRequest, parameters: undefined as any },
        { ...validRequest, parameters: "not an object" as any },
        { ...validRequest, parameters: null as any },
      ];

      invalidRequests.forEach((request) => {
        const result = validateCreateShareRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("parameters must be an object");
      });
    });

    it("should validate expiration days range", () => {
      const invalidRequests = [
        { ...validRequest, expiresInDays: 0 },
        { ...validRequest, expiresInDays: -1 },
        { ...validRequest, expiresInDays: 400 },
        { ...validRequest, expiresInDays: "7" as any },
      ];

      invalidRequests.forEach((request) => {
        const result = validateCreateShareRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "expiresInDays must be a number between 1 and 365"
        );
      });
    });

    it("should validate title and description length", () => {
      const longTitle = "x".repeat(256);
      const longDescription = "x".repeat(1001);

      const result = validateCreateShareRequest({
        ...validRequest,
        customTitle: longTitle,
        customDescription: longDescription,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "customTitle must be 255 characters or less"
      );
      expect(result.errors).toContain(
        "customDescription must be 1000 characters or less"
      );
    });
  });

  describe("generateDefaultShareTitle", () => {
    it("should generate timeline title with time window", () => {
      const title = generateDefaultShareTitle("per:joe_biden", "timeline", {
        timeWindow: { from: "2024-01-01", to: "2024-01-31" },
      });
      expect(title).toBe(
        "Timeline Activity: joe biden (2024-01-01 to 2024-01-31)"
      );
    });

    it("should generate timeline title without time window", () => {
      const title = generateDefaultShareTitle("per:joe_biden", "timeline", {});
      expect(title).toBe("Timeline Activity: joe biden");
    });

    it("should generate graph title", () => {
      const title = generateDefaultShareTitle("org:tesla_inc", "graph", {});
      expect(title).toBe("Network Graph: tesla inc");
    });

    it("should generate entity title", () => {
      const title = generateDefaultShareTitle("plt:twitter", "entity", {});
      expect(title).toBe("Entity Profile: twitter");
    });

    it("should handle invalid entity UID", () => {
      const title = generateDefaultShareTitle("invalid", "timeline", {});
      expect(title).toBe("Timeline Activity: Unknown Entity");
    });
  });

  describe("generateDefaultShareDescription", () => {
    it("should generate timeline description with stats", () => {
      const description = generateDefaultShareDescription(
        "timeline",
        {},
        { totalEvents: 150, peakDate: "2024-01-15" }
      );
      expect(description).toBe(
        "150 events tracked. Peak activity on 2024-01-15."
      );
    });

    it("should generate timeline description with time window", () => {
      const description = generateDefaultShareDescription("timeline", {
        timeWindow: { from: "2024-01-01", to: "2024-01-31" },
      });
      expect(description).toBe(
        "Timeline analysis from 2024-01-01 to 2024-01-31."
      );
    });

    it("should generate generic timeline description", () => {
      const description = generateDefaultShareDescription("timeline", {});
      expect(description).toBe(
        "Interactive timeline visualization with detailed activity analysis."
      );
    });

    it("should generate graph description", () => {
      const description = generateDefaultShareDescription("graph", {});
      expect(description).toBe(
        "Interactive network visualization showing entity connections and relationships."
      );
    });

    it("should generate entity description", () => {
      const description = generateDefaultShareDescription("entity", {});
      expect(description).toBe(
        "Comprehensive entity profile with relationships and timeline data."
      );
    });
  });

  describe("createShareMetadata", () => {
    const mockShareToken: ShareToken = {
      token: "test-token-123",
      createdBy: "user123",
      entityUid: "per:joe_biden",
      shareType: "timeline",
      parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      expiresAt: "2024-12-31T23:59:59Z",
      revokedAt: null,
      viewCount: 5,
      createdAt: "2024-01-15T12:00:00Z",
      cacheDuration: 604800,
      title: "Custom Title",
      description: "Custom Description",
    };

    it("should create metadata with custom title and description", () => {
      // Clean environment for consistent test
      const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const metadata = createShareMetadata(mockShareToken);

      expect(metadata).toEqual({
        title: "Custom Title",
        description: "Custom Description",
        imageUrl: "http://localhost:3000/api/share/test-token-123/preview.png",
        url: "http://localhost:3000/share/test-token-123",
        siteName: "Rabbit Hole Research",
        type: "article",
      });

      // Restore environment
      if (originalEnv) {
        process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
      }
    });

    it("should create metadata with generated title and description", () => {
      const tokenWithoutCustomText = {
        ...mockShareToken,
        title: null,
        description: null,
      };
      const metadata = createShareMetadata(tokenWithoutCustomText);

      expect(metadata.title).toBe(
        "Timeline Activity: joe biden (2024-01-01 to 2024-01-31)"
      );
      expect(metadata.description).toBe(
        "Timeline analysis from 2024-01-01 to 2024-01-31."
      );
      expect(metadata.siteName).toBe("Rabbit Hole Research");
      expect(metadata.type).toBe("article");
    });

    it("should use custom base URL", () => {
      const metadata = createShareMetadata(
        mockShareToken,
        "https://custom.example.com"
      );

      expect(metadata.url).toBe(
        "https://custom.example.com/share/test-token-123"
      );
      expect(metadata.imageUrl).toBe(
        "https://custom.example.com/api/share/test-token-123/preview.png"
      );
    });
  });

  describe("Input validation edge cases", () => {
    it("should handle malformed entityUids gracefully", () => {
      const malformedRequest: CreateShareRequest = {
        entityUid: "invalid-format", // No colon separator
        shareType: "timeline",
        parameters: {},
      };

      const result = validateCreateShareRequest(malformedRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'entityUid must be in format "namespace:identifier"'
      );
    });

    it("should handle missing optional fields", () => {
      const minimalRequest: CreateShareRequest = {
        entityUid: "per:test",
        shareType: "timeline",
        parameters: {},
      };

      const result = validateCreateShareRequest(minimalRequest);
      expect(result.isValid).toBe(true);
    });

    it("should handle empty parameters object", () => {
      const emptyParamsRequest: CreateShareRequest = {
        entityUid: "per:test",
        shareType: "entity",
        parameters: {},
      };

      const result = validateCreateShareRequest(emptyParamsRequest);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Performance and security", () => {
    it("should generate tokens efficiently", () => {
      const start = performance.now();
      const tokens = Array.from({ length: 100 }, () =>
        createSecureShareToken()
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should be very fast
      expect(new Set(tokens).size).toBe(100); // All unique
    });

    it("should not leak sensitive information in errors", () => {
      const invalidRequest = {
        entityUid: "",
        shareType: "invalid" as ShareType,
        parameters: null as any,
      };

      const result = validateCreateShareRequest(invalidRequest);

      // Errors should be informative but not expose internals
      result.errors.forEach((error) => {
        expect(error).not.toContain("password");
        expect(error).not.toContain("secret");
        expect(error).not.toContain("key");
      });
    });
  });
});
