/**
 * Unit tests for MCP handler — parallel search execution, timeout handling,
 * source health tracking, and graceful degradation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  isSourceEnabled,
  recordSourceFailure,
  recordSourceSuccess,
  resetSourceHealth,
  getSourceHealthState,
  withTimeout,
} from "../handler.js";

// ─── withTimeout ─────────────────────────────────────────────────────

describe("withTimeout", () => {
  it("resolves when the promise completes within the timeout", async () => {
    const fast = Promise.resolve("ok");
    const result = await withTimeout(fast, 1000, "test");
    expect(result).toBe("ok");
  });

  it("rejects with a timeout error when the promise is too slow", async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>((resolve) =>
      setTimeout(() => resolve("late"), 5000)
    );
    const raced = withTimeout(slow, 100, "slow-source");
    vi.advanceTimersByTime(200);
    await expect(raced).rejects.toThrow("slow-source timed out after 100ms");
    vi.useRealTimers();
  });
});

// ─── Source Health Tracking ───────────────────────────────────────────

describe("source health tracking", () => {
  beforeEach(() => {
    resetSourceHealth();
  });

  afterEach(() => {
    resetSourceHealth();
    vi.useRealTimers();
  });

  it("sources are enabled by default", () => {
    expect(isSourceEnabled("wikipedia")).toBe(true);
    expect(isSourceEnabled("duckduckgo")).toBe(true);
    expect(isSourceEnabled("tavily")).toBe(true);
  });

  it("source is still enabled after fewer than 3 failures", () => {
    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");
    expect(isSourceEnabled("wikipedia")).toBe(true);
    expect(getSourceHealthState("wikipedia")?.failures).toBe(2);
  });

  it("source becomes disabled after 3 failures within the window", () => {
    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");
    expect(isSourceEnabled("wikipedia")).toBe(false);
    expect(getSourceHealthState("wikipedia")?.disabled).toBe(true);
  });

  it("a success resets the failure counter", () => {
    recordSourceFailure("duckduckgo");
    recordSourceFailure("duckduckgo");
    recordSourceSuccess("duckduckgo");
    expect(getSourceHealthState("duckduckgo")?.failures).toBe(0);
    expect(isSourceEnabled("duckduckgo")).toBe(true);
  });

  it("disabled source auto-recovers after 10 minutes", () => {
    vi.useFakeTimers();

    recordSourceFailure("tavily");
    recordSourceFailure("tavily");
    recordSourceFailure("tavily");
    expect(isSourceEnabled("tavily")).toBe(false);

    // Advance time past the 10-minute health window
    vi.advanceTimersByTime(11 * 60 * 1000);

    expect(isSourceEnabled("tavily")).toBe(true);
    expect(getSourceHealthState("tavily")?.disabled).toBe(false);
  });

  it("failure counter resets when outside the 10-minute window", () => {
    vi.useFakeTimers();

    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");
    expect(getSourceHealthState("wikipedia")?.failures).toBe(2);

    // Move time forward past the window
    vi.advanceTimersByTime(11 * 60 * 1000);

    // Third failure after window should start a fresh count of 1
    recordSourceFailure("wikipedia");
    expect(getSourceHealthState("wikipedia")?.failures).toBe(1);
    expect(isSourceEnabled("wikipedia")).toBe(true);
  });

  it("each source is tracked independently", () => {
    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");
    recordSourceFailure("wikipedia");

    expect(isSourceEnabled("wikipedia")).toBe(false);
    expect(isSourceEnabled("duckduckgo")).toBe(true);
    expect(isSourceEnabled("tavily")).toBe(true);
  });
});
