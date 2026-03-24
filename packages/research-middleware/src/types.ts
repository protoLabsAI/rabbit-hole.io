/**
 * Core types for the research middleware pipeline.
 *
 * Middleware hooks wrap AI SDK streamText execution, allowing inspection
 * and modification at each stage of the agent loop.
 */

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Mutable context object passed through every hook in the pipeline.
 * Middleware can read and write to `state` to communicate across hooks.
 *
 * @example
 * // Planner middleware writes:
 * ctx.state.researchPlan = plan;
 *
 * // Reflection middleware reads:
 * const plan = ctx.state.researchPlan;
 */
export interface MiddlewareContext {
  /** Unique ID for this agent invocation. */
  readonly agentId: string;
  /** Mutable bag of cross-hook state. Middleware communicate through this. */
  state: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Executor types
// ---------------------------------------------------------------------------

/** A function that executes a tool and returns its result. */
export type ToolExecutor = (
  args: Record<string, unknown>
) => Promise<unknown> | unknown;

/** Shape of a single model message (mirrors AI SDK CoreMessage structure). */
export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
}

/** Shape of a model response after an LLM turn. */
export interface ModelResponse {
  /** The text output, if any. */
  text?: string;
  /** Tool calls emitted by the model, if any. */
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  /** Raw response metadata from the provider. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Additional provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

/** Shape of the overall agent result after streamText completes. */
export interface AgentResult {
  /** Final text output from the agent run. */
  text?: string;
  /** All step results accumulated during the run. */
  steps?: ModelResponse[];
  /** Finish reason from the model. */
  finishReason?: string;
  /** Aggregate token usage. */
  usage?: ModelResponse["usage"];
}

// ---------------------------------------------------------------------------
// Middleware interface
// ---------------------------------------------------------------------------

/**
 * The core middleware contract.
 *
 * All hooks are optional — implement only the ones you need. The `id` field
 * is required and must be unique across registered middleware.
 *
 * Hook execution order:
 *   beforeAgent → [per LLM turn: beforeModel → LLM call → afterModel]
 *   → [per tool: wrapToolCall] → afterAgent
 */
export interface ResearchMiddleware {
  /** Unique identifier for this middleware. Used in registry lookups. */
  readonly id: string;

  /**
   * Fires before the streamText / agent loop begins.
   * Use this to initialise `ctx.state`, validate preconditions, or inject
   * additional tools/messages into the initial call.
   */
  beforeAgent?(ctx: MiddlewareContext): Promise<void> | void;

  /**
   * Fires after the streamText / agent loop completes.
   * Use this to persist results, emit telemetry, or clean up state.
   */
  afterAgent?(ctx: MiddlewareContext, result: AgentResult): Promise<void> | void;

  /**
   * Fires before each LLM turn within the agent loop.
   * May return a modified message array to replace the original, or return
   * `undefined` to leave messages unchanged.
   */
  beforeModel?(
    ctx: MiddlewareContext,
    messages: ModelMessage[]
  ): Promise<ModelMessage[] | undefined | void> | ModelMessage[] | undefined | void;

  /**
   * Fires after each LLM response within the agent loop.
   * Use this to inspect/log the raw model output.
   */
  afterModel?(
    ctx: MiddlewareContext,
    response: ModelResponse
  ): Promise<void> | void;

  /**
   * Wraps each tool execution.
   * Receives the `execute` function for the next middleware (or the real tool)
   * and must call it (or substitute its own result).
   *
   * @example
   * async wrapToolCall(ctx, toolName, args, execute) {
   *   console.log(`[${ctx.agentId}] calling tool ${toolName}`);
   *   const result = await execute(args);
   *   console.log(`[${ctx.agentId}] tool ${toolName} returned`, result);
   *   return result;
   * }
   */
  wrapToolCall?(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Registry types
// ---------------------------------------------------------------------------

/** A single entry in the middleware registry. */
export interface MiddlewareRegistryEntry {
  /** Must match the middleware's own `id` field. */
  id: string;
  /** When false the middleware is skipped during chain execution. */
  enabled: boolean;
  /** The middleware implementation. */
  middleware: ResearchMiddleware;
}

/** Plain-object config used to seed the registry. */
export interface MiddlewareConfig {
  /** Ordered list of middleware entries. */
  entries: MiddlewareRegistryEntry[];
}
