/**
 * ShareTokenService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { CreateShareRequest, ShareTokenRow } from "@proto/types";

import { ShareTokenService } from "../share-token-service";

// Mock the @proto/database module
vi.mock("@proto/database", () => ({
  getGlobalPostgresPool: vi.fn(() => ({
    query: mockQuery,
  })),
}));

const mockQuery = vi.fn();

describe.skip("ShareTokenService", () => {
  let service: ShareTokenService;

  beforeEach(() => {
    service = new ShareTokenService();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createShareToken", () => {
    const validRequest: CreateShareRequest = {
      entityUid: "per:test_person",
      shareType: "timeline",
      parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      expiresInDays: 7,
      cacheDurationSeconds: 604800,
      customTitle: "Test Timeline",
      customDescription: "Test description",
    };

    const mockDbRow: ShareTokenRow = {
      token: "test-uuid-123",
      created_by: "user123",
      entity_uid: "per:test_person",
      share_type: "timeline",
      parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      expires_at: new Date("2024-01-22T12:00:00Z"),
      revoked_at: null,
      view_count: 0,
      created_at: new Date("2024-01-15T12:00:00Z"),
      cache_duration: 604800,
      title: "Test Timeline",
      description: "Test description",
    };

    it("should create share token successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockDbRow],
        rowCount: 1,
      } as any);

      const result = await service.createShareToken(validRequest, "user123");

      expect(result.token).toBe("test-uuid-123");
      expect(result.createdBy).toBe("user123");
      expect(result.entityUid).toBe("per:test_person");
      expect(result.shareType).toBe("timeline");
      expect(result.title).toBe("Test Timeline");
      expect(result.description).toBe("Test description");

      // Verify database call
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO share_tokens"),
        expect.arrayContaining([
          "user123",
          "per:test_person",
          "timeline",
          JSON.stringify(validRequest.parameters),
          expect.any(Date),
          604800,
          "Test Timeline",
          "Test description",
        ])
      );
    });

    it("should validate request parameters", async () => {
      const invalidRequest = {
        ...validRequest,
        entityUid: "invalid-format",
        shareType: "invalid" as any,
      };

      await expect(
        service.createShareToken(invalidRequest, "user123")
      ).rejects.toThrow(/Invalid share request/);

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(
        service.createShareToken(validRequest, "user123")
      ).rejects.toThrow("Failed to create share token");
    });

    it("should use default values for optional fields", async () => {
      const minimalRequest: CreateShareRequest = {
        entityUid: "per:test_person",
        shareType: "timeline",
        parameters: {},
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockDbRow,
            title: null,
            description: null,
          },
        ],
        rowCount: 1,
      } as any);

      await service.createShareToken(minimalRequest, "user123");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO share_tokens"),
        expect.arrayContaining([
          "user123",
          "per:test_person",
          "timeline",
          JSON.stringify({}),
          expect.any(Date),
          604800, // Default cache duration
          null, // No custom title
          null, // No custom description
        ])
      );
    });
  });

  describe("getShareToken", () => {
    const mockDbRow: ShareTokenRow = {
      token: "test-token",
      created_by: "user123",
      entity_uid: "per:test_person",
      share_type: "timeline",
      parameters: {},
      expires_at: new Date("2024-12-31T23:59:59Z"),
      revoked_at: null,
      view_count: 0,
      created_at: new Date("2024-01-15T12:00:00Z"),
      cache_duration: 604800,
      title: null,
      description: null,
    };

    it("should get share token successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockDbRow],
        rowCount: 1,
      } as any);

      const result = await service.getShareToken("test-token");

      expect(result.token).toBe("test-token");
      expect(result.createdBy).toBe("user123");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM share_tokens WHERE token = $1"),
        ["test-token"]
      );
    });

    it("should throw error for non-existent token", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(service.getShareToken("non-existent-token")).rejects.toThrow(
        "Share token not found: non-existent-token"
      );
    });
  });

  describe("revokeShareToken", () => {
    it("should revoke token successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await service.revokeShareToken("test-token", "user123");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE share_tokens SET revoked_at = NOW()"),
        ["test-token", "user123"]
      );
    });

    it("should throw error if token not found or not owned", async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 0,
      } as any);

      await expect(
        service.revokeShareToken("test-token", "wrong-user")
      ).rejects.toThrow("Share token not found: test-token");
    });
  });

  describe("extendShareToken", () => {
    const mockDbRow: ShareTokenRow = {
      token: "test-token",
      created_by: "user123",
      entity_uid: "per:test_person",
      share_type: "timeline",
      parameters: {},
      expires_at: new Date("2024-01-29T12:00:00Z"), // Extended by 7 days
      revoked_at: null,
      view_count: 0,
      created_at: new Date("2024-01-15T12:00:00Z"),
      cache_duration: 604800,
      title: null,
      description: null,
    };

    it("should extend token expiration successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockDbRow],
        rowCount: 1,
      } as any);

      const result = await service.extendShareToken("test-token", "user123", 7);

      expect(result.token).toBe("test-token");
      expect(result.expiresAt).toBe("2024-01-29T12:00:00.000Z");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE share_tokens SET expires_at = expires_at + INTERVAL '7 days'"
        ),
        ["test-token", "user123"]
      );
    });

    it("should throw error if token not found", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        service.extendShareToken("test-token", "wrong-user", 7)
      ).rejects.toThrow("Share token not found: test-token");
    });
  });

  describe("getUserShareTokens", () => {
    const mockDbRows: ShareTokenRow[] = [
      {
        token: "token1",
        created_by: "user123",
        entity_uid: "per:person1",
        share_type: "timeline",
        parameters: {},
        expires_at: new Date("2024-12-31T23:59:59Z"),
        revoked_at: null,
        view_count: 5,
        created_at: new Date("2024-01-15T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      },
      {
        token: "token2",
        created_by: "user123",
        entity_uid: "org:company1",
        share_type: "graph",
        parameters: {},
        expires_at: new Date("2024-11-30T23:59:59Z"),
        revoked_at: new Date("2024-01-20T12:00:00Z"),
        view_count: 0,
        created_at: new Date("2024-01-14T12:00:00Z"),
        cache_duration: 604800,
        title: "Company Graph",
        description: null,
      },
    ];

    it("should get user's share tokens", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockDbRows,
        rowCount: 2,
      } as any);

      const result = await service.getUserShareTokens("user123");

      expect(result).toHaveLength(2);
      expect(result[0].token).toBe("token1");
      expect(result[1].token).toBe("token2");
      expect(result[1].revokedAt).toBe("2024-01-20T12:00:00.000Z");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM share_tokens WHERE created_by = $1"
        ),
        ["user123"]
      );
    });

    it("should return empty array for user with no tokens", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await service.getUserShareTokens("new-user");
      expect(result).toEqual([]);
    });
  });

  describe("incrementViewCount", () => {
    it("should increment view count", async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await service.incrementViewCount("test-token");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE share_tokens SET view_count = view_count + 1"
        ),
        ["test-token"]
      );
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should cleanup expired tokens and return count", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ deleted_count: 5 }],
        rowCount: 1,
      } as any);

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT cleanup_expired_share_tokens() as deleted_count;"
      );
    });
  });

  describe("validateShareToken", () => {
    it("should validate active token", async () => {
      const mockDbRow: ShareTokenRow = {
        token: "test-token",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: {},
        expires_at: new Date("2024-12-31T23:59:59Z"), // Future date
        revoked_at: null,
        view_count: 0,
        created_at: new Date("2024-01-15T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockDbRow],
        rowCount: 1,
      } as any);

      const result = await service.validateShareToken("test-token");
      expect(result.token).toBe("test-token");
    });

    it("should throw error for expired token", async () => {
      const expiredDbRow: ShareTokenRow = {
        token: "expired-token",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: {},
        expires_at: new Date("2024-01-14T12:00:00Z"), // Past date
        revoked_at: null,
        view_count: 0,
        created_at: new Date("2024-01-10T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [expiredDbRow],
        rowCount: 1,
      } as any);

      await expect(service.validateShareToken("expired-token")).rejects.toThrow(
        "Share token has expired: expired-token"
      );
    });

    it("should throw error for revoked token", async () => {
      const revokedDbRow: ShareTokenRow = {
        token: "revoked-token",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: {},
        expires_at: new Date("2024-12-31T23:59:59Z"),
        revoked_at: new Date("2024-01-14T12:00:00Z"), // Revoked
        view_count: 0,
        created_at: new Date("2024-01-10T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [revokedDbRow],
        rowCount: 1,
      } as any);

      await expect(service.validateShareToken("revoked-token")).rejects.toThrow(
        "Share token has been revoked: revoked-token"
      );
    });
  });

  describe("URL generation methods", () => {
    it("should delegate to utility functions", () => {
      const shareUrl = service.generateShareUrl("test-token");
      const previewUrl = service.generatePreviewUrl("test-token");

      expect(shareUrl).toBe("http://localhost:3000/share/test-token");
      expect(previewUrl).toBe(
        "http://localhost:3000/api/share/test-token/preview.png"
      );
    });
  });

  describe("Error handling", () => {
    it("should handle database connection errors gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(service.getShareToken("test-token")).rejects.toThrow(
        "Connection timeout"
      );
    });

    it("should handle SQL errors gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("column does not exist"));

      await expect(service.getShareToken("test-token")).rejects.toThrow(
        "column does not exist"
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete share token lifecycle", async () => {
      const request: CreateShareRequest = {
        entityUid: "per:test_person",
        shareType: "timeline",
        parameters: { timeWindow: { from: "2024-01-01", to: "2024-01-31" } },
      };

      // Mock creation
      const createdRow: ShareTokenRow = {
        token: "lifecycle-token",
        created_by: "user123",
        entity_uid: "per:test_person",
        share_type: "timeline",
        parameters: request.parameters,
        expires_at: new Date("2024-01-22T12:00:00Z"),
        revoked_at: null,
        view_count: 0,
        created_at: new Date("2024-01-15T12:00:00Z"),
        cache_duration: 604800,
        title: null,
        description: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [createdRow],
        rowCount: 1,
      } as any);

      const token = await service.createShareToken(request, "user123");
      expect(token.token).toBe("lifecycle-token");

      // Mock retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [createdRow],
        rowCount: 1,
      } as any);

      const retrieved = await service.getShareToken("lifecycle-token");
      expect(retrieved.token).toBe("lifecycle-token");

      // Mock increment view count
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await service.incrementViewCount("lifecycle-token");

      // Mock revocation
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await service.revokeShareToken("lifecycle-token", "user123");

      // Verify all database calls were made
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });
  });
});
