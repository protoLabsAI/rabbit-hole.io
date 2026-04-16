/**
 * Domain Metadata Hooks
 *
 * React hooks for accessing domain metadata with theme override support.
 */

import { useMemo } from "react";

import { domainRegistry, type DomainConfig } from "@protolabsai/types";

import { useTheme } from "../context/ThemeProvider";

/**
 * Hook for accessing domain metadata with theme overrides
 *
 * @example
 * const metadata = useDomainMetadata("medical");
 * // → { name: "medical", ui: { color: "#EF4444", icon: "🏥" }, ... }
 */
export function useDomainMetadata(domainName: string) {
  const { currentTheme } = useTheme();

  return useMemo(() => {
    const config = domainRegistry.getDomainConfig(domainName);
    if (!config) return null;

    // Apply theme overrides if present
    const themeOverride = currentTheme.domainOverrides?.[domainName];
    if (themeOverride) {
      return {
        ...config,
        ui: { ...config.ui, ...themeOverride.ui },
      };
    }

    return config;
  }, [domainName, currentTheme]);
}

/**
 * Hook for all registered domains
 *
 * @example
 * const domains = useAllDomains();
 * // → [{ name: "medical", ... }, { name: "social", ... }, ...]
 */
export function useAllDomains(): DomainConfig[] {
  const { currentTheme } = useTheme();

  return useMemo(() => {
    return domainRegistry.getAllDomains().map((domain) => {
      const override = currentTheme.domainOverrides?.[domain.name];
      if (override) {
        return {
          ...domain,
          ui: { ...domain.ui, ...override.ui },
        };
      }
      return domain;
    });
  }, [currentTheme]);
}

/**
 * Get domain color (convenience hook)
 *
 * @example
 * const color = useDomainColor("medical");
 * // → "#EF4444"
 */
export function useDomainColor(domain: string): string {
  const metadata = useDomainMetadata(domain);
  return metadata?.ui.color || "#6B7280";
}

/**
 * Get domain icon (convenience hook)
 *
 * @example
 * const icon = useDomainIcon("medical");
 * // → "🏥"
 */
export function useDomainIcon(domain: string): string {
  const metadata = useDomainMetadata(domain);
  return metadata?.ui.icon || "📦";
}

/**
 * Get entity icon from domain
 *
 * @example
 * const icon = useEntityIcon("medical", "Disease");
 * // → "🦠"
 */
export function useEntityIcon(domain: string, entityType: string): string {
  const metadata = useDomainMetadata(domain);
  return metadata?.ui.entityIcons?.[entityType] || metadata?.ui.icon || "📦";
}
