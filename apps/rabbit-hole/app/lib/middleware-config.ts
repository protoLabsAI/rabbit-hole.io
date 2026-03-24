/**
 * Middleware configuration for the Rabbit Hole research agent.
 *
 * Returns a singleton MiddlewareRegistry seeded from environment/config.
 * Additional middleware can be registered via registry.register() at startup.
 *
 * Currently active middleware:
 *   - PassthroughMiddleware: no-op reference implementation (always enabled)
 */

import {
  ClarificationMiddleware,
  MiddlewareRegistry,
  PassthroughMiddleware,
} from "@proto/research-middleware";

let _registry: MiddlewareRegistry | null = null;

/**
 * Returns the shared MiddlewareRegistry for the search agent.
 * The registry is created once (singleton) and reused across requests.
 */
export function getMiddlewareRegistry(): MiddlewareRegistry {
  if (!_registry) {
    _registry = new MiddlewareRegistry({
      entries: [
        {
          id: "passthrough",
          enabled: true,
          middleware: new PassthroughMiddleware(),
        },
        {
          id: "clarification",
          enabled: true,
          middleware: new ClarificationMiddleware(),
        },
      ],
    });
  }
  return _registry;
}
