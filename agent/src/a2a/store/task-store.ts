/**
 * In-memory task store for the A2A server.
 *
 * Responsibilities:
 *  - Authoritative state machine for every task (submitted → working → terminal)
 *  - Atomic cancel via synchronous read-modify-write (no race window)
 *  - TTL eviction of terminal tasks (completed/failed/canceled)
 *  - Subscription layer for SSE consumers (decoupled from the producer)
 *  - Ownership of the producer's AbortController so cooperative cancel works
 *
 * Intentionally in-memory. Task durability is out of scope for the A2A spec
 * and would be a separate concern (Redis/Postgres). For workstacean traffic
 * patterns (short-lived requests, 1h TTL) in-memory is the right fit.
 */

import { randomUUID } from "node:crypto";

// ── Spec types ──────────────────────────────────────────────────────

export type TaskState =
  | "submitted"
  | "working"
  | "completed"
  | "failed"
  | "canceled"
  | "input-required";

export const TERMINAL_STATES: ReadonlySet<TaskState> = new Set([
  "completed",
  "failed",
  "canceled",
]);

export interface ArtifactPart {
  kind: "text";
  text: string;
}

export interface Artifact {
  artifactId: string;
  parts: ArtifactPart[];
}

export interface TaskStatus {
  state: TaskState;
  /** ISO-8601 */
  timestamp: string;
}

export interface TaskRecord {
  taskId: string;
  contextId: string;
  skill: string;
  input: string;
  status: TaskStatus;
  artifact: Artifact;
  /** Set when state=failed */
  error?: { code: number; message: string };
  /** createdAt / updatedAt in ms */
  createdAt: number;
  updatedAt: number;
  /** Monotonically increasing chunk sequence — used by SSE last_sent_len tracking */
  textLength: number;
}

// ── Events published to subscribers ─────────────────────────────────

export type StoreEvent =
  | {
      kind: "status-update";
      taskId: string;
      status: TaskStatus;
      final: boolean;
    }
  | {
      kind: "artifact-update";
      taskId: string;
      artifact: Artifact;
      append: boolean;
      lastChunk: boolean;
    };

export type Subscriber = (event: StoreEvent) => void;

// ── Producer contract ───────────────────────────────────────────────

export interface ProducerContext {
  taskId: string;
  contextId: string;
  signal: AbortSignal;
  /** Append text to the artifact + notify subscribers with append:true delta. */
  pushText: (chunk: string) => void;
  /** Mark the task complete with the final artifact text. */
  finish: () => void;
  /** Mark the task failed. */
  fail: (error: { code: number; message: string }) => void;
}

export type ProducerFn = (ctx: ProducerContext, input: string) => Promise<void>;

// ── Config ──────────────────────────────────────────────────────────

export interface TaskStoreConfig {
  /** ms to retain a terminal task before eviction. Default 1h. */
  terminalTtlMs?: number;
  /** Interval for eviction sweeps. Default 60s. */
  sweepIntervalMs?: number;
  /** Optional clock for tests. */
  now?: () => number;
}

// ── Store ───────────────────────────────────────────────────────────

export class TaskStore {
  private tasks = new Map<string, TaskRecord>();
  private controllers = new Map<string, AbortController>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private readonly terminalTtlMs: number;
  private readonly now: () => number;
  private sweepTimer?: NodeJS.Timeout;

  constructor(private readonly cfg: TaskStoreConfig = {}) {
    this.terminalTtlMs = cfg.terminalTtlMs ?? 60 * 60 * 1000;
    this.now = cfg.now ?? Date.now;
    const sweepMs = cfg.sweepIntervalMs ?? 60_000;
    if (sweepMs > 0) {
      this.sweepTimer = setInterval(() => this.sweep(), sweepMs);
      this.sweepTimer.unref();
    }
  }

