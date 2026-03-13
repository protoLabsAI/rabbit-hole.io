/**
 * Integration tests for canonical-paths utilities.
 *
 * Tests the full generateCanonicalPath and computeContentHash pipeline.
 */

import { createHash } from "crypto";

import { describe, expect, it } from "vitest";

import {
  computeContentHash,
  generateCanonicalPath,
} from "../../src/storage/canonical-paths.js";

// ==================== generateCanonicalPath ====================

describe("generateCanonicalPath", () => {
  it("returns a path with the expected structure", () => {
    const path = generateCanonicalPath("video", "org-123", "abc123");
    expect(path).toBe("evidence-raw/video/org-123/abc123/");
  });

  it("starts with 'evidence-raw/'", () => {
    const path = generateCanonicalPath("audio", "org-abc", "deadbeef");
    expect(path.startsWith("evidence-raw/")).toBe(true);
  });

  it("ends with a trailing slash", () => {
    const path = generateCanonicalPath("document", "org-1", "hash");
    expect(path.endsWith("/")).toBe(true);
  });

  it("includes the mediaCategory segment", () => {
    const path = generateCanonicalPath("text", "org-1", "hash");
    expect(path).toContain("text");
  });

  it("includes the orgId segment", () => {
    const orgId = "my-org-99";
    const path = generateCanonicalPath("video", orgId, "hash");
    expect(path).toContain(orgId);
  });

  it("includes the contentHash segment", () => {
    const hash = "a1b2c3d4e5f6";
    const path = generateCanonicalPath("audio", "org-1", hash);
    expect(path).toContain(hash);
  });

  it("produces unique paths for different categories", () => {
    const p1 = generateCanonicalPath("video", "org-1", "hash");
    const p2 = generateCanonicalPath("audio", "org-1", "hash");
    expect(p1).not.toBe(p2);
  });

  it("produces unique paths for different organisations", () => {
    const p1 = generateCanonicalPath("text", "org-a", "hash");
    const p2 = generateCanonicalPath("text", "org-b", "hash");
    expect(p1).not.toBe(p2);
  });

  it("produces unique paths for different content hashes", () => {
    const p1 = generateCanonicalPath("text", "org-1", "hash1");
    const p2 = generateCanonicalPath("text", "org-1", "hash2");
    expect(p1).not.toBe(p2);
  });
});

// ==================== computeContentHash ====================

describe("computeContentHash", () => {
  it("returns a 64-character hex string", () => {
    const hash = computeContentHash(Buffer.from("hello"));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the correct SHA-256 digest", () => {
    const data = Buffer.from("hello world");
    const expected = createHash("sha256").update(data).digest("hex");
    expect(computeContentHash(data)).toBe(expected);
  });

  it("produces the same hash for identical content", () => {
    const buf1 = Buffer.from("identical content");
    const buf2 = Buffer.from("identical content");
    expect(computeContentHash(buf1)).toBe(computeContentHash(buf2));
  });

  it("produces different hashes for different content", () => {
    const h1 = computeContentHash(Buffer.from("content A"));
    const h2 = computeContentHash(Buffer.from("content B"));
    expect(h1).not.toBe(h2);
  });

  it("handles an empty buffer", () => {
    const hash = computeContentHash(Buffer.alloc(0));
    // SHA-256 of empty string is well-known
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("handles a large buffer", () => {
    const buf = Buffer.alloc(1_000_000, 0x42); // 1 MB of 'B'
    const hash = computeContentHash(buf);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  // ==================== Full pipeline ====================

  it("can build a canonical path from a real buffer hash", () => {
    const buf = Buffer.from("some evidence file contents");
    const hash = computeContentHash(buf);
    const path = generateCanonicalPath("document", "workspace-42", hash);
    expect(path).toBe(`evidence-raw/document/workspace-42/${hash}/`);
  });
});
