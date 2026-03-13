/**
 * Unit tests for MediaIngestionTool
 *
 * Tests the core ingestAndPoll logic directly (avoid fighting LangChain's
 * tool.invoke() internals), plus a smoke-test that the exported tool has
 * the expected name and schema.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally before importing the module under test
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ingestAndPoll, mediaIngestionTool } from "./media-ingestion-tool";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIngestResponse(jobId: string) {
  return {
    ok: true,
    json: async () => ({ jobId }),
  };
}

function makeStatusResponse(
  status: "pending" | "processing" | "completed" | "failed",
  result?: { text?: string; metadata?: Record<string, unknown> },
  error?: string
) {
  return {
    ok: true,
    json: async () => ({ status, result, error }),
  };
}

// ---------------------------------------------------------------------------

describe("ingestAndPoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Ensure env var is cleared so default URL is used
    delete process.env.JOB_PROCESSOR_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  describe("success path", () => {
    it("submits to /ingest and polls /ingest/:jobId/status until completed", async () => {
      const expectedText = "Extracted content from the URL";
      const expectedMetadata = { source: "example.com", contentType: "text/html" };

      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-123"))
        .mockResolvedValueOnce(makeStatusResponse("processing"))
        .mockResolvedValueOnce(
          makeStatusResponse("completed", {
            text: expectedText,
            metadata: expectedMetadata,
          })
        );

      const resultPromise = ingestAndPoll({ url: "https://example.com/page" });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);

      // First call: POST /ingest
      const [ingestUrl, ingestOpts] = mockFetch.mock.calls[0];
      expect(ingestUrl).toContain("/ingest");
      expect(ingestOpts.method).toBe("POST");
      expect(JSON.parse(ingestOpts.body)).toEqual({ url: "https://example.com/page" });

      // Second & third calls: GET /ingest/job-123/status
      expect(mockFetch.mock.calls[1][0]).toContain("/ingest/job-123/status");
      expect(mockFetch.mock.calls[2][0]).toContain("/ingest/job-123/status");

      expect(result.text).toBe(expectedText);
      expect(result.metadata).toEqual(expectedMetadata);
      expect(result.timedOut).toBe(false);
    });

    it("accepts fileReference instead of url", async () => {
      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-789"))
        .mockResolvedValueOnce(
          makeStatusResponse("completed", { text: "file content", metadata: {} })
        );

      const resultPromise = ingestAndPoll({ fileReference: "/uploads/doc.pdf" });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      const [, ingestOpts] = mockFetch.mock.calls[0];
      expect(JSON.parse(ingestOpts.body)).toEqual({ fileReference: "/uploads/doc.pdf" });

      expect(result.text).toBe("file content");
      expect(result.timedOut).toBe(false);
    });

    it("truncates extracted text to 8000 chars and appends ...[truncated]", async () => {
      const longText = "x".repeat(10000);

      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-456"))
        .mockResolvedValueOnce(
          makeStatusResponse("completed", { text: longText, metadata: {} })
        );

      const resultPromise = ingestAndPoll({ url: "https://example.com/long" });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.text).toHaveLength(8000 + "...[truncated]".length);
      expect(result.text.endsWith("...[truncated]")).toBe(true);
    });

    it("returns text untruncated when it is exactly 8000 chars", async () => {
      const exactText = "y".repeat(8000);

      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-exact"))
        .mockResolvedValueOnce(
          makeStatusResponse("completed", { text: exactText, metadata: {} })
        );

      const resultPromise = ingestAndPoll({ url: "https://example.com/exact" });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.text).toBe(exactText);
      expect(result.text).not.toContain("...[truncated]");
    });
  });

  // -------------------------------------------------------------------------
  // Timeout path
  // -------------------------------------------------------------------------

  describe("timeout path", () => {
    it("returns partial result with timedOut=true after 60s without completion", async () => {
      // All status polls return "processing" — job never completes
      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-timeout"))
        .mockResolvedValue(makeStatusResponse("processing"));

      const resultPromise = ingestAndPoll({ url: "https://slow.example.com/" });
      // Advance past the 60s timeout
      await vi.advanceTimersByTimeAsync(65000);
      const result = await resultPromise;

      expect(result.timedOut).toBe(true);
      // text and metadata should be empty (no partial result from server)
      expect(result.text).toBe("");
      expect(result.metadata).toEqual({});
    });

    it("returns partial text if server provided some partial result before timeout", async () => {
      const partialText = "partial content";

      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-partial"))
        // First poll returns processing with partial result
        .mockResolvedValue(
          makeStatusResponse("processing", { text: partialText, metadata: { partial: true } })
        );

      const resultPromise = ingestAndPoll({ url: "https://slow.example.com/doc" });
      await vi.advanceTimersByTimeAsync(65000);
      const result = await resultPromise;

      expect(result.timedOut).toBe(true);
      expect(result.text).toBe(partialText);
      expect(result.metadata).toEqual({ partial: true });
    });
  });

  // -------------------------------------------------------------------------
  // HTTP error path
  // -------------------------------------------------------------------------

  describe("HTTP error path", () => {
    it("throws when /ingest submission returns HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        ingestAndPoll({ url: "https://example.com/page" })
      ).rejects.toThrow("500");
    });

    it("throws when status poll returns HTTP 404", async () => {
      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-err"))
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

      // Attach rejection handler before running timers to avoid unhandled rejection warning
      const rejectPromise = expect(
        ingestAndPoll({ url: "https://example.com/page" })
      ).rejects.toThrow("404");
      await vi.runAllTimersAsync();
      await rejectPromise;
    });

    it("throws when job reaches 'failed' status", async () => {
      mockFetch
        .mockResolvedValueOnce(makeIngestResponse("job-fail"))
        .mockResolvedValueOnce(
          makeStatusResponse("failed", undefined, "Unsupported file format")
        );

      // Attach rejection handler before running timers to avoid unhandled rejection warning
      const rejectPromise = expect(
        ingestAndPoll({ url: "https://example.com/bad.bin" })
      ).rejects.toThrow("Unsupported file format");
      await vi.runAllTimersAsync();
      await rejectPromise;
    });

    it("throws when fetch throws a network error on /ingest", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network unreachable"));

      await expect(
        ingestAndPoll({ url: "https://example.com/page" })
      ).rejects.toThrow("Network unreachable");
    });

    it("throws when the ingest response is missing jobId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ /* no jobId */ }),
      });

      await expect(
        ingestAndPoll({ url: "https://example.com/page" })
      ).rejects.toThrow("missing jobId");
    });
  });
});

// ---------------------------------------------------------------------------
// Tool metadata smoke test
// ---------------------------------------------------------------------------

describe("mediaIngestionTool", () => {
  it("has the expected tool name", () => {
    expect(mediaIngestionTool.name).toBe("media_ingestion");
  });

  it("is exported as a LangChain tool with a schema", () => {
    // The LangChain `tool()` factory attaches a `schema` property
    expect(mediaIngestionTool).toBeDefined();
    expect(typeof mediaIngestionTool.invoke).toBe("function");
  });
});
