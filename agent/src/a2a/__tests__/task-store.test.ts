import { describe, expect, it, vi } from "vitest";

import { TaskStore } from "../store/task-store.js";

describe("TaskStore", () => {
  it("evicts terminal tasks past TTL; never evicts submitted/working", () => {
    // Controllable clock so sweep behavior is deterministic.
    let clock = 1_000;
    const store = new TaskStore({
      terminalTtlMs: 1_000,
      sweepIntervalMs: 0, // disable background sweep — we drive it manually
      now: () => clock,
    });

    // Terminal (completed) — should evict after TTL elapses.
    const completed = store.create({ skill: "search", input: "a" });
    // Directly drive the state machine without a producer to keep the test
    // focused on eviction semantics.
    (
      store as unknown as { transition: (id: string, s: string) => void }
    ).transition(completed.taskId, "completed");

    // Still young — no eviction.
    clock += 500;
    expect(store.sweep()).toBe(0);
    expect(store.get(completed.taskId)).toBeDefined();

    // Past TTL — evicted.
    clock += 2_000;
    expect(store.sweep()).toBe(1);
    expect(store.get(completed.taskId)).toBeUndefined();

    // Submitted — never evicts even when ancient.
    const submitted = store.create({ skill: "search", input: "b" });
    clock += 365 * 24 * 60 * 60 * 1000;
    expect(store.sweep()).toBe(0);
    expect(store.get(submitted.taskId)).toBeDefined();

    store.dispose();
  });

  it("atomic cancel: no race between read and write", () => {
    const store = new TaskStore({ sweepIntervalMs: 0 });
    const record = store.create({ skill: "search", input: "x" });

    // Start a trivial producer we'll cancel before it completes.
    store.startProducer(record.taskId, async (ctx) => {
      // Wait for the cancel signal.
      await new Promise<void>((resolve) => {
        ctx.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    });

    // Cancel — should succeed atomically.
    const first = store.cancel(record.taskId);
    expect(first.canceled).toBe(true);
    expect(first.state).toBe("canceled");

    // Second cancel is a no-op — terminal already.
    const second = store.cancel(record.taskId);
    expect(second.canceled).toBe(false);
    expect(second.state).toBe("canceled");

    // Cancel on unknown task.
    const unknown = store.cancel("never-created");
    expect(unknown.canceled).toBe(false);
    expect(unknown.state).toBe("unknown");

    store.dispose();
  });

  it("producer survives consumer disconnect; :resubscribe attaches cleanly", async () => {
    const store = new TaskStore({ sweepIntervalMs: 0 });
    const record = store.create({ skill: "search", input: "x" });

    // Slow producer so we can disconnect mid-stream.
    const producerDone = vi.fn();
    store.startProducer(record.taskId, async (ctx) => {
      ctx.pushText("hello ");
      await new Promise((r) => setTimeout(r, 20));
      ctx.pushText("world");
      ctx.finish();
      producerDone();
    });

    // Subscribe, then immediately unsubscribe (simulated disconnect).
    const first = vi.fn();
    const unsub = store.subscribe(record.taskId, first);
    unsub();

    // Reattach — subscriber 1 is gone, subscriber 2 joins and sees any
    // events from this point forward.
    const second = vi.fn();
    store.subscribe(record.taskId, second);

    // Wait for producer to complete.
    await new Promise((r) => setTimeout(r, 100));

    expect(producerDone).toHaveBeenCalled();
    // Second subscriber got at least the terminal status-update.
    const statusEvents = second.mock.calls
      .map((c) => c[0])
      .filter(
        (e: { kind: string; final?: boolean }) =>
          e.kind === "status-update" && e.final === true
      );
    expect(statusEvents).toHaveLength(1);

    store.dispose();
  });

  it("text deltas are append-only; terminal emits full artifact before final status", async () => {
    const store = new TaskStore({ sweepIntervalMs: 0 });
    const record = store.create({ skill: "search", input: "x" });

    const events: Array<{ kind: string; [k: string]: unknown }> = [];
    store.subscribe(record.taskId, (e) => {
      events.push(e as unknown as { kind: string });
    });

    store.startProducer(record.taskId, async (ctx) => {
      ctx.pushText("a");
      ctx.pushText("b");
      ctx.pushText("c");
      ctx.finish();
    });

    await new Promise((r) => setTimeout(r, 50));

    // Shape: working status → a,b,c append-deltas → full-artifact (append:false, lastChunk:true) → completed-status (final:true)
    const kinds = events.map((e) => e.kind);
    expect(kinds[0]).toBe("status-update"); // working
    const artifactEvents = events.filter((e) => e.kind === "artifact-update");
    // All but the last artifact-update are append:true text deltas.
    const deltas = artifactEvents.slice(0, -1);
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    for (const d of deltas) {
      expect((d as { append: boolean }).append).toBe(true);
      expect((d as { lastChunk: boolean }).lastChunk).toBe(false);
    }
    // Last artifact-update is the full-artifact terminal with append:false, lastChunk:true.
    const terminal = artifactEvents[artifactEvents.length - 1];
    expect((terminal as { append: boolean }).append).toBe(false);
    expect((terminal as { lastChunk: boolean }).lastChunk).toBe(true);

    // The very last event is status-update with final:true (terminal 2-event sequence).
    const last = events[events.length - 1];
    expect(last?.kind).toBe("status-update");
    expect((last as { final: boolean }).final).toBe(true);
    // And the artifact-update precedes the final status-update.
    const idxArtifact = events.indexOf(terminal as unknown as { kind: string });
    const idxFinal = events.length - 1;
    expect(idxArtifact).toBeLessThan(idxFinal);

    store.dispose();
  });
});
