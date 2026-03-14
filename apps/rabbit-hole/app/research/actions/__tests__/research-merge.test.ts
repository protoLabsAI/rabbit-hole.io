/**
 * Unit Tests for Research Merge Server Action
 *
 * Tests validation, Neo4j integration, and error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResearchBundle } from "../../lib/bundle-validator";
import { mergeResearchToNeo4j } from "../research-merge";

// Mock dependencies (Clerk removed - auth is now local)

vi.mock("@proto/database", () => ({
  getGlobalNeo4jClient: vi.fn(() => ({
    executeWrite: vi.fn(),
  })),
}));

vi.mock("@proto/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@proto/utils", () => ({
  convertAllNeo4jParams: vi.fn((params) => params),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("mergeResearchToNeo4j", () => {
  let mockDatabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDatabase = await import("@proto/database");
  });

  it("should validate bundle format", async () => {
    const invalidBundle = {
      // Missing required fields
    } as any;

    const result = await mergeResearchToNeo4j(invalidBundle);

    expect(result.status).toBe(400);
    expect(result.error).toContain("Invalid bundle");
  });

  it("should reject bundle without entities or relationships", async () => {
    const bundle = {
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
      },
    } as any;

    const result = await mergeResearchToNeo4j(bundle);

    expect(result.status).toBe(400);
    expect(result.error).toContain("Invalid bundle");
  });

  it("should merge entities and relationships successfully", async () => {
    const mockClient = {
      executeWrite: vi
        .fn()
        .mockResolvedValueOnce({
          // Entity merge
          records: [
            {
              get: vi.fn((key) => {
                if (key === "uid") return "person-123";
                if (key === "action") return "created";
                return null;
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          // Relationship merge
          records: [
            {
              get: vi.fn(() => "created"),
            },
          ],
        }),
    };

    mockDatabase.getGlobalNeo4jClient.mockReturnValue(mockClient as any);

    const bundle: ResearchBundle = {
      entities: [
        {
          uid: "person-123",
          name: "Test Person",
          type: "Person",
          properties: {},
        },
      ],
      relationships: [
        {
          source: "person-123",
          target: "org-456",
          type: "WORKS_FOR",
          properties: {},
        },
      ],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
      },
    };

    const result = await mergeResearchToNeo4j(bundle);

    expect(result.status).toBe(200);
    expect(result.data?.results).toBeDefined();
    expect(result.data?.results.entities.created).toBe(1);
    expect(result.data?.results.relationships.created).toBe(1);
    expect(result.data?.idMapping).toBeDefined();
  });

  it("should map temporary IDs to real IDs", async () => {
    const mockClient = {
      executeWrite: vi.fn().mockResolvedValue({
        records: [
          {
            get: vi.fn((key) => {
              if (key === "uid") return "person-real-123";
              if (key === "action") return "created";
              return null;
            }),
          },
        ],
      }),
    };

    mockDatabase.getGlobalNeo4jClient.mockReturnValue(mockClient as any);

    const bundle: ResearchBundle = {
      entities: [
        {
          uid: "temp-person-1", // Temporary ID
          name: "Test Person",
          type: "Person",
          properties: {},
        },
      ],
      relationships: [],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
      },
    };

    const result = await mergeResearchToNeo4j(bundle);

    expect(result.status).toBe(200);
    expect(result.data?.idMapping).toBeDefined();
    // Should have mapping from temp ID to real ID
    expect(Object.keys(result.data?.idMapping || {}).length).toBeGreaterThan(0);
  });

  it("should handle Neo4j errors gracefully", async () => {
    const mockClient = {
      executeWrite: vi
        .fn()
        .mockRejectedValue(new Error("Neo4j connection failed")),
    };

    mockDatabase.getGlobalNeo4jClient.mockReturnValue(mockClient as any);

    const bundle: ResearchBundle = {
      entities: [
        {
          uid: "person-123",
          name: "Test Person",
          type: "Person",
          properties: {},
        },
      ],
      relationships: [],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
      },
    };

    const result = await mergeResearchToNeo4j(bundle);

    expect(result.status).toBe(200); // Still succeeds but skips failed entities
    expect(result.data?.results.entities.skipped).toBe(1);
  });
});
