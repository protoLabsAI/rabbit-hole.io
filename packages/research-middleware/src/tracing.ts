/**
 * Langfuse tracing integration for the research middleware pipeline.
 *
 * Provides a TracingContext that wraps the Langfuse JS SDK. When
 * LANGFUSE_PUBLIC_KEY is not set, all operations are no-ops with zero
 * overhead (NullTracingContext).
 *
 * Usage pattern:
 *   const tracing = createTracingContext({ agentId, query, sessionId });
 *   // pass tracing to MiddlewareContext
 *   await tracing.flush(); // call after chain completes (non-blocking)
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Token usage for a generation span. */
export interface GenerationUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Opaque span handle. Call `end()` when the unit of work is complete.
 */
export interface SpanHandle {
  end(output?: unknown): void;
}

/**
 * Opaque generation handle. Call `end()` when the LLM call is complete.
 */
export interface GenerationHandle {
  end(output?: unknown, usage?: GenerationUsage): void;
}

/**
 * Tracing context passed to middleware via MiddlewareContext.
 *
 * Middleware can create child spans and generation records. When tracing is
 * disabled the implementations are no-ops.
 */
export interface TracingContext {
  /** Create a span (unit of work) within the current trace. */
  createSpan(name: string, metadata?: Record<string, unknown>): SpanHandle;
  /**
   * Create a generation record (LLM call) within the current trace.
   * Input may be provided up-front; output/usage are supplied on `end()`.
   */
  createGeneration(
    name: string,
    model: string,
    input: unknown,
    metadata?: Record<string, unknown>
  ): GenerationHandle;
  /** Asynchronously flush buffered events to Langfuse. Never rejects. */
  flush(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreateTracingContextOptions {
  /** Unique ID for this agent invocation. Becomes the Langfuse trace ID. */
  agentId: string;
  /** The user query that triggered this invocation. */
  query?: string;
  /** Session ID for grouping related traces. */
  sessionId?: string;
  /** Arbitrary metadata attached to the root trace. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// NullTracingContext — zero-overhead no-op when Langfuse is not configured
// ---------------------------------------------------------------------------

const NULL_SPAN: SpanHandle = { end: () => undefined };
const NULL_GENERATION: GenerationHandle = { end: () => undefined };

class NullTracingContext implements TracingContext {
  createSpan(_name: string, _metadata?: Record<string, unknown>): SpanHandle {
    return NULL_SPAN;
  }

  createGeneration(
    _name: string,
    _model: string,
    _input: unknown,
    _metadata?: Record<string, unknown>
  ): GenerationHandle {
    return NULL_GENERATION;
  }

  async flush(): Promise<void> {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// LangfuseTracingContext — real implementation backed by the Langfuse SDK
// ---------------------------------------------------------------------------

class LangfuseTracingContext implements TracingContext {
  private readonly _langfuse: import("langfuse").Langfuse;
  private readonly _trace: import("langfuse").LangfuseTraceClient;

  constructor(
    langfuse: import("langfuse").Langfuse,
    trace: import("langfuse").LangfuseTraceClient
  ) {
    this._langfuse = langfuse;
    this._trace = trace;
  }

  createSpan(name: string, metadata?: Record<string, unknown>): SpanHandle {
    const span = this._trace.span({ name, metadata });
    return {
      end(output?: unknown) {
        span.end({ output });
      },
    };
  }

  createGeneration(
    name: string,
    model: string,
    input: unknown,
    metadata?: Record<string, unknown>
  ): GenerationHandle {
    const generation = this._trace.generation({ name, model, input, metadata });
    return {
      end(output?: unknown, usage?: GenerationUsage) {
        generation.end({
          output,
          usage: usage
            ? {
                input: usage.promptTokens,
                output: usage.completionTokens,
                total: usage.totalTokens,
              }
            : undefined,
        });
      },
    };
  }

  async flush(): Promise<void> {
    try {
      await this._langfuse.flushAsync();
    } catch {
      // Tracing failures must never affect the main application flow.
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Singleton Langfuse instance — created lazily on first use. */
let _langfuseInstance: import("langfuse").Langfuse | null = null;

function getLangfuse(): import("langfuse").Langfuse | null {
  const publicKey = process.env["LANGFUSE_PUBLIC_KEY"];
  const secretKey = process.env["LANGFUSE_SECRET_KEY"];

  if (!publicKey) {
    return null;
  }

  if (!_langfuseInstance) {
    // Dynamic import isn't used here; we rely on the optional peer dep being
    // present if the key is set. The package.json lists langfuse as a regular
    // dependency, so this import is always safe when the dep is installed.
    // We use a lazy require-style pattern to avoid top-level side effects.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Langfuse } = require("langfuse") as typeof import("langfuse");
      _langfuseInstance = new Langfuse({
        publicKey,
        secretKey,
        baseUrl: process.env["LANGFUSE_BASE_URL"] || undefined,
        // Disable automatic flushing on shutdown — we call flushAsync ourselves.
        flushAt: 100,
        flushInterval: 10_000,
      });
    } catch {
      // langfuse package not available — fall back to no-op
      return null;
    }
  }

  return _langfuseInstance;
}

/**
 * Creates a TracingContext for a single agent invocation.
 *
 * Returns a NullTracingContext when LANGFUSE_PUBLIC_KEY is not set, ensuring
 * zero overhead in environments where tracing is not configured.
 */
export function createTracingContext(
  options: CreateTracingContextOptions
): TracingContext {
  const langfuse = getLangfuse();

  if (!langfuse) {
    return new NullTracingContext();
  }

  const trace = langfuse.trace({
    id: options.agentId,
    name: "research-agent",
    input: options.query ? { query: options.query } : undefined,
    sessionId: options.sessionId,
    metadata: options.metadata,
  });

  return new LangfuseTracingContext(langfuse, trace);
}

/**
 * Resets the cached Langfuse singleton. Intended for testing only.
 * @internal
 */
export function _resetLangfuseSingleton(): void {
  _langfuseInstance = null;
}
