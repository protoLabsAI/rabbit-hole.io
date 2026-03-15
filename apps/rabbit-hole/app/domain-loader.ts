/**
 * Domain Loader - Application Bootstrap (RAB-16)
 *
 * Registers all domains (core + custom) during app initialization
 * Synchronous registration with pre-compiled TypeScript configs
 */

import { domainRegistry } from "@proto/types";

/**
 * Initialize all domains
 * Call this in app/layout.tsx during server initialization
 *
 * Note: This initializes custom domains discovered from custom-domains/ directory.
 * Core domain schemas are available from @proto/types but are not registered
 * with the domain registry system.
 */
export async function initializeDomains(): Promise<void> {
  console.log("🔧 Initializing domain system...");

  // Dynamic import — .generated/ is outside the app scope and Turbopack
  // can't resolve static imports from dot-prefixed directories
  const { registerCustomDomains } = await import(
    "../../../.generated/custom-domains/registry"
  );
  registerCustomDomains();

  const totalDomains = domainRegistry.getAllDomains();
  console.log(`✅ Total custom domains registered: ${totalDomains.length}`);
}
