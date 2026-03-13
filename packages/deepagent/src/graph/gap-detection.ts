/**
 * Gap Detection & Iterative Depth
 *
 * Analyzes bundle completeness after the initial research pass.
 * Behavior varies by depth:
 * - basic: skip entirely (single pass)
 * - detailed: detect gaps, trigger up to 2 targeted follow-up searches
 * - comprehensive: detect gaps + expand related entities up to maxDepth
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import type { ResearchSessionConfig } from "@proto/types";
import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@proto/types";

import type { EntityResearchAgentStateType } from "../state";
import { log } from "../utils/logger";

export interface GapAnalysis {
  overallCompleteness: number;
  gaps: string[];
  entitiesNeedingExpansion: string[];
  shouldContinue: boolean;
}

const GAP_DETECTION_PROMPT = `You are a research gap analyst. Given a set of research files and the original research brief, identify what's missing.

Analyze the evidence files and determine:
1. Overall completeness (0.0 to 1.0)
2. Specific gaps - what topics or questions remain unanswered
3. Entities mentioned but not yet researched (for expansion)
4. Whether further research would meaningfully improve the bundle

Output MUST be valid JSON:
{
  "overallCompleteness": 0.75,
  "gaps": ["Missing founding history details", "No financial data found"],
  "entitiesNeedingExpansion": ["Elon Musk", "SpaceX"],
  "shouldContinue": true
}

Be conservative: only flag true gaps, not nice-to-haves. Set shouldContinue=false if completeness > 0.85 or if remaining gaps are unlikely to be resolved by more searching.`;

/**
 * Parse gap analysis response from LLM.
 */
export function parseGapAnalysis(content: string): GapAnalysis {
  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  return {
    overallCompleteness: Math.min(
      1,
      Math.max(0, Number(parsed.overallCompleteness) || 0)
    ),
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
    entitiesNeedingExpansion: Array.isArray(parsed.entitiesNeedingExpansion)
      ? parsed.entitiesNeedingExpansion.map(String)
      : [],
    shouldContinue: Boolean(parsed.shouldContinue),
  };
}

/**
 * Compute max iterations based on depth and session config.
 */
export function computeMaxIterations(config: ResearchSessionConfig): number {
  switch (config.depth) {
    case "basic":
      return 0; // No gap detection
    case "detailed":
      return 2; // Up to 2 follow-up passes
    case "comprehensive":
      return config.maxDepth * 3; // Recursive expansion
  }
}

/**
 * Create the gap detection node.
 *
 * Analyzes current evidence for gaps and decides whether to continue
 * with additional research passes.
 */
export function createGapDetectionNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
) {
  return async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    const sessionConfig =
      state.sessionConfig ?? DEFAULT_RESEARCH_SESSION_CONFIG;

    // Basic depth: skip gap detection entirely
    if (sessionConfig.depth === "basic") {
      log.debug("[gap-detection] Skipping — basic depth");
      return {
        completeness: 1.0,
        iterationCount: state.iterationCount + 1,
      };
    }

    const maxIter = computeMaxIterations(sessionConfig);
    const currentIteration = state.iterationCount || 0;

    // Hard cap on iterations
    if (currentIteration >= maxIter) {
      log.debug("[gap-detection] Max iterations reached", {
        current: currentIteration,
        max: maxIter,
      });
      return {
        completeness: state.completeness || 0.8,
        iterationCount: currentIteration + 1,
      };
    }

    // Summarize current evidence files for the LLM
    const fileEntries = Object.entries(state.files || {});
    const fileSummary = fileEntries
      .map(([key, value]) => {
        const preview =
          typeof value === "string" ? value.slice(0, 300) : String(value);
        return `[${key}]: ${preview}`;
      })
      .join("\n\n");

    const userMessage = `Research brief: ${state.researchBrief || "N/A"}
Entity: ${state.entityName} (${state.entityType})
Depth: ${sessionConfig.depth}
Current iteration: ${currentIteration + 1}/${maxIter}
Known gaps from scoping: ${state.gaps?.join(", ") || "none"}

Evidence files (${fileEntries.length} total):
${fileSummary || "No evidence collected yet."}

Analyze completeness and identify gaps.`;

    const messages = [
      new SystemMessage(GAP_DETECTION_PROMPT),
      new HumanMessage(userMessage),
    ];

    let analysis: GapAnalysis;
    try {
      const response = await model.invoke(messages, config);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      analysis = parseGapAnalysis(content);
    } catch (error) {
      log.warn("[gap-detection] LLM analysis failed, assuming complete", {
        error: error instanceof Error ? error.message : String(error),
      });
      analysis = {
        overallCompleteness: 0.8,
        gaps: [],
        entitiesNeedingExpansion: [],
        shouldContinue: false,
      };
    }

    log.debug("[gap-detection] Analysis complete", {
      completeness: analysis.overallCompleteness,
      gapCount: analysis.gaps.length,
      expansionEntities: analysis.entitiesNeedingExpansion.length,
      shouldContinue: analysis.shouldContinue,
      iteration: currentIteration + 1,
    });

    // For comprehensive mode, add entities needing expansion as new sub-questions
    const newSubQuestions: string[] = [];
    if (
      sessionConfig.depth === "comprehensive" &&
      analysis.entitiesNeedingExpansion.length > 0
    ) {
      for (const entity of analysis.entitiesNeedingExpansion.slice(
        0,
        sessionConfig.maxEntities
      )) {
        newSubQuestions.push(
          `Expand research on "${entity}" — key attributes, relationships, and significance in the context of ${state.entityName}`
        );
      }
    }

    return {
      completeness: analysis.overallCompleteness,
      gaps: analysis.gaps,
      subQuestions: newSubQuestions,
      iterationCount: currentIteration + 1,
    };
  };
}

/**
 * Route after gap detection: continue gathering or move to coordinator.
 *
 * Returns the next node name based on gap analysis results.
 */
export function routeAfterGapDetection(
  state: EntityResearchAgentStateType
): string {
  const sessionConfig = state.sessionConfig ?? DEFAULT_RESEARCH_SESSION_CONFIG;

  // Basic always moves forward
  if (sessionConfig.depth === "basic") {
    return "coordinator";
  }

  const maxIter = computeMaxIterations(sessionConfig);

  // If we have new sub-questions and haven't hit the cap, do another gather
  if (
    state.subQuestions &&
    state.subQuestions.length > 0 &&
    state.iterationCount < maxIter &&
    (state.completeness || 0) < 0.85
  ) {
    log.debug("[gap-detection] Routing to parallel-gather for follow-up", {
      newQuestions: state.subQuestions.length,
      completeness: state.completeness,
    });
    return "parallel-gather";
  }

  return "coordinator";
}
