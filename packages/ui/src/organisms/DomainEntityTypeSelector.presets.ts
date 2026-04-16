/**
 * DomainEntityTypeSelector Presets
 *
 * Common preset configurations for quick selection
 * Dynamically generated from domain configs
 */

import { domainRegistry, getEntityTypesForDomains } from "@protolabsai/types";

export interface PresetConfig {
  label: string;
  types: string[];
  icon?: string;
}

/**
 * Generate presets dynamically from domain configs
 */
function generatePresets(): Record<string, PresetConfig> {
  const entityTypesByDomain = domainRegistry.getEntityTypesByDomain();

  return {
    social: {
      label: "Social Network",
      types: getEntityTypesForDomains(["social"]).slice(0, 4),
      icon: "users",
    },
    academic: {
      label: "Academic Research",
      types: getEntityTypesForDomains(["academic"]).slice(0, 4),
      icon: "book",
    },
    geographic: {
      label: "Geographic",
      types: getEntityTypesForDomains(["geographic"]).slice(0, 4),
      icon: "map",
    },
    medical: {
      label: "Medical & Health",
      types: getEntityTypesForDomains(["medical"]).slice(0, 4),
      icon: "heart",
    },
    technology: {
      label: "Technology",
      types: getEntityTypesForDomains(["technology"]).slice(0, 4),
      icon: "cpu",
    },
    peopleOrgs: {
      label: "People & Orgs",
      types: (() => {
        if (!entityTypesByDomain.social) {
          return ["Person", "Organization"];
        }
        const filteredList = entityTypesByDomain.social.filter((t) =>
          ["Person", "Organization"].includes(t)
        );
        return filteredList.length ? filteredList : ["Person", "Organization"];
      })(),
      icon: "users",
    },
    comprehensive: {
      label: "All Common Types",
      types: (() => {
        const allTypes = getEntityTypesForDomains([
          "social",
          "academic",
          "geographic",
          "technology",
        ]);
        // Deduplicate while preserving order
        const seen = new Set<string>();
        const uniqueTypes = allTypes.filter((type) => {
          if (seen.has(type)) {
            return false;
          }
          seen.add(type);
          return true;
        });
        return uniqueTypes.slice(0, 10);
      })(),
      icon: "grid",
    },
  };
}

/**
 * Common preset configurations (lazy-initialized on first access)
 * Cached after first call to avoid regeneration
 */
let cachedPresets: Record<string, PresetConfig> | undefined;

export function getCOMMON_PRESETS(): Record<string, PresetConfig> {
  if (!cachedPresets) {
    cachedPresets = generatePresets();
  }
  return cachedPresets;
}

/**
 * Get preset configurations as array
 * @param presets - Array of preset keys (typed for compile-time safety)
 * @throws Error if invalid preset keys are provided
 */
export function getPresetArray(
  presets?: Array<keyof ReturnType<typeof getCOMMON_PRESETS>>
): PresetConfig[] {
  const COMMON_PRESETS = getCOMMON_PRESETS();

  if (!presets) {
    return Object.values(COMMON_PRESETS);
  }

  // Validate all keys are valid at runtime
  const invalidKeys = presets.filter((key) => !(key in COMMON_PRESETS));
  if (invalidKeys.length > 0) {
    const validKeys = Object.keys(COMMON_PRESETS);
    throw new Error(
      `Invalid preset keys: ${invalidKeys.join(", ")}. Valid keys are: ${validKeys.join(", ")}`
    );
  }

  return presets.map((key) => COMMON_PRESETS[key]);
}
