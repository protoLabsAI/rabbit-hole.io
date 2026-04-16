/**
 * Webhook delivery for push notifications.
 *
 * Subscribes to task terminal events and POSTs the artifact to every
 * registered config URL. Critical invariants:
 *
 *  - The URL is read from the LIVE push config record on every delivery,
 *    never closed over. A late `pushNotificationConfig/set` update must
 *    redirect deliveries for the same task+id without a restart.
 *  - SSRF validator runs before every send, so a config that passed
 *    registration but was later mutated to a private address still fails.
 *  - Don't log bodies or Authorization headers — task artifacts are
 *    confidential. Log the URL + status code only.
 */

import type { PushConfigStore } from "../store/push-config-store.js";
import type { StoreEvent, TaskStore } from "../store/task-store.js";

import type { SsrfValidator } from "./ssrf.js";

export interface WebhookDeliveryConfig {
  taskStore: TaskStore;
  pushStore: PushConfigStore;
  ssrf: SsrfValidator;
  /** Outbound timeout per delivery. Default 10s. */
  timeoutMs?: number;
  fetch?: typeof fetch;
  logger?: (msg: string) => void;
}

export interface WebhookDelivery {
  /**
   * Attach a terminal-event subscriber for a task. Fires delivery for every
   * push config registered at the moment of termination. Safe to call
   * before any configs are registered — list() lookup is done on each event.
   */
  subscribeTask: (taskId: string) => void;
  /** Unsubscribe all attached tasks. */
  dispose: () => void;
}

export function attachWebhookDelivery(
  cfg: WebhookDeliveryConfig
): WebhookDelivery {
  const timeoutMs = cfg.timeoutMs ?? 10_000;
  const doFetch = cfg.fetch ?? globalThis.fetch;
  const log = cfg.logger ?? (() => {});

  const disposers: Array<() => void> = [];

  const subscribeTask = (taskId: string): void => {
    const unsubscribe = cfg.taskStore.subscribe(taskId, (event: StoreEvent) => {
      if (event.kind !== "status-update" || !event.final) return;
      const configs = cfg.pushStore.list(taskId);
      if (configs.length === 0) return;
      // Re-fetch the record at delivery time to pick up any mid-flight
      // updates to the artifact.
      const record = cfg.taskStore.get(taskId);
      if (!record) return;
      for (const c of configs) {
        void deliver(c.id, taskId, {
          doFetch,
          timeoutMs,
          ssrf: cfg.ssrf,
          pushStore: cfg.pushStore,
          log,
          record,
        });
      }
    });
    disposers.push(unsubscribe);
  };

  return {
    subscribeTask,
    dispose: () => {
      for (const d of disposers) d();
    },
  };
}

// Exported separately so tests can exercise delivery without subscribing.
export async function deliver(
  configId: string,
  taskId: string,
  deps: {
    doFetch: typeof fetch;
    timeoutMs: number;
    ssrf: SsrfValidator;
    pushStore: PushConfigStore;
    log: (msg: string) => void;
    record: { taskId: string; artifact: unknown; status: unknown };
  }
): Promise<void> {
  // Re-read the config on every delivery — never closed-over.
  const cfg = deps.pushStore.get(taskId, configId);
  if (!cfg) {
    deps.log(`[webhook] no config for ${taskId}/${configId}`);
    return;
  }

  try {
    deps.ssrf.validate(cfg.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.log(`[webhook] ssrf rejected ${cfg.url}: ${message}`);
    return;
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), deps.timeoutMs);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (cfg.token) headers["authorization"] = `Bearer ${cfg.token}`;
    const res = await deps.doFetch(cfg.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "task",
        taskId: deps.record.taskId,
        status: deps.record.status,
        artifact: deps.record.artifact,
      }),
      signal: ac.signal,
    });
    // URL + status only — no body, no token.
    deps.log(
      `[webhook] delivered ${taskId}/${configId} → ${cfg.url} (${res.status})`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.log(`[webhook] failed ${taskId}/${configId} → ${cfg.url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}
