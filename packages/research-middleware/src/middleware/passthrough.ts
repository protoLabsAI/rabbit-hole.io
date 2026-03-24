/**
 * PassthroughMiddleware — the no-op reference implementation.
 *
 * All hooks are implemented but do nothing: they return `undefined` and pass
 * execution straight through. This is useful as:
 *
 *  1. A base case to verify the chain executor handles no-op hooks correctly.
 *  2. A reference showing the full middleware interface contract.
 *  3. A starting template when writing new middleware.
 */

import type {
  AgentResult,
  MiddlewareContext,
  ModelMessage,
  ModelResponse,
  ResearchMiddleware,
  ToolExecutor,
} from "../types.js";

export class PassthroughMiddleware implements ResearchMiddleware {
  readonly id = "passthrough";

  /** No-op: returns without modifying context. */
  async beforeAgent(_ctx: MiddlewareContext): Promise<void> {
    // passthrough — intentionally empty
  }

  /** No-op: returns without modifying context. */
  async afterAgent(
    _ctx: MiddlewareContext,
    _result: AgentResult
  ): Promise<void> {
    // passthrough — intentionally empty
  }

  /**
   * No-op: returns `undefined` so the chain continues with the
   * original messages unchanged.
   */
  async beforeModel(
    _ctx: MiddlewareContext,
    _messages: ModelMessage[]
  ): Promise<undefined> {
    return undefined;
  }

  /** No-op: returns without inspecting the response. */
  async afterModel(
    _ctx: MiddlewareContext,
    _response: ModelResponse
  ): Promise<void> {
    // passthrough — intentionally empty
  }

  /**
   * No-op: delegates directly to the next executor without modification.
   */
  async wrapToolCall(
    _ctx: MiddlewareContext,
    _toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    return execute(args);
  }
}
