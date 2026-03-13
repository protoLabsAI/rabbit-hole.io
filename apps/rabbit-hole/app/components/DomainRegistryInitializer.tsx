"use client";

/**
 * DomainRegistryInitializer - Client-side domain registration
 *
 * This component ensures custom domains are registered in client-side contexts.
 * Server-side registration happens via instrumentation.ts.
 *
 * Pattern: Next.js 15 has separate JS contexts for server/client/API routes.
 * Singletons initialized on server don't exist on client, so we register domains
 * in both contexts independently.
 */

import { useEffect } from "react";

export function DomainRegistryInitializer() {
  useEffect(() => {
    // Dynamic import to avoid bundling .generated files in main bundle
    async function registerDomains() {
      try {
        const { registerCustomDomains } = await import(
          "../../../../.generated/custom-domains/registry"
        );

        registerCustomDomains();
      } catch (error) {
        console.warn(
          "⚠️  Failed to register custom domains on client:",
          error instanceof Error ? error.message : error
        );
      }
    }

    registerDomains();
  }, []);

  // This component doesn't render anything
  return null;
}
