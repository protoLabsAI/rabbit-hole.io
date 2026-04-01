/**
 * Community Recomputation Job
 *
 * Runs the GraphRAG community detection + summarization pipeline:
 * 1. Pull entity graph from Neo4j into graphology
 * 2. Run Louvain community detection
 * 3. Write communityId back to Neo4j entity nodes
 * 4. Generate LLM summaries per community
 * 5. Embed summaries and store in Qdrant community-summaries collection
 *
 * Triggered event-driven (after 25+ entities ingested) or by daily cron.
 */

import { Job } from "sidequest";

interface CommunityRecomputationJobData {
  triggeredBy: "threshold" | "cron" | "manual";
  entitiesSinceLastRun?: number;
}

interface CommunityRecomputationJobResult {
  success: boolean;
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  summarized: number;
  processingTimeMs: number;
  error?: string;
}

export class CommunityRecomputationJob extends Job {
  static readonly maxAttempts = 2;

  async run(
    data: CommunityRecomputationJobData
  ): Promise<CommunityRecomputationJobResult> {
    const startTime = Date.now();

    console.log(
      `[communities] Starting recomputation (triggered by: ${data.triggeredBy})`
    );

    try {
      // Dynamic imports to avoid loading heavy deps at module level
      const { getGlobalNeo4jClient } = await import("@proto/database");
      const { createNeo4jClientWithIntegerConversion } = await import(
        "@proto/utils"
      );
      const { runCommunityPipeline } = await import("@proto/vector");

      const baseClient = getGlobalNeo4jClient();
      const client = createNeo4jClientWithIntegerConversion(baseClient);

      // LLM text generation function using the fast model (haiku)
      const { generateText } = await import("ai");
      const { getAIModel } = await import("@proto/llm-providers/server");
      const model = getAIModel("fast");

      const generateFn = async (prompt: string): Promise<string> => {
        const result = await generateText({
          model,
          prompt,
          maxTokens: 300,
        });
        return result.text;
      };

      const result = await runCommunityPipeline(client, generateFn);

      const processingTimeMs = Date.now() - startTime;

      console.log(
        `[communities] Complete — ${result.communityCount} communities, ${result.summarized} summarized (${processingTimeMs}ms)`
      );

      return {
        success: true,
        nodeCount: result.nodeCount,
        edgeCount: result.edgeCount,
        communityCount: result.communityCount,
        summarized: result.summarized,
        processingTimeMs,
      };
    } catch (err) {
      const processingTimeMs = Date.now() - startTime;
      const error = err instanceof Error ? err.message : String(err);

      console.error(`[communities] Failed: ${error}`);

      return {
        success: false,
        nodeCount: 0,
        edgeCount: 0,
        communityCount: 0,
        summarized: 0,
        processingTimeMs,
        error,
      };
    }
  }
}
