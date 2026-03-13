/**
 * Theme-Domain Integration
 *
 * Bridges theme system with domain configuration system.
 */

import type { DomainConfig } from "./domain-config.interface";
import type { DomainRegistry } from "./domain-registry";

/**
 * Theme configuration interface extension
 */
export interface ThemeConfigWithDomains {
  domainOverrides?: {
    [domainName: string]: Partial<DomainConfig>;
  };
}

/**
 * Apply theme overrides to domains
 */
export function applyThemeToDomains(
  theme: ThemeConfigWithDomains,
  registry: DomainRegistry
): void {
  if (!theme.domainOverrides) return;

  Object.entries(theme.domainOverrides).forEach(([domainName, overrides]) => {
    registry.override(domainName, overrides);
  });
}
