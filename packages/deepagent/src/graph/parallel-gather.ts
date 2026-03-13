/**
 * Parallel Evidence Gathering
 *
 * Takes sub-questions from the scoping phase and dispatches one
 * evidence-gatherer subgraph per question concurrently using Promise.all.
 * Results are merged with URL-based deduplication.
 */

import type { RunnableConfig } from "@langchain/core/runnables";

import { createEmptyPartialBundle, mergePartialBundle } from "@proto/types";

import type { EntityResearchAgentStateType } from "../state";
import { log } from "../utils/logger";

interface EvidenceFile {
  url?: string;
  source?: string;
  [key: string]: unknown;
}

/**
 * Deduplicate evidence files by URL.
 * When two files share a URL, keeps the one with more content.
 */
export function deduplicateByUrl(
  files: Record<string, string>
): Record<string, string> {
  const seenUrls = new Map<string, { key: string; length: number }>();
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(files)) {
    let parsed: EvidenceFile | null = null;
    try {
      parsed = JSON.parse(value) as EvidenceFile;
    } catch {
      // Not JSON — keep as-is
      result[key] = value;
      continue;
    }

    const url = parsed?.url || parsed?.source;
    if (!url) {
      result[key] = value;
      continue;
    }

    const existing = seenUrls.get(url);
    if (!existing || value.length > existing.length) {
      if (existing) {
        delete result[existing.key];
      }
      seenUrls.set(url, { key, length: value.length });
      result[key] = value;
    }
  }

  return result;
}

/**
 * Create the parallel evidence gathering node.
 *
 * Invokes the evidence-gatherer subgraph once per sub-question
 * concurrently, then merges and deduplicates results.
 */
export function createParallelGatherNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evidenceGathererGraph: any
) {
  return async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    const subQuestions = state.subQuestions || [];

    if (subQuestions.length === 0) {
      log.warn("[parallel-gather] No sub-questions — skipping gather phase");
      return {};
    }

    log.debug("[parallel-gather] Dispatching evidence gatherers", {
      questionCount: subQuestions.length,
      entityName: state.entityName,
    });

    const startTime = Date.now();

    // Fan out: one evidence-gatherer per sub-question
    const gatherPromises = subQuestions.map(async (question, index) => {
      const subState: Partial<EntityResearchAgentStateType> = {
        ...state,
        messages: [
          {
            role: "user",
            content: `Research sub-question ${index + 1}/${subQuestions.length} for entity "${state.entityName}" (${state.entityType}):\n\n${question}\n\nContext from research brief:\n${state.researchBrief || "No brief available."}`,
          },
        ] as unknown as EntityResearchAgentStateType["messages"],
        // Namespace files by question index to avoid collisions
        files: {},
      };

      const subConfig: RunnableConfig = {
        ...config,
        callbacks: undefined,
        tags: [...(config.tags || []), "parallel-gather", `question-${index}`],
      };

      try {
        const result = await evidenceGathererGraph.invoke(subState, subConfig);
        // Namespace the file keys with question index
        const namespacedFiles: Record<string, string> = {};
        for (const [key, value] of Object.entries(
          (result.files as Record<string, string>) || {}
        )) {
          namespacedFiles[`q${index}_${key}`] = value as string;
        }
        return { files: namespacedFiles, todos: result.todos || [] };
      } catch (error) {
        log.warn(`[parallel-gather] Question ${index} failed`, {
          question: question.slice(0, 80),
          error: error instanceof Error ? error.message : String(error),
        });
        return { files: {}, todos: [] };
      }
    });

    // Wait for all gatherers to complete
    const results = await Promise.all(gatherPromises);

    // Merge all files and deduplicate
    let mergedFiles: Record<string, string> = {};
    for (const result of results) {
      mergedFiles = { ...mergedFiles, ...result.files };
    }

    const deduplicated = deduplicateByUrl(mergedFiles);

    const elapsed = Date.now() - startTime;
    log.debug("[parallel-gather] All gatherers complete", {
      questionCount: subQuestions.length,
      totalFiles: Object.keys(mergedFiles).length,
      dedupedFiles: Object.keys(deduplicated).length,
      elapsedMs: elapsed,
    });

    // Extract evidence from gathered files for partial bundle
    const gatheredEvidence: unknown[] = [];
    for (const value of Object.values(deduplicated)) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed.evidence)) {
          gatheredEvidence.push(...parsed.evidence);
        }
      } catch {
        // Not parseable — skip
      }
    }

    const currentPartial = state.partialBundle || createEmptyPartialBundle();
    const partialBundle = mergePartialBundle(currentPartial, {
      evidence: gatheredEvidence as Parameters<typeof mergePartialBundle>[1]["evidence"],
      phase: "evidence-gathering",
    });

    log.debug("[parallel-gather] Partial bundle updated with evidence", {
      evidenceCount: partialBundle.evidenceCount,
    });

    return {
      files: deduplicated,
      partialBundle,
    };
  };
}
