/**
 * Unit tests for research-quality module — quality evaluation, gap analysis,
 * adaptive depth decisions, and budget enforcement.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  computeMetrics,
  evaluateQuality,
  analyzeGaps,
  BudgetTracker,
  DEFAULT_BUDGET,
  QUALITY_THRESHOLDS,
} from "../lib/research-quality.js";
import type { SearchResults } from "../lib/research-quality.js";

// ─── Fixtures ────────────────────────────────────────────────────────

function makeResults(overrides: Partial<SearchResults> = {}): SearchResults {
  return {
    wikipedia: {
      title: "Test Entity",
      text: "Some article text about the entity.",
      url: "https://en.wikipedia.org/wiki/Test_Entity",
    },
    webSearch: {
      results: [
        { title: "Result 1", url: "https://example.com/1", snippet: "text" },
        { title: "Result 2", url: "https://example.com/2", snippet: "text" },
      ],
    },
    tavilySearch: {
      results: [
        { title: "Tavily 1", url: "https://news.com/1", content: "content", score: 0.8 },
      ],
    },
    extraction: {
      entities: [
        { uid: "person:alice", name: "Alice", type: "person" },
        { uid: "person:bob", name: "Bob", type: "person" },
        { uid: "org:acme", name: "Acme Corp", type: "organization" },
        { uid: "software:widget", name: "Widget", type: "software" },
        { uid: "concept:innovation", name: "Innovation", type: "concept" },
        { uid: "person:carol", name: "Carol", type: "person" },
        { uid: "org:techco", name: "TechCo", type: "organization" },
        { uid: "platform:github", name: "GitHub", type: "platform" },
        { uid: "person:dave", name: "Dave", type: "person" },
        { uid: "org:bigcorp", name: "BigCorp", type: "organization" },
      ],
      relationships: [
        { uid: "rel:alice_works_at_acme", type: "WORKS_AT", source: "person:alice", target: "org:acme" },
        { uid: "rel:bob_works_at_techco", type: "WORKS_AT", source: "person:bob", target: "org:techco" },
        { uid: "rel:carol_founded_acme", type: "FOUNDED", source: "person:carol", target: "org:acme" },
        { uid: "rel:widget_part_of_techco", type: "PART_OF", source: "software:widget", target: "org:techco" },
        { uid: "rel:dave_works_at_bigcorp", type: "WORKS_AT", source: "person:dave", target: "org:bigcorp" },
      ],
    },
    entityCitations: {
      "person:alice": [
        { claimText: "Alice found", sourceUrl: "https://en.wikipedia.org", excerpt: "...", confidence: 0.7 },
        { claimText: "Alice mentioned", sourceUrl: "https://news.com/1", excerpt: "...", confidence: 0.8 },
      ],
      "org:acme": [
        { claimText: "Acme Corp", sourceUrl: "https://en.wikipedia.org", excerpt: "...", confidence: 0.7 },
      ],
    },
    ...overrides,
  };
}

function makeMinimalResults(): SearchResults {
  return {
    wikipedia: {
      title: "Minimal Entity",
      text: "Brief text.",
      url: "https://en.wikipedia.org/wiki/Minimal",
    },
    webSearch: { error: "No results" },
    tavilySearch: { error: "Not configured" },
    extraction: {
      entities: [
        { uid: "person:x", name: "X", type: "person" },
        { uid: "person:y", name: "Y", type: "person" },
        { uid: "org:z", name: "Z Corp", type: "organization" },
      ],
      relationships: [],
    },
    entityCitations: {},
  };
}

// ─── computeMetrics ───────────────────────────────────────────────────

describe("computeMetrics", () => {
  it("counts entities from extraction", () => {
    const results = makeResults();
    const metrics = computeMetrics(results);
    expect(metrics.entityCount).toBe(10);
  });

  it("returns zero entity count when no extraction", () => {
    const metrics = computeMetrics({});
    expect(metrics.entityCount).toBe(0);
    expect(metrics.relationshipCoverage).toBe(0);
  });

  it("returns zero when extraction has error", () => {
    const results: SearchResults = {
      extraction: { error: "API failed" },
    };
    const metrics = computeMetrics(results);
    expect(metrics.entityCount).toBe(0);
  });

  it("computes relationship coverage as ratio capped at 1.0", () => {
    const results = makeResults();
    const metrics = computeMetrics(results);
    // 5 relationships / 10 entities = 0.5
    expect(metrics.relationshipCoverage).toBeCloseTo(0.5);
  });

  it("caps relationship coverage at 1.0", () => {
    const results = makeResults({
      extraction: {
        entities: [{ uid: "person:a", name: "A", type: "person" }],
        relationships: [
          { uid: "rel:1", type: "RELATED", source: "person:a", target: "person:a" },
          { uid: "rel:2", type: "RELATED", source: "person:a", target: "person:a" },
          { uid: "rel:3", type: "RELATED", source: "person:a", target: "person:a" },
        ],
      },
    });
    expect(computeMetrics(results).relationshipCoverage).toBe(1.0);
  });

  it("counts source diversity: all three sources active", () => {
    const metrics = computeMetrics(makeResults());
    expect(metrics.sourceDiversity).toBe(3);
  });

  it("counts source diversity: only wikipedia", () => {
    const results: SearchResults = {
      wikipedia: { title: "T", text: "text", url: "https://en.wikipedia.org" },
      webSearch: { error: "failed" },
      tavilySearch: { error: "not configured" },
      extraction: { entities: [], relationships: [] },
    };
    expect(computeMetrics(results).sourceDiversity).toBe(1);
  });

  it("does not count web source when results array is empty", () => {
    const results: SearchResults = {
      wikipedia: { title: "T", text: "text", url: "https://en.wikipedia.org" },
      webSearch: { results: [] },
      tavilySearch: { error: "not configured" },
      extraction: { entities: [], relationships: [] },
    };
    expect(computeMetrics(results).sourceDiversity).toBe(1);
  });

  it("computes mean confidence score from entity citations", () => {
    const metrics = computeMetrics(makeResults());
    // (0.7 + 0.8 + 0.7) / 3 = 0.7333...
    expect(metrics.confidenceScore).toBeCloseTo(0.733, 2);
  });

  it("returns 0 confidence when no entity citations exist", () => {
    const results = makeResults({ entityCitations: {} });
    expect(computeMetrics(results).confidenceScore).toBe(0);
  });
});

// ─── evaluateQuality ─────────────────────────────────────────────────

describe("evaluateQuality", () => {
  it("marks basic depth as sufficient with 3+ entities and 1+ sources", () => {
    const results = makeMinimalResults();
    const eval_ = evaluateQuality(results, "basic");
    expect(eval_.sufficient).toBe(true);
  });

  it("marks basic depth as insufficient when entity count too low", () => {
    const results: SearchResults = {
      wikipedia: { title: "T", text: "text", url: "https://en.wikipedia.org" },
      extraction: {
        entities: [{ uid: "person:a", name: "A", type: "person" }],
        relationships: [],
      },
    };
    const eval_ = evaluateQuality(results, "basic");
    expect(eval_.sufficient).toBe(false);
  });

  it("marks detailed depth as sufficient with full fixture data", () => {
    const results = makeResults();
    const eval_ = evaluateQuality(results, "detailed");
    // 10 entities >= 8, 3 sources >= 2, confidence ~0.73 >= 0.6
    expect(eval_.sufficient).toBe(true);
  });

  it("marks detailed depth as insufficient when confidence too low", () => {
    const results = makeResults({
      entityCitations: {
        "person:alice": [
          { claimText: "c", sourceUrl: "https://x.com", excerpt: "...", confidence: 0.3 },
        ],
      },
    });
    const eval_ = evaluateQuality(results, "detailed");
    expect(eval_.sufficient).toBe(false);
  });

  it("marks comprehensive depth as insufficient with only 10 entities", () => {
    const results = makeResults();
    // 10 entities < 15 required for comprehensive
    const eval_ = evaluateQuality(results, "comprehensive");
    expect(eval_.sufficient).toBe(false);
  });

  it("returns metrics in evaluation result", () => {
    const results = makeResults();
    const eval_ = evaluateQuality(results, "detailed");
    expect(eval_.metrics.entityCount).toBe(10);
    expect(eval_.metrics.sourceDiversity).toBe(3);
  });

  it("returns gaps in evaluation result", () => {
    const results = makeMinimalResults();
    const eval_ = evaluateQuality(results, "detailed");
    // 2 entities < 8, 1 source < 2, no confidence
    expect(eval_.gaps.descriptions.length).toBeGreaterThan(0);
  });

  it("falls back to detailed thresholds for unknown depth", () => {
    const results = makeResults();
    const evalUnknown = evaluateQuality(results, "unknown_depth");
    const evalDetailed = evaluateQuality(results, "detailed");
    expect(evalUnknown.sufficient).toBe(evalDetailed.sufficient);
  });
});

// ─── analyzeGaps ─────────────────────────────────────────────────────

describe("analyzeGaps", () => {
  it("identifies entity count gap", () => {
    const metrics = { entityCount: 2, relationshipCoverage: 0.5, sourceDiversity: 2, confidenceScore: 0.8 };
    const gaps = analyzeGaps(metrics, "detailed");
    expect(gaps.descriptions.some((d) => d.includes("Entity count"))).toBe(true);
    expect(gaps.suggestedQueries.length).toBeGreaterThan(0);
  });

  it("identifies source diversity gap", () => {
    const metrics = { entityCount: 10, relationshipCoverage: 0.5, sourceDiversity: 1, confidenceScore: 0.8 };
    const gaps = analyzeGaps(metrics, "detailed");
    expect(gaps.descriptions.some((d) => d.includes("diversity"))).toBe(true);
  });

  it("identifies confidence score gap", () => {
    const metrics = { entityCount: 10, relationshipCoverage: 0.5, sourceDiversity: 2, confidenceScore: 0.3 };
    const gaps = analyzeGaps(metrics, "detailed");
    expect(gaps.descriptions.some((d) => d.includes("Confidence"))).toBe(true);
  });

  it("returns empty descriptions when all thresholds met", () => {
    const metrics = { entityCount: 10, relationshipCoverage: 0.5, sourceDiversity: 3, confidenceScore: 0.8 };
    const gaps = analyzeGaps(metrics, "detailed");
    // entity count >=8, diversity >=2, confidence >=0.6 → no gaps except possibly relationship coverage
    const mainGaps = gaps.descriptions.filter((d) => !d.includes("Relationship"));
    expect(mainGaps).toHaveLength(0);
  });

  it("flags sparse relationship coverage", () => {
    const metrics = { entityCount: 10, relationshipCoverage: 0.1, sourceDiversity: 3, confidenceScore: 0.8 };
    const gaps = analyzeGaps(metrics, "detailed");
    expect(gaps.descriptions.some((d) => d.includes("Relationship coverage"))).toBe(true);
  });

  it("does not flag relationship coverage when entity count is 0", () => {
    const metrics = { entityCount: 0, relationshipCoverage: 0, sourceDiversity: 0, confidenceScore: 0 };
    const gaps = analyzeGaps(metrics, "basic");
    expect(gaps.descriptions.some((d) => d.includes("Relationship coverage"))).toBe(false);
  });
});

// ─── BudgetTracker ───────────────────────────────────────────────────

describe("BudgetTracker", () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker();
  });

  it("is not exhausted initially", () => {
    expect(tracker.isExhausted()).toBe(false);
  });

  it("tracks rounds used", () => {
    tracker.recordRound();
    tracker.recordRound();
    expect(tracker.getRoundsUsed()).toBe(2);
  });

  it("is exhausted after maxAdditionalRounds", () => {
    for (let i = 0; i < DEFAULT_BUDGET.maxAdditionalRounds; i++) {
      tracker.recordRound();
    }
    expect(tracker.isExhausted()).toBe(true);
  });

  it("tracks sources queried", () => {
    tracker.recordSources(3);
    expect(tracker.getSourcesQueried()).toBe(3);
  });

  it("is exhausted after maxTotalSources", () => {
    tracker.recordSources(DEFAULT_BUDGET.maxTotalSources);
    expect(tracker.isExhausted()).toBe(true);
  });

  it("is exhausted when either limit is reached", () => {
    tracker.recordSources(DEFAULT_BUDGET.maxTotalSources - 1);
    expect(tracker.isExhausted()).toBe(false);
    tracker.recordRound();
    tracker.recordRound();
    tracker.recordRound();
    expect(tracker.isExhausted()).toBe(true);
  });

  it("respects custom budget", () => {
    const custom = new BudgetTracker({ maxAdditionalRounds: 1, maxTotalSources: 2 });
    custom.recordRound();
    expect(custom.isExhausted()).toBe(true);
  });

  it("accumulates source counts across multiple recordSources calls", () => {
    tracker.recordSources(2);
    tracker.recordSources(2);
    tracker.recordSources(2);
    expect(tracker.getSourcesQueried()).toBe(6);
    expect(tracker.isExhausted()).toBe(true);
  });

  it("exposes the configured budget", () => {
    expect(tracker.getBudget()).toEqual(DEFAULT_BUDGET);
  });
});

// ─── QUALITY_THRESHOLDS ──────────────────────────────────────────────

describe("QUALITY_THRESHOLDS", () => {
  it("defines basic threshold with entityCount 3 and sourceDiversity 1", () => {
    expect(QUALITY_THRESHOLDS.basic.entityCount).toBe(3);
    expect(QUALITY_THRESHOLDS.basic.sourceDiversity).toBe(1);
    expect(QUALITY_THRESHOLDS.basic.confidenceScore).toBeUndefined();
  });

  it("defines detailed threshold with entityCount 8, sourceDiversity 2, confidenceScore 0.6", () => {
    expect(QUALITY_THRESHOLDS.detailed.entityCount).toBe(8);
    expect(QUALITY_THRESHOLDS.detailed.sourceDiversity).toBe(2);
    expect(QUALITY_THRESHOLDS.detailed.confidenceScore).toBe(0.6);
  });

  it("defines comprehensive threshold with entityCount 15, sourceDiversity 3, confidenceScore 0.7", () => {
    expect(QUALITY_THRESHOLDS.comprehensive.entityCount).toBe(15);
    expect(QUALITY_THRESHOLDS.comprehensive.sourceDiversity).toBe(3);
    expect(QUALITY_THRESHOLDS.comprehensive.confidenceScore).toBe(0.7);
  });
});
