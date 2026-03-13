"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * URL Cleanup Hook for Research Page
 *
 * Automatically consolidates duplicate parameters into the nuqs format:
 * - Removes individual `hops`, `nodeLimit` parameters
 * - Ensures only `settings` JSON object is used
 * - Cleans up ugly mixed parameter URLs
 *
 * Example fix:
 * BEFORE: /research?entity=X&hops=4&nodeLimit=500&settings={"hops":3,"nodeLimit":500}
 * AFTER:  /research?entity=X&settings={"hops":4,"nodeLimit":500}
 */
export function useUrlCleanup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if URL has problematic duplicate parameters
    const hasIndividualHops = searchParams.has("hops");
    const hasIndividualNodeLimit = searchParams.has("nodeLimit");
    const hasSettings = searchParams.has("settings");

    // If we have both individual params AND settings, we need to clean up
    if ((hasIndividualHops || hasIndividualNodeLimit) && hasSettings) {
      console.warn("🧹 Detected duplicate parameters in URL - cleaning up");

      const cleanParams = new URLSearchParams();

      // Keep entity parameter
      const entity = searchParams.get("entity");
      if (entity) {
        cleanParams.set("entity", entity);
      }

      // Parse existing settings or create from individual params
      let settings: any = {};
      try {
        if (hasSettings) {
          settings = JSON.parse(searchParams.get("settings") || "{}");
        }
      } catch (e) {
        console.error("Failed to parse settings JSON:", e);
      }

      // Individual params take precedence over settings object
      if (hasIndividualHops) {
        settings.hops = parseInt(searchParams.get("hops") || "0", 10);
      }
      if (hasIndividualNodeLimit) {
        settings.nodeLimit = parseInt(
          searchParams.get("nodeLimit") || "50",
          10
        );
      }

      // Set cleaned settings
      cleanParams.set("settings", JSON.stringify(settings));

      // Preserve UI preferences
      const showLabels = searchParams.get("showLabels");
      if (showLabels !== null) {
        cleanParams.set("showLabels", showLabels);
      }

      const showEdgeLabels = searchParams.get("showEdgeLabels");
      if (showEdgeLabels !== null) {
        cleanParams.set("showEdgeLabels", showEdgeLabels);
      }

      // Preserve time window if present
      const timeWindow = searchParams.get("timeWindow");
      if (timeWindow) {
        cleanParams.set("timeWindow", timeWindow);
      }

      // Replace URL without page reload
      const cleanUrl = `/research?${cleanParams.toString()}`;
      console.log("✨ Cleaned URL:", cleanUrl);
      router.replace(cleanUrl);
    } else if ((hasIndividualHops || hasIndividualNodeLimit) && !hasSettings) {
      // If we ONLY have individual params (no settings object), create settings from them
      console.warn("🧹 Converting individual parameters to settings object");

      const cleanParams = new URLSearchParams();

      // Keep entity parameter
      const entity = searchParams.get("entity");
      if (entity) {
        cleanParams.set("entity", entity);
      }

      // Build settings from individual params
      const settings = {
        hops: parseInt(searchParams.get("hops") || "0", 10),
        nodeLimit: parseInt(searchParams.get("nodeLimit") || "50", 10),
        sentiments: null,
        entityTypes: null,
      };

      cleanParams.set("settings", JSON.stringify(settings));

      // Preserve UI preferences
      const showLabels = searchParams.get("showLabels");
      if (showLabels !== null) {
        cleanParams.set("showLabels", showLabels);
      }

      const showEdgeLabels = searchParams.get("showEdgeLabels");
      if (showEdgeLabels !== null) {
        cleanParams.set("showEdgeLabels", showEdgeLabels);
      }

      // Replace URL
      const cleanUrl = `/research?${cleanParams.toString()}`;
      console.log("✨ Converted to clean URL:", cleanUrl);
      router.replace(cleanUrl);
    }
  }, [searchParams, router]);
}
