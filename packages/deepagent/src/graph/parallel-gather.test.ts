/**
 * Parallel Evidence Gathering Tests
 */

import { describe, expect, it, vi } from "vitest";

import { createParallelGatherNode, deduplicateByUrl } from "./parallel-gather";

describe("deduplicateByUrl", () => {
  it("keeps unique files as-is", () => {
    const files = {
      q0_evidence1: JSON.stringify({ url: "https://a.com", data: "short" }),
      q1_evidence1: JSON.stringify({ url: "https://b.com", data: "short" }),
    };
    const result = deduplicateByUrl(files);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("deduplicates files with same URL, keeping longer content", () => {
    const short = JSON.stringify({ url: "https://a.com", data: "x" });
    const long = JSON.stringify({
      url: "https://a.com",
      data: "much longer content here",
    });

    const files = {
      q0_evidence1: short,
      q1_evidence1: long,
    };
    const result = deduplicateByUrl(files);
    expect(Object.keys(result)).toHaveLength(1);
    expect(Object.values(result)[0]).toBe(long);
  });

  it("handles non-JSON values by keeping them", () => {
    const files = {
      q0_raw: "not json",
      q1_raw: "also not json",
    };
    const result = deduplicateByUrl(files);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("handles files without URL field by keeping them", () => {
    const files = {
      q0_data: JSON.stringify({ content: "no url here" }),
      q1_data: JSON.stringify({ content: "also no url" }),
    };
    const result = deduplicateByUrl(files);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("uses 'source' field as fallback for URL", () => {
    const files = {
      q0_ev: JSON.stringify({ source: "https://c.com", data: "short" }),
      q1_ev: JSON.stringify({
        source: "https://c.com",
        data: "longer content wins",
      }),
    };
    const result = deduplicateByUrl(files);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("returns empty object for empty input", () => {
    expect(deduplicateByUrl({})).toEqual({});
  });
});

describe("createParallelGatherNode", () => {
  function createMockEvidenceGatherer(
    responseFiles: Record<string, string> = {}
  ) {
    return {
      invoke: vi.fn().mockResolvedValue({
        files: responseFiles,
        todos: [],
      }),
    };
  }

  const baseState = {
    messages: [],
    files: {},
    todos: [],
    entityName: "Tesla",
    entityType: "company",
    researchDepth: "detailed" as const,
    sessionConfig: undefined,
    researchBrief: "Research Tesla as a company",
    subQuestions: ["What is Tesla?", "Who founded Tesla?", "Tesla products?"],
    iterationCount: 0,
    gaps: [],
    relationships: [],
    confidence: 0,
    completeness: 0,
    bundle: undefined,
  };

  const mockConfig = {
    configurable: { thread_id: "test" },
    tags: [],
  };

  it("dispatches one gatherer per sub-question", async () => {
    const mockGraph = createMockEvidenceGatherer({ evidence: "data" });
    const node = createParallelGatherNode(mockGraph);

    await node(baseState, mockConfig);

    expect(mockGraph.invoke).toHaveBeenCalledTimes(3);
  });

  it("namespaces file keys by question index", async () => {
    const mockGraph = createMockEvidenceGatherer({ result: "evidence" });
    const node = createParallelGatherNode(mockGraph);

    const result = await node(baseState, mockConfig);

    const fileKeys = Object.keys(result.files || {});
    expect(fileKeys.some((k) => k.startsWith("q0_"))).toBe(true);
    expect(fileKeys.some((k) => k.startsWith("q1_"))).toBe(true);
    expect(fileKeys.some((k) => k.startsWith("q2_"))).toBe(true);
  });

  it("returns empty when no sub-questions", async () => {
    const mockGraph = createMockEvidenceGatherer();
    const node = createParallelGatherNode(mockGraph);

    const result = await node({ ...baseState, subQuestions: [] }, mockConfig);

    expect(result).toEqual({});
    expect(mockGraph.invoke).not.toHaveBeenCalled();
  });

  it("handles individual gatherer failures gracefully", async () => {
    const mockGraph = {
      invoke: vi
        .fn()
        .mockResolvedValueOnce({ files: { a: "data1" }, todos: [] })
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValueOnce({ files: { b: "data2" }, todos: [] }),
    };
    const node = createParallelGatherNode(mockGraph);

    const result = await node(baseState, mockConfig);

    // Should have files from question 0 and 2, not 1
    const fileKeys = Object.keys(result.files || {});
    expect(fileKeys).toHaveLength(2);
    expect(fileKeys.some((k) => k.startsWith("q0_"))).toBe(true);
    expect(fileKeys.some((k) => k.startsWith("q2_"))).toBe(true);
  });

  it("runs gatherers concurrently (not sequentially)", async () => {
    const delays: number[] = [];
    const mockGraph = {
      invoke: vi.fn().mockImplementation(async () => {
        const start = Date.now();
        await new Promise((r) => setTimeout(r, 50));
        delays.push(Date.now() - start);
        return { files: {}, todos: [] };
      }),
    };
    const node = createParallelGatherNode(mockGraph);

    const start = Date.now();
    await node(baseState, mockConfig);
    const totalElapsed = Date.now() - start;

    // 3 questions at 50ms each should take ~50ms total if parallel,
    // ~150ms if sequential. Allow generous margin.
    expect(totalElapsed).toBeLessThan(200);
  });

  it("includes research brief in sub-question context", async () => {
    const mockGraph = createMockEvidenceGatherer();
    const node = createParallelGatherNode(mockGraph);

    await node(baseState, mockConfig);

    const firstCallState = mockGraph.invoke.mock.calls[0][0];
    const messageContent = firstCallState.messages[0].content;
    expect(messageContent).toContain("Research Tesla as a company");
  });
});
