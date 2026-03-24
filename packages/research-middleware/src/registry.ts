/**
 * Middleware registry.
 *
 * Maintains an ordered list of middleware entries and provides enable/disable
 * controls. The registry produces a filtered list of active middleware that
 * the MiddlewareChain executor consumes.
 */

import { MiddlewareChain } from "./runtime.js";
import type {
  MiddlewareConfig,
  MiddlewareRegistryEntry,
  ResearchMiddleware,
} from "./types.js";

// ---------------------------------------------------------------------------
// MiddlewareRegistry
// ---------------------------------------------------------------------------

export class MiddlewareRegistry {
  private entries: MiddlewareRegistryEntry[];

  constructor(config?: MiddlewareConfig) {
    this.entries = config ? [...config.entries] : [];
  }

  // -------------------------------------------------------------------------
  // Mutation
  // -------------------------------------------------------------------------

  /**
   * Appends a new middleware entry to the registry.
   * If an entry with the same `id` already exists it is replaced.
   */
  register(entry: MiddlewareRegistryEntry): void {
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
    }
  }

  /**
   * Removes a middleware from the registry by id.
   * No-op if the id is not found.
   */
  unregister(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
  }

  /**
   * Enables a registered middleware by id.
   * Throws if the id is not found.
   */
  enable(id: string): void {
    const entry = this.findEntry(id);
    entry.enabled = true;
  }

  /**
   * Disables a registered middleware by id.
   * Throws if the id is not found.
   */
  disable(id: string): void {
    const entry = this.findEntry(id);
    entry.enabled = false;
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  /**
   * Returns a snapshot of all registered entries (enabled and disabled).
   */
  getAll(): MiddlewareRegistryEntry[] {
    return [...this.entries];
  }

  /**
   * Returns only the enabled middleware implementations, in registration order.
   */
  getEnabled(): ResearchMiddleware[] {
    return this.entries.filter((e) => e.enabled).map((e) => e.middleware);
  }

  /**
   * Returns true if a middleware with the given id is registered.
   */
  has(id: string): boolean {
    return this.entries.some((e) => e.id === id);
  }

  /**
   * Returns true if the middleware with the given id is both registered
   * and enabled.
   */
  isEnabled(id: string): boolean {
    const entry = this.entries.find((e) => e.id === id);
    return entry !== undefined && entry.enabled;
  }

  // -------------------------------------------------------------------------
  // Chain factory
  // -------------------------------------------------------------------------

  /**
   * Builds a MiddlewareChain from all currently-enabled middleware.
   * Call this once per agent invocation to get a stable chain snapshot.
   */
  buildChain(): MiddlewareChain {
    return new MiddlewareChain(this.getEnabled());
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private findEntry(id: string): MiddlewareRegistryEntry {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) {
      throw new Error(
        `[MiddlewareRegistry] No middleware registered with id "${id}"`
      );
    }
    return entry;
  }
}
