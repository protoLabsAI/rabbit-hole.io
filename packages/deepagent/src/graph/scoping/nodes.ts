/**
 * Scoping Phase Nodes
 *
 * Implements the scoping subgraph nodes:
 * - analyzeQuery: Generates research brief and sub-questions
 *
 * For "basic" depth, this is a single LLM call.
 * For "detailed"/"comprehensive", same call but with richer output expectations.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import type { ResearchSessionConfig } from "@protolabsai/types";
import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@protolabsai/types";

import type { EntityResearchAgentStateType } from "../../state";
import { log } from "../../utils/logger";

import { ANALYZE_QUERY_PROMPT } from "./prompts";

export interface ScopingResult {
  brief: string;
  subQuestions: string[];
  identifiedEntityTypes: string[];
  gapHypotheses?: string[];
}

/**
 * Parse the LLM response into a ScopingResult.
 * Handles JSON that may be wrapped in markdown fences.
 */
export function parseScopingResponse(content: string): ScopingResult {
  let jsonStr = content.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required fields
  if (!parsed.brief || typeof parsed.brief !== "string") {
    throw new Error("Missing or invalid 'brief' field in scoping response");
  }
  if (!Array.isArray(parsed.subQuestions) || parsed.subQuestions.length === 0) {
    throw new Error(
      "Missing or empty 'subQuestions' array in scoping response"
    );
  }

  return {
    brief: parsed.brief,
    subQuestions: parsed.subQuestions.map(String),
    identifiedEntityTypes: Array.isArray(parsed.identifiedEntityTypes)
      ? parsed.identifiedEntityTypes.map(String)
      : [],
    gapHypotheses: Array.isArray(parsed.gapHypotheses)
      ? parsed.gapHypotheses.map(String)
      : undefined,
  };
}

/**
 * Build the depth-specific instruction for the scoping prompt.
 */
function getDepthInstruction(
  depth: "basic" | "detailed" | "comprehensive"
): string {
  switch (depth) {
    case "basic":
      return "Depth: BASIC. Produce a concise brief and 1-3 focused sub-questions. Keep it narrow and efficient.";
    case "detailed":
      return "Depth: DETAILED. Produce a thorough brief and 3-5 sub-questions covering key facets. Identify 2-3 related entity types that may be discovered.";
    case "comprehensive":
      return "Depth: COMPREHENSIVE. Produce an exhaustive brief and 5-10 sub-questions spanning all facets. Identify all possible entity types. Include 2-4 gap hypotheses about areas where information may be hard to find or conflicting.";
  }
}

/**
 * Analyze Query Node
 *
 * Takes entityName, entityType, and researchDepth from state.
 * Produces researchBrief and subQuestions via a single LLM call.
 */
export function createAnalyzeQueryNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
) {
  return async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    const sessionConfig: ResearchSessionConfig =
      state.sessionConfig ?? DEFAULT_RESEARCH_SESSION_CONFIG;
    const depth = sessionConfig.depth ?? state.researchDepth ?? "detailed";

    log.debug("[scoping] Analyzing query", {
      entityName: state.entityName,
      entityType: state.entityType,
      depth,
    });

    const depthInstruction = getDepthInstruction(depth);

    // Extract entity info from state or from chat messages
    let entityName = state.entityName;
    let entityType = state.entityType;

    if (!entityName && state.messages?.length > 0) {
      // Find the last user message to extract the research subject
      const lastUserMsg = [...state.messages]
        .reverse()
        .find((m: any) => m.role === "user" || m._getType?.() === "human");
      if (lastUserMsg) {
        const content =
          typeof lastUserMsg.content === "string"
            ? lastUserMsg.content
            : String(lastUserMsg.content);
        entityName = content;
        entityType = "research topic";
      }
    }

    entityName = entityName || "unknown entity";
    entityType = entityType || "general";

    const userMessage = `Research target:
- Entity Name: ${entityName}
- Entity Type: ${entityType}
- ${depthInstruction}

Generate a research brief and sub-questions for investigating this entity.`;

    const messages = [
      new SystemMessage(ANALYZE_QUERY_PROMPT),
      new HumanMessage(userMessage),
    ];

    const response = await model.invoke(messages, config);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    let result: ScopingResult;
    try {
      result = parseScopingResponse(content);
    } catch (error) {
      log.warn("[scoping] Failed to parse LLM response, using fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback: create minimal scoping from the query itself
      result = {
        brief: `Research ${entityName} (${entityType}) to understand its key attributes, relationships, and significance.`,
        subQuestions: [
          `What is ${entityName} and what are its defining characteristics?`,
          `What are the key relationships and connections of ${entityName}?`,
        ],
        identifiedEntityTypes: [entityType],
      };
    }

    // For comprehensive depth, include gap hypotheses as initial gaps
    const gaps =
      depth === "comprehensive" && result.gapHypotheses
        ? result.gapHypotheses
        : [];

    log.debug("[scoping] Analysis complete", {
      briefLength: result.brief.length,
      questionCount: result.subQuestions.length,
      entityTypes: result.identifiedEntityTypes.length,
      gaps: gaps.length,
    });

    return {
      researchBrief: result.brief,
      subQuestions: result.subQuestions,
      gaps,
    };
  };
}
