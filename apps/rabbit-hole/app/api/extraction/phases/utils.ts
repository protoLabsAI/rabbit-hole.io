/**
 * Extraction Phase Utilities
 *
 * Shared utilities for entity extraction phases.
 * Uses LangExtract for all entity detection - no hardcoded logic.
 */

import { langextractConfig } from "@protolabsai/llm-tools";

/**
 * Auto-detect focus entities from text using LangExtract
 *
 * Calls LangExtract to identify the most important 1-3 entities
 * mentioned in the text, then matches them to discovered entities.
 */
export async function detectFocusEntities(
  inputText: string,
  discoveredEntities: any[],
  domains: string[] = ["social", "academic", "geographic"]
): Promise<string[]> {
  try {
    const serviceUrl = langextractConfig.getServiceUrl();

    // Generate domain-specific discovery example
    const { generateDiscoveryExample } = await import("@protolabsai/types");
    const discoveryExample = generateDiscoveryExample(domains as any);

    // Use LangExtract to identify most important entities by type
    const response = await fetch(`${serviceUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text_or_documents: [inputText],
        prompt_description:
          "Identify the 1-3 most important or frequently mentioned entities in this text. Group them by entity type. Return entity names only.",
        model_id: "gpt-4o-mini",
        include_source_grounding: false,
        use_schema_constraints: false,
        examples: [discoveryExample],
      }),
    });

    if (!response.ok) {
      console.warn("Focus entity detection failed, using first entity");
      return discoveredEntities.length > 0 ? [discoveredEntities[0].uid] : [];
    }

    const result = await response.json();

    console.log("🔍 Focus detection raw response:", {
      hasData: !!result.data,
      hasExtractedData: !!result.extracted_data,
      dataKeys: result.data ? Object.keys(result.data) : [],
    });

    // LangExtract returns { data: { extracted_data: [{...}] } } or { data: {...} }
    const responseData =
      result.data?.extracted_data?.[0] ||
      result.extracted_data?.[0] ||
      result.data;

    console.log("📦 Response data to parse:", responseData);

    // Extract entity names from all entity type arrays
    const allDetectedNames: string[] = [];
    if (responseData && typeof responseData === "object") {
      Object.entries(responseData).forEach(([key, value]) => {
        // Skip metadata fields
        if (key.startsWith("_")) return;

        if (Array.isArray(value)) {
          console.log(`   ${key}: ${value.length} items`, value);
          // Filter and ensure we only add strings
          value.forEach((item) => {
            if (typeof item === "string") {
              allDetectedNames.push(item);
            } else if (item && typeof item === "object" && item.name) {
              // Handle object format like { name: "Entity Name" }
              allDetectedNames.push(item.name);
            }
          });
        }
      });
    }

    console.log("🎯 Detected entity names:", allDetectedNames);

    // Fallback to old format if new format not found
    const primaryEntities =
      allDetectedNames.length > 0
        ? allDetectedNames
        : responseData?.primary_entities || responseData?.entities || [];

    console.log("📋 Primary entities for matching:", primaryEntities);

    // Match detected names to discovered entity UIDs
    const focusUids: string[] = [];
    for (const name of primaryEntities.slice(0, 3)) {
      // Ensure name is a string
      const nameStr = typeof name === "string" ? name : String(name);

      const match = discoveredEntities.find(
        (e) => e.name.toLowerCase() === nameStr.toLowerCase()
      );
      if (match) {
        console.log(`✅ Matched focus entity: ${nameStr} → ${match.uid}`);
        focusUids.push(match.uid);
      } else {
        console.warn(`⚠️ No match found for: ${nameStr}`);
      }
    }

    // Fallback: if no matches, use first discovered entity
    if (focusUids.length === 0 && discoveredEntities.length > 0) {
      focusUids.push(discoveredEntities[0].uid);
    }

    console.log(`Auto-detected ${focusUids.length} focus entities:`, focusUids);
    return focusUids;
  } catch (error) {
    console.error("Focus entity detection error:", error);
    return discoveredEntities.length > 0 ? [discoveredEntities[0].uid] : [];
  }
}

/**
 * Match user-provided entity names to discovered entity UIDs
 */
export function matchFocusEntityNames(
  focusNames: string[],
  discoveredEntities: any[]
): string[] {
  const focusUids: string[] = [];

  for (const name of focusNames) {
    const match = discoveredEntities.find(
      (e) =>
        e.name.toLowerCase() === name.toLowerCase() ||
        e.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(e.name.toLowerCase())
    );

    if (match) {
      focusUids.push(match.uid);
    }
  }

  return focusUids;
}

/**
 * Build focused relationship prompt for a batch
 * Stays well under 1000 character limit
 */
export function buildFocusedRelationshipPrompt(
  focusEntity: any,
  batchEntities: any[],
  validRelationshipTypes: string[]
): string {
  const batchNames = batchEntities.map((e) => e.name).join(", ");

  // Format relationship types for prompt (limit to first 15 for brevity)
  const relationshipTypesDisplay = validRelationshipTypes
    .slice(0, 15)
    .join(", ");

  return `Find relationships between "${focusEntity.name}" and these entities: ${batchNames}. 
Use ONLY these relationship types: ${relationshipTypesDisplay}.
For each relationship provide: source_entity (name), target_entity (name), relationship_type (from list above), start_date (if known), end_date (if known), and confidence (0.0-1.0).`;
}
