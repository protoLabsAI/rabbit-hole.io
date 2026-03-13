/**
 * Theme Color Resolver
 *
 * Resolves domain colors from theme when themeBindings are configured.
 */

import type { DomainConfig } from "./domain-config.interface";

// Simple theme color type (avoid circular dependencies)
interface ThemeColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
}

interface SimpleTheme {
  colors: {
    primary?: ThemeColorScale;
    secondary?: ThemeColorScale;
    accent?: ThemeColorScale;
    success?: ThemeColorScale;
    warning?: ThemeColorScale;
    error?: ThemeColorScale;
    [key: string]: ThemeColorScale | undefined;
  };
}

/**
 * Resolve domain color with theme bindings
 *
 * @param domainConfig - Domain configuration
 * @param theme - Active theme (optional)
 * @returns Resolved color (hex)
 */
export function resolveDomainColor(
  domainConfig: DomainConfig,
  theme?: SimpleTheme
): string {
  const bindings = domainConfig.themeBindings;

  // If no theme bindings or no theme, use domain color
  if (!bindings?.useThemeColors || !theme || !bindings.primaryColor) {
    return domainConfig.ui.color;
  }

  // Get theme color
  const themeColor = theme.colors[bindings.primaryColor];
  if (!themeColor) {
    return domainConfig.ui.color;
  }

  // Use main shade (500) or fallback
  return themeColor["500"] || themeColor["600"] || domainConfig.ui.color;
}

/**
 * Resolve domain icon with theme overrides
 */
export function resolveDomainIcon(
  domainConfig: DomainConfig,
  themeIconOverride?: string
): string {
  const bindings = domainConfig.themeBindings;

  // If theme override allowed and provided, use it
  if (bindings?.allowIconOverride && themeIconOverride) {
    return themeIconOverride;
  }

  return domainConfig.ui.icon;
}

/**
 * Apply theme to domain UI config
 */
export function applyThemeToDomainUI(
  domainConfig: DomainConfig,
  theme?: SimpleTheme,
  themeIconOverride?: string
): DomainConfig["ui"] {
  return {
    ...domainConfig.ui,
    color: resolveDomainColor(domainConfig, theme),
    icon: resolveDomainIcon(domainConfig, themeIconOverride),
  };
}
