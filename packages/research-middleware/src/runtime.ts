/**
 * Middleware chain executor.
 *
 * Composes an ordered array of enabled middleware into a single execution
 * pipeline. Each hook is called in registration order; `wrapToolCall` is
 * composed as an onion — outer middleware wraps inner middleware wraps the
 * real tool executor.
 *
 * Tracing: each hook execution and tool call automatically produces a span
 * in the TracingContext attached to the MiddlewareContext. When tracing is
 * not configured the spans are no-ops.
 */

import type {
  AgentResult,
  MiddlewareContext,
  ModelMessage,
  ModelResponse,
  ResearchMiddleware,
  ToolExecutor,
} from "./types.js";

// ---------------------------------------------------------------------------
// MiddlewareChain
// ---------------------------------------------------------------------------

/**
 * Executes a list of middleware in order.
 *
 * Only enabled entries from the caller's filtered list are passed here;
 * the registry is responsible for filtering before calling the chain.
 */
export class MiddlewareChain {
  private readonly middleware: readonly ResearchMiddleware[];

  constructor(middleware: ResearchMiddleware[]) {
    this.middleware = Object.freeze([...middleware]);
  }

  // -------------------------------------------------------------------------
  // beforeAgent
  // -------------------------------------------------------------------------

  /**
   * Calls `beforeAgent` on each middleware in registration order.
   * All hooks are awaited sequentially before proceeding.
   * Each middleware invocation produces an auto-span in the TracingContext.
   */
  async beforeAgent(ctx: MiddlewareContext): Promise<void> {
    for (const mw of this.middleware) {
      if (mw.beforeAgent) {
        const span = ctx.tracing.createSpan(`beforeAgent:${mw.id}`);
        try {
          await mw.beforeAgent(ctx);
          span.end();
        } catch (err) {
          span.end({ error: String(err) });
          throw err;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // afterAgent
  // -------------------------------------------------------------------------

  /**
   * Calls `afterAgent` on each middleware in registration order.
   * Each middleware invocation produces an auto-span in the TracingContext.
   */
  async afterAgent(ctx: MiddlewareContext, result: AgentResult): Promise<void> {
    for (const mw of this.middleware) {
      if (mw.afterAgent) {
        const span = ctx.tracing.createSpan(`afterAgent:${mw.id}`, {
          finishReason: result.finishReason,
        });
        try {
          await mw.afterAgent(ctx, result);
          span.end();
        } catch (err) {
          span.end({ error: String(err) });
          throw err;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // beforeModel
  // -------------------------------------------------------------------------

  /**
   * Calls `beforeModel` on each middleware in registration order.
   * If a middleware returns a modified messages array, that array is passed
   * to subsequent middleware (and ultimately to the model).
   * Each middleware invocation produces an auto-span in the TracingContext.
   */
  async beforeModel(
    ctx: MiddlewareContext,
    messages: ModelMessage[]
  ): Promise<ModelMessage[]> {
    let current = messages;
    for (const mw of this.middleware) {
      if (mw.beforeModel) {
        const span = ctx.tracing.createSpan(`beforeModel:${mw.id}`, {
          messageCount: current.length,
        });
        try {
          const result = await mw.beforeModel(ctx, current);
          if (result !== undefined && result !== null) {
            current = result;
          }
          span.end();
        } catch (err) {
          span.end({ error: String(err) });
          throw err;
        }
      }
    }
    return current;
  }

  // -------------------------------------------------------------------------
  // afterModel
  // -------------------------------------------------------------------------

  /**
   * Calls `afterModel` on each middleware in registration order.
   * Each middleware invocation produces an auto-span in the TracingContext.
   */
  async afterModel(
    ctx: MiddlewareContext,
    response: ModelResponse
  ): Promise<void> {
    for (const mw of this.middleware) {
      if (mw.afterModel) {
        const span = ctx.tracing.createSpan(`afterModel:${mw.id}`, {
          totalTokens: response.usage?.totalTokens,
        });
        try {
          await mw.afterModel(ctx, response);
          span.end();
        } catch (err) {
          span.end({ error: String(err) });
          throw err;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // wrapToolCall
  // -------------------------------------------------------------------------

  /**
   * Composes `wrapToolCall` hooks as an onion around the real executor.
   *
   * The outermost middleware in the array wraps the next, which wraps the
   * next, until the innermost middleware wraps the actual `execute` function.
   *
   * Middleware that do not implement `wrapToolCall` are transparently skipped.
   *
   * A span is automatically created for the overall tool call execution.
   */
  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    const span = ctx.tracing.createSpan(`tool:${toolName}`, { args });

    // Build the composed executor from innermost → outermost (reverse order).
    // At each layer, the previous layer's executor becomes the `execute`
    // argument passed to the current middleware.
    const composed = [...this.middleware]
      .reverse()
      .reduce<ToolExecutor>((inner, mw) => {
        if (!mw.wrapToolCall) {
          // This middleware doesn't wrap tool calls — pass through.
          return inner;
        }
        // Return a new executor that calls this middleware's wrapToolCall,
        // handing it `inner` as the next executor.
        return (callArgs: Record<string, unknown>) =>
          mw.wrapToolCall!(ctx, toolName, callArgs, inner);
      }, execute);

    try {
      const result = await composed(args);
      span.end(result);
      return result;
    } catch (err) {
      span.end({ error: String(err) });
      throw err;
    }
  }
}
