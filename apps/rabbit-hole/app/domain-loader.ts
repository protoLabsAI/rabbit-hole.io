/**
 * Domain Loader - Application Bootstrap (RAB-16)
 *
 * Registers all domains (core + custom) during app initialization
 * Synchronous registration with pre-compiled TypeScript configs
 */

import { domainRegistry } from "@proto/types";

import { registerCustomDomains } from "../../../.generated/custom-domains/registry";

/**
 * Initialize all domains
 * Call this in app/layout.tsx during server initialization
 * Synchronous - no async overhead
 *
 * Note: This initializes custom domains discovered from custom-domains/ directory.
 * Core domain schemas are available from @proto/types but are not registered
 * with the domain registry system.
 */
export function initializeDomains(): void {
  console.log("🔧 Initializing domain system...");

  // Register custom domains from auto-discovery (synchronous)
  registerCustomDomains();

  const totalDomains = domainRegistry.getAllDomains();
  console.log(`✅ Total custom domains registered: ${totalDomains.length}`);
}