  dispose(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const ctrl of this.controllers.values()) ctrl.abort();
    this.controllers.clear();
    this.subscribers.clear();
    this.tasks.clear();
  }

  // ── Creation ──────────────────────────────────────────────────────

  create(params: {
    skill: string;
    input: string;
    contextId?: string;
  }): TaskRecord {
    const taskId = randomUUID();
    const t = this.now();
    const record: TaskRecord = {
      taskId,
      contextId: params.contextId ?? randomUUID(),
      skill: params.skill,
      input: params.input,
      status: { state: "submitted", timestamp: new Date(t).toISOString() },
      artifact: {
        artifactId: randomUUID(),
        parts: [{ kind: "text", text: "" }],
      },
      createdAt: t,
      updatedAt: t,
      textLength: 0,
    };
    this.tasks.set(taskId, record);
    return record;
  }

  /**
   * Launch the background producer for a task. Moves state submitted→working
   * and calls the producer with a context that can push text and finish/fail.
   * The producer runs detached from the caller — consumer disconnects do not
   * cancel it; only an explicit cancel() or producer completion does.
   */
  startProducer(taskId: string, producer: ProducerFn): void {
    const record = this.tasks.get(taskId);
    if (!record) throw new Error(`Unknown task: ${taskId}`);
    if (record.status.state !== "submitted") {
      throw new Error(
        `Cannot start producer for task in state ${record.status.state}`
      );
    }

    const controller = new AbortController();
    this.controllers.set(taskId, controller);
    this.transition(taskId, "working");

    const ctx: ProducerContext = {
      taskId,
      contextId: record.contextId,
      signal: controller.signal,
      pushText: (chunk) => this.pushText(taskId, chunk),
      finish: () => this.finish(taskId),
      fail: (error) => this.fail(taskId, error),
    };

    // Fire and forget. Producer runs in the background; its lifecycle is
    // owned by the store, not the caller.
    void producer(ctx, record.input)
      .then(() => {
        const final = this.tasks.get(taskId);
        if (final && !TERMINAL_STATES.has(final.status.state)) {
          this.finish(taskId);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        const current = this.tasks.get(taskId);
        if (current && !TERMINAL_STATES.has(current.status.state)) {
          this.fail(taskId, { code: -32603, message });
        }
      });
  }

  // ── Reads ─────────────────────────────────────────────────────────

  get(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  list(): TaskRecord[] {
    return [...this.tasks.values()];
  }

  // ── State transitions (atomic, sync) ──────────────────────────────

  /**
   * Atomic cancel. Single synchronous read-write on the state — if the task
   * is already terminal, this is a no-op. Otherwise we transition to
   * "canceled" and abort the producer. There is no yield point between the
   * state check and the mutation, so no race window is possible.
   */
  cancel(taskId: string): { canceled: boolean; state: TaskState | "unknown" } {
    const record = this.tasks.get(taskId);
    if (!record) return { canceled: false, state: "unknown" };
    if (TERMINAL_STATES.has(record.status.state)) {
      return { canceled: false, state: record.status.state };
    }

    this.transition(taskId, "canceled");
    const controller = this.controllers.get(taskId);
    if (controller) {
      controller.abort();
      this.controllers.delete(taskId);
    }
    return { canceled: true, state: "canceled" };
  }

  private pushText(taskId: string, chunk: string): void {
    const record = this.tasks.get(taskId);
    if (!record || TERMINAL_STATES.has(record.status.state)) return;
    const part = record.artifact.parts[0];
    if (!part) return;
    part.text = `${part.text}${chunk}`;
    record.textLength = part.text.length;
    record.updatedAt = this.now();
    this.emit(taskId, {
      kind: "artifact-update",
      taskId,
      artifact: {
        artifactId: record.artifact.artifactId,
        parts: [{ kind: "text", text: chunk }],
      },
      append: true,
      lastChunk: false,
    });
  }

  private finish(taskId: string): void {
    const record = this.tasks.get(taskId);
    if (!record || TERMINAL_STATES.has(record.status.state)) return;
    record.updatedAt = this.now();
    // Emit terminal artifact (full) then terminal status per spec's 2-event
    // sequence on task completion.
    this.emit(taskId, {
      kind: "artifact-update",
      taskId,
      artifact: record.artifact,
      append: false,
      lastChunk: true,
    });
    this.transition(taskId, "completed");
    this.controllers.delete(taskId);
  }

  private fail(taskId: string, error: { code: number; message: string }): void {
    const record = this.tasks.get(taskId);
    if (!record || TERMINAL_STATES.has(record.status.state)) return;
    record.error = error;
    record.updatedAt = this.now();
    this.transition(taskId, "failed");
    this.controllers.delete(taskId);
  }

  private transition(taskId: string, next: TaskState): void {
    const record = this.tasks.get(taskId);
    if (!record) return;
    record.status = {
      state: next,
      timestamp: new Date(this.now()).toISOString(),
    };
    record.updatedAt = this.now();
    this.emit(taskId, {
      kind: "status-update",
      taskId,
      status: record.status,
      final: TERMINAL_STATES.has(next),
    });
  }

  // ── Subscriptions (SSE-adjacent) ──────────────────────────────────

  /**
   * Subscribe to a task's event stream. Returns an unsubscribe function.
   * The store calls the subscriber synchronously when events fire; consumers
   * are responsible for flushing to SSE without blocking.
   *
   * Subscriber lifecycle is independent of the producer — if the consumer
   * disconnects and unsubscribes, the producer keeps running; new
   * :resubscribe attaches a fresh subscriber and can replay state from the
   * current task record before receiving live events.
   */
  subscribe(taskId: string, subscriber: Subscriber): () => void {
    let set = this.subscribers.get(taskId);
    if (!set) {
      set = new Set();
      this.subscribers.set(taskId, set);
    }
    set.add(subscriber);
    return () => {
      const s = this.subscribers.get(taskId);
      if (!s) return;
      s.delete(subscriber);
      if (s.size === 0) this.subscribers.delete(taskId);
    };
  }

  private emit(taskId: string, event: StoreEvent): void {
    const set = this.subscribers.get(taskId);
    if (!set) return;
    for (const sub of set) {
      try {
        sub(event);
      } catch {
        // A broken subscriber must not corrupt state or block other subs.
      }
    }
  }

  // ── Eviction ──────────────────────────────────────────────────────

  /**
   * Evict terminal tasks older than TTL. Never touches submitted/working —
   * those could be legitimately long-running (deep research can take minutes).
   * Returns the number of evictions for observability in tests.
   */
  sweep(): number {
    const cutoff = this.now() - this.terminalTtlMs;
    let evicted = 0;
    for (const [id, record] of this.tasks) {
      if (!TERMINAL_STATES.has(record.status.state)) continue;
      if (record.updatedAt > cutoff) continue;
      this.tasks.delete(id);
      this.subscribers.delete(id);
      this.controllers.delete(id);
      evicted += 1;
    }
    return evicted;
  }
}
