/**
 * Entity Styling Utilities
 *
 * Pure functions for determining visual representation of entities
 * and sentiments in the knowledge graph visualization.
 * Uses domain-based organization with all 77 entity types.
 */

import type { EntityType } from "@protolabsai/types";
import { domainRegistry, getDomainFromEntityType } from "@protolabsai/types";

/**
 * Returns the appropriate emoji icon for an entity type
 * Uses domain metadata UI configurations
 */
export function getEntityImage(entityType: EntityType | string): string {
  const domain = getDomainFromEntityType(entityType);

  // Use domain registry for all domains (including core)
  if (domain) {
    const domainConfig = domainRegistry.getDomainConfig(domain);
    if (domainConfig?.ui) {
      // Normalize entity type: convert underscores to title case
      // e.g., "clinical_trial" -> "Clinical_Trial", "person" -> "Person"
      const normalized = entityType
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("_");

      // Check for entity-specific icon
      if (domainConfig.ui.entityIcons?.[normalized]) {
        return domainConfig.ui.entityIcons[normalized];
      }

      // Fall back to domain icon
      return domainConfig.ui.icon;
    }
  }

  return "⚪"; // Default fallback
}

/**
 * Returns the appropriate color hex code for an entity type
 * Uses domain metadata UI configurations
 */
export function getEntityColor(entityType: EntityType | string): string {
  const domain = getDomainFromEntityType(entityType);

  // Use domain registry for all domains (including core)
  if (domain) {
    const domainConfig = domainRegistry.getDomainConfig(domain);
    if (domainConfig?.ui?.color) {
      return domainConfig.ui.color;
    }
  }

  return "#6B7280"; // Default gray
}

/**
 * Returns the appropriate color hex code for a sentiment type
 * Used for relationship/edge styling based on emotional tone
 */
export function getSentimentColor(sentiment: string): string {
  const sentimentColors = {
    hostile: "#DC2626", // Red for hate speech
    supportive: "#059669", // Green for praise/support
    neutral: "#6B7280", // Gray for neutral
    ambiguous: "#F59E0B", // Amber for unclear
  };
  return (
    sentimentColors[sentiment.toLowerCase() as keyof typeof sentimentColors] ||
    sentimentColors.neutral
  );
}
