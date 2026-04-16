/**
 * Research URL Generation Utils
 *
 * Ensures consistent URL format for research page navigation.
 * Uses settings JSON object format as required by nuqs.
 */

import type { ResearchSettings, TimeWindow } from "@protolabsai/types";

export interface ResearchUrlOptions {
  entity: string;
  settings?: Partial<ResearchSettings>;
  timeWindow?: TimeWindow;
  showLabels?: boolean;
  showEdgeLabels?: boolean;
}

/**
 * Generate research URL with proper nuqs format
 * Uses settings JSON object instead of individual parameters
 */
export function generateResearchUrl(options: ResearchUrlOptions): string {
  const params = new URLSearchParams();

  // Required entity parameter
  params.set("entity", options.entity);

  // Settings object (with defaults if not provided)
  const settings: ResearchSettings = {
    hops: 0, // Default: show only center entity
    nodeLimit: 50,
    sentiments: null,
    entityTypes: null,
    ...options.settings,
  };
  params.set("settings", JSON.stringify(settings));

  // Optional parameters
  if (options.timeWindow) {
    params.set("timeWindow", JSON.stringify(options.timeWindow));
  }

  if (options.showLabels !== undefined) {
    params.set("showLabels", options.showLabels.toString());
  }

  if (options.showEdgeLabels !== undefined) {
    params.set("showEdgeLabels", options.showEdgeLabels.toString());
  }

  return `/research?${params.toString()}`;
}

/**
 * Navigate to research page with proper URL format
 * Replaces any existing navigation that might use individual parameters
 */
export function navigateToResearch(options: ResearchUrlOptions): void {
  const url = generateResearchUrl(options);
  window.location.href = url;
}

/**
 * Validate research URL format
 * Returns true if URL uses proper nuqs format (no individual hops/nodeLimit)
 */
export function validateResearchUrl(url: URL): boolean {
  const urlString = url.toString();

  // Should have settings parameter
  if (!url.searchParams.has("settings")) {
    console.error("⚠️ Invalid research URL: missing settings parameter");
    return false;
  }

  // Should NOT have individual hops/nodeLimit parameters
  if (url.searchParams.has("hops") || url.searchParams.has("nodeLimit")) {
    console.error(
      "⚠️ Invalid research URL: individual hops/nodeLimit parameters detected (should use settings object)"
    );
    return false;
  }

  return true;
}

/**
 * Clean and repair research URL
 * Removes individual parameters in favor of settings object
 */
export function repairResearchUrl(url: URL): string {
  const cleanUrl = new URL(url);

  // Remove any individual parameters that should be in settings
  cleanUrl.searchParams.delete("hops");
  cleanUrl.searchParams.delete("nodeLimit");
  cleanUrl.searchParams.delete("sentiments"); // If individual
  cleanUrl.searchParams.delete("entityTypes"); // If individual

  return cleanUrl.toString();
}
