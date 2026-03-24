/**
 * DeferredToolLoadingMiddleware — on-demand tool schema binding.
 *
 * Prevents context bloat as the tool count grows by keeping most tools out of
 * the LLM's context until they are explicitly requested.
 *
 * How it works:
 *  1. At startup, consumers register deferred tools with name + description
 *     (and optionally a full JSON schema) via the constructor.
 *  2. In `beforeAgent`, the middleware appends a note to `ctx.state` listing
 *     all available deferred tool names and descriptions so the agent knows
 *     what it can activate.
 *  3. When the agent calls `tool_search({ select: "ToolName" })`, the
 *     middleware intercepts the call, looks up the full schema in the registry,
 *     adds it to `ctx.state.loadedTools`, and returns a confirmation result.
 *  4. Once loaded, a tool stays in `ctx.state.loadedTools` for the remainder
 *     of the conversation — it is not unloaded between turns.
 */

import type {
  MiddlewareContext,
  ResearchMiddleware,
  ToolExecutor,
} from "../types.js";

// ---------------------------------------------------------------------------
// Registry entry types
// ---------------------------------------------------------------------------

/** A single entry in the deferred tool registry. */
export interface DeferredToolEntry {
  /** The tool name the agent uses to reference it. */
  name: string;
  /** Short description shown to the agent in the system prompt note. */
  description: string;
  /** Full JSON Schema for the tool's input, bound once the tool is loaded. */
  schema?: object;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Discriminant returned when a deferred tool is successfully loaded. */
export const TOOL_LOADED_TYPE = "tool_loaded" as const;

/** Discriminant returned when a tool_search target is not found. */
export const TOOL_NOT_FOUND_TYPE = "tool_not_found" as const;

/** Returned by the middleware when a deferred tool is successfully activated. */
export interface ToolLoadedResult {
  __type: typeof TOOL_LOADED_TYPE;
  /** Name of the tool that was loaded. */
  toolName: string;
  /** Full schema, if registered; otherwise undefined. */
  schema?: object;
}

/** Returned by the middleware when the requested tool name is unknown. */
export interface ToolNotFoundResult {
  __type: typeof TOOL_NOT_FOUND_TYPE;
  /** The name the agent attempted to activate. */
  requestedName: string;
  /** Human-readable explanation forwarded to the agent as its tool result. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Options for constructing DeferredToolLoadingMiddleware.
 */
export interface DeferredToolLoadingOptions {
  /** Tools to register at startup. Each entry needs at least name + description. */
  deferredTools: DeferredToolEntry[];
}

export class DeferredToolLoadingMiddleware implements ResearchMiddleware {
  readonly id = "deferred-tool-loading";

  /** Registry of deferred tools keyed by tool name. */
  private readonly registry: Map<string, DeferredToolEntry>;

  constructor(options: DeferredToolLoadingOptions) {
    this.registry = new Map(
      options.deferredTools.map((entry) => [entry.name, entry])
    );
  }

  /**
   * Fires before the agent loop begins.
   * Appends a note to ctx.state listing available deferred tools so the agent
   * knows what it can activate via tool_search.
   */
  beforeAgent(ctx: MiddlewareContext): void {
    if (this.registry.size === 0) return;

    const toolList = Array.from(this.registry.values())
      .map((entry) => `${entry.name}: ${entry.description}`)
      .join(", ");

    ctx.state.deferredToolsNote = `Additional tools available (use tool_search to activate): [${toolList}]`;
  }

  /**
   * Intercepts `tool_search` calls to bind full tool schemas on demand.
   * All other tool names are passed straight through to the next executor.
   */
  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    // Only intercept tool_search; all other tools pass through.
    if (toolName !== "tool_search") {
      return execute(args);
    }

    const select = args["select"] as string | undefined;
    if (!select) {
      return execute(args);
    }

    const entry = this.registry.get(select);

    if (!entry) {
      return {
        __type: TOOL_NOT_FOUND_TYPE,
        requestedName: select,
        reason: `Tool "${select}" is not in the deferred tool registry. Available tools: ${Array.from(this.registry.keys()).join(", ")}`,
      } satisfies ToolNotFoundResult;
    }

    // Add to loaded tools — persists for the rest of the conversation.
    const loaded = (ctx.state.loadedTools as Record<string, DeferredToolEntry> | undefined) ?? {};
    loaded[select] = entry;
    ctx.state.loadedTools = loaded;

    return {
      __type: TOOL_LOADED_TYPE,
      toolName: entry.name,
      schema: entry.schema,
    } satisfies ToolLoadedResult;
  }
}
