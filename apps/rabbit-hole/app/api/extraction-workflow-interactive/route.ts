import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildHumanLoopExtractionGraph,
  type HumanLoopExtractionState,
  type EntityMerge,
  type FieldCorrection,
  type UserAction,
  type Entity,
  discoverNode,
  structureNode,
  enrichNode,
  relateNode,
  annotationNode,
} from "@protolabsai/llm-tools";
import { createLogger } from "@protolabsai/logger";

const logger = createLogger({ operation: "extraction-workflow-interactive" });

// Build graph once on module load
const graph = buildHumanLoopExtractionGraph({
  discoverNode,
  structureNode,
  enrichNode,
  relateNode,
  annotationNode,
});

/**
 * Generate unique thread ID
 */
function generateThreadId(userId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `extraction:${userId || "anon"}:${timestamp}:${random}`;
}

// Request validation schemas
const StartActionSchema = z.object({
  action: z.literal("start"),
  threadId: z.string().optional(),
  userId: z.string().optional(),
  text: z.string().min(1, "text is required and must be non-empty"),
  mode: z.enum(["deep_dive", "quick", "focused"]).optional(),
  domains: z.array(z.string()).optional(),
  confidenceThresholds: z
    .object({
      discover: z.number().min(0).max(1).optional(),
      structure: z.number().min(0).max(1).optional(),
      enrich: z.number().min(0).max(1).optional(),
      relate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  includeEntityTypes: z.array(z.string()).optional(),
  excludeEntityTypes: z.array(z.string()).optional(),
});

const ResumeActionSchema = z.object({
  action: z.literal("resume"),
  threadId: z.string().min(1, "threadId is required"),
  userId: z.string().optional(),
  userActions: z.array(z.any()).optional(),
  merges: z
    .array(
      z.object({
        sourceUids: z.array(z.string()).min(1),
        targetUid: z.string().min(1),
      })
    )
    .optional(),
  corrections: z
    .array(
      z.object({
        entityUid: z.string().min(1),
        corrections: z.record(z.string(), z.any()),
      })
    )
    .optional(),
  approvals: z.record(z.string(), z.boolean()).optional(),
});

const GetStateActionSchema = z.object({
  action: z.literal("getState"),
  threadId: z.string().min(1, "threadId is required"),
});

const ListCheckpointsActionSchema = z.object({
  action: z.literal("listCheckpoints"),
  threadId: z.string().min(1, "threadId is required"),
});

const ActionSchema = z.discriminatedUnion("action", [
  StartActionSchema,
  ResumeActionSchema,
  GetStateActionSchema,
  ListCheckpointsActionSchema,
]);

/**
 * Interactive extraction workflow API
 *
 * Actions:
 * - start: Begin new extraction session
 * - resume: Resume with user decisions
 * - getState: Get current state
 * - listCheckpoints: Get checkpoint history
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with zod schema
    const validationResult = ActionSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const parsedData = validationResult.data;
    const userId = "userId" in parsedData ? parsedData.userId : undefined;
    const providedThreadId =
      "threadId" in parsedData ? parsedData.threadId : undefined;
    const threadId = providedThreadId || generateThreadId(userId);
    const config = {
      configurable: {
        thread_id: threadId,
        user_id: userId,
      },
    };

    logger.info(`[HITL] ${parsedData.action} | thread=${threadId}`);

    switch (parsedData.action) {
      case "start": {
        const startTime = Date.now();
        const MAX_STREAM_ITERATIONS = 1000;
        const STREAM_TIMEOUT_MS = 120000; // 2 minute timeout

        // Create AbortController with timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, STREAM_TIMEOUT_MS);

        try {
          // Start extraction - stream until first interrupt
          const states: any[] = [];
          let iterationCount = 0;

          for await (const state of await graph.stream(
            {
              inputText: parsedData.text,
              mode: parsedData.mode || "deep_dive",
              domains: parsedData.domains || ["social", "academic"],
              confidenceThresholds: parsedData.confidenceThresholds || {
                discover: 0.7,
                structure: 0.8,
                enrich: 0.6,
                relate: 0.75,
              },
              includeEntityTypes: parsedData.includeEntityTypes,
              excludeEntityTypes: parsedData.excludeEntityTypes,
            } as any,
            config
          )) {
            // Check abort signal
            if (abortController.signal.aborted) {
              logger.warn(
                `[HITL] Start stream aborted at iteration ${iterationCount}`
              );
              break;
            }

            // Enforce max iterations to prevent runaway
            iterationCount++;
            if (iterationCount > MAX_STREAM_ITERATIONS) {
              logger.warn(
                `[HITL] Start stream exceeded max iterations (${MAX_STREAM_ITERATIONS})`
              );
              break;
            }

            states.push(state);
          }

          clearTimeout(timeoutId);

          const lastState = states[
            states.length - 1
          ] as Partial<HumanLoopExtractionState>;
          const duration = Date.now() - startTime;

          logger.info(
            `[HITL] Started | thread=${threadId} | phase=${lastState.currentPhase} | duration=${duration}ms`
          );

          return NextResponse.json({
            success: true,
            threadId,
            currentPhase: lastState.currentPhase,
            reviewData: lastState.reviewData,
            stats: {
              duration,
              checkpoints: states.length,
            },
          });
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

      case "resume": {
        const startTime = Date.now();
        const MAX_STREAM_ITERATIONS = 1000;
        const STREAM_TIMEOUT_MS = 120000; // 2 minute timeout

        // Create AbortController with timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, STREAM_TIMEOUT_MS);

        try {
          // Validate and normalize user inputs
          const userActions: UserAction[] = [];
          if (Array.isArray(parsedData.userActions)) {
            parsedData.userActions.forEach((action: any) => {
              if (action && typeof action === "object") {
                userActions.push(action);
              }
            });
          }

          // Validate and normalize merges
          const merges: EntityMerge[] = [];
          if (Array.isArray(parsedData.merges)) {
            parsedData.merges.forEach((merge: any) => {
              if (
                merge &&
                Array.isArray(merge.sourceUids) &&
                merge.sourceUids.length > 0 &&
                typeof merge.targetUid === "string"
              ) {
                merges.push(merge);
              }
            });
          }

          // Validate and normalize corrections
          const corrections: FieldCorrection[] = [];
          if (Array.isArray(parsedData.corrections)) {
            parsedData.corrections.forEach((correction: any) => {
              if (
                correction &&
                typeof correction.entityUid === "string" &&
                correction.entityUid &&
                correction.corrections &&
                typeof correction.corrections === "object"
              ) {
                corrections.push(correction);
              }
            });
          }

          logger.info(
            `[HITL] Resume | thread=${threadId} | actions=${userActions.length} | merges=${merges.length} | corrections=${corrections.length}`
          );

          // Convert user inputs to state format
          const entityMergeMap = new Map<string, string>();
          merges.forEach((merge) => {
            merge.sourceUids.forEach((sourceUid) => {
              entityMergeMap.set(sourceUid, merge.targetUid);
            });
          });

          const fieldCorrections: Record<string, Partial<Entity>> = {};
          corrections.forEach((correction) => {
            fieldCorrections[correction.entityUid] =
              correction.corrections as Partial<Entity>;
          });

          // Resume with AbortSignal
          const states: any[] = [];
          let iterationCount = 0;

          for await (const state of await graph.stream(
            {
              userActions,
              entityMergeMap,
              fieldCorrections,
              phaseApprovals: parsedData.approvals || {},
            } as any,
            config
          )) {
            // Check abort signal
            if (abortController.signal.aborted) {
              logger.warn(
                `[HITL] Resume stream aborted at iteration ${iterationCount}`
              );
              break;
            }

            // Enforce max iterations to prevent runaway
            iterationCount++;
            if (iterationCount > MAX_STREAM_ITERATIONS) {
              logger.warn(
                `[HITL] Resume stream exceeded max iterations (${MAX_STREAM_ITERATIONS})`
              );
              break;
            }

            states.push(state);
          }

          clearTimeout(timeoutId);

          const lastState = states[
            states.length - 1
          ] as Partial<HumanLoopExtractionState>;
          const duration = Date.now() - startTime;

          logger.info(
            `[HITL] Resumed | thread=${threadId} | phase=${lastState.currentPhase} | duration=${duration}ms`
          );

          return NextResponse.json({
            success: true,
            threadId,
            currentPhase: lastState.currentPhase,
            reviewData: lastState.reviewData,
            stats: {
              duration,
              checkpoints: states.length,
            },
          });
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

      case "getState": {
        if (!threadId) {
          return NextResponse.json(
            { error: "Missing required field: threadId" },
            { status: 400 }
          );
        }

        // Get current state from checkpoint
        const state = await graph.getState(config);

        if (!state || !state.values) {
          return NextResponse.json(
            { error: "Thread not found or no state available" },
            { status: 404 }
          );
        }

        logger.info(
          `[HITL] GetState | thread=${threadId} | phase=${state.values.currentPhase}`
        );

        return NextResponse.json({
          success: true,
          threadId,
          currentPhase: state.values.currentPhase,
          reviewData: state.values.reviewData,
          discoveredEntities: Array.from(
            state.values.discoveredEntities?.entries() || []
          ),
          structuredEntities: Array.from(
            state.values.structuredEntities?.entries() || []
          ),
          enrichedEntities: Array.from(
            state.values.enrichedEntities?.entries() || []
          ),
          relationships: state.values.relationships || [],
          processingTime: state.values.processingTime || {},
          errorLog: state.values.errorLog || [],
          userActions: state.values.userActions || [],
        });
      }

      case "listCheckpoints": {
        if (!threadId) {
          return NextResponse.json(
            { error: "Missing required field: threadId" },
            { status: 400 }
          );
        }

        // Get state history
        const stateHistory = await graph.getStateHistory(config);
        const checkpoints: Array<{
          checkpoint_id: unknown;
          phase: unknown;
          timestamp: unknown;
        }> = [];

        for await (const state of stateHistory) {
          checkpoints.push({
            checkpoint_id: state.config?.configurable?.checkpoint_id,
            phase: state.values?.currentPhase,
            timestamp:
              (state.metadata as Record<string, unknown>)?.write_time ??
              (state.metadata as Record<string, unknown>)?.step,
          });
        }

        logger.info(
          `[HITL] ListCheckpoints | thread=${threadId} | count=${checkpoints.length}`
        );

        return NextResponse.json({
          success: true,
          threadId,
          checkpoints,
        });
      }

      default: {
        const _exhaustive: never = parsedData;
        return _exhaustive;
      }
    }
  } catch (error) {
    logger.error("API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for session info
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json(
      { error: "Missing required parameter: threadId" },
      { status: 400 }
    );
  }

  try {
    const config = { configurable: { thread_id: threadId } };
    const state = await graph.getState(config);

    if (!state || !state.values) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      threadId,
      currentPhase: state.values.currentPhase,
      stats: {
        entities: state.values.enrichedEntities?.size || 0,
        relationships: state.values.relationships?.length || 0,
        userActions: state.values.userActions?.length || 0,
      },
    });
  } catch (error) {
    logger.error("GET error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
