/**
 * Push notification config registry.
 *
 * Each task can have multiple configs (e.g. a webhook + a separate analytics
 * endpoint). Configs are read from the live record on every delivery — never
 * closed over — so updates via `tasks/pushNotificationConfig/set` take
 * effect immediately for ongoing deliveries.
 */

export interface PushNotificationConfig {
  /** Owning task */
  taskId: string;
  /** Config id — unique per task. Defaults to taskId if caller omits it. */
  id: string;
  /** Webhook URL receiving POST with task artifact. Validated for SSRF in 16e. */
  url: string;
  /** Optional auth token supplied as Authorization: Bearer on delivery. */
  token?: string;
}

export class PushConfigStore {
  private byTask = new Map<string, Map<string, PushNotificationConfig>>();

  set(cfg: PushNotificationConfig): void {
    let configs = this.byTask.get(cfg.taskId);
    if (!configs) {
      configs = new Map();
      this.byTask.set(cfg.taskId, configs);
    }
    configs.set(cfg.id, cfg);
  }

  get(taskId: string, id: string): PushNotificationConfig | undefined {
    return this.byTask.get(taskId)?.get(id);
  }

  list(taskId: string): PushNotificationConfig[] {
    const configs = this.byTask.get(taskId);
    if (!configs) return [];
    return [...configs.values()];
  }

  delete(taskId: string, id: string): boolean {
    const configs = this.byTask.get(taskId);
    if (!configs) return false;
    const removed = configs.delete(id);
    if (configs.size === 0) this.byTask.delete(taskId);
    return removed;
  }

  /** Drop all configs for a task — used when the task is evicted. */
  purge(taskId: string): void {
    this.byTask.delete(taskId);
  }
}
