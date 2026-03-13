/**
 * LangExtract Entity Array Merging Utility
 *
 * LangExtract returns arrays of entity objects with different fields in each:
 * [
 *   { birthDate: "1941-09-08", nationality: "American" },
 *   { occupation: "U.S. Senator" },
 *   { education: ["Harvard", "Yale"] }
 * ]
 *
 * This utility merges all objects into a single entity with proper handling:
 * - Arrays: concatenate and deduplicate
 * - Primitives: use first non-empty value
 * - Protected fields: skip system fields (uid, type, name, _metadata)
 */

export interface MergeLangExtractOptions {
  /**
   * Fields to skip during merge (in addition to defaults)
   * Default: ["name", "uid", "type"] and any field starting with "_"
   */
  protectedFields?: string[];

  /**
   * Whether to preserve first value or last value for primitives
   * Default: "first" (prefer first complete value encountered)
   */
  primitiveStrategy?: "first" | "last";

  /**
   * Whether to perform case-insensitive deduplication for string arrays
   * Default: true
   */
  caseInsensitiveArrays?: boolean;
}

const DEFAULT_PROTECTED_FIELDS = ["name", "uid", "type"];

/**
 * Merge array of entity objects from LangExtract response
 *
 * @param entities - Array of entity objects to merge
 * @param options - Merge configuration options
 * @returns Single merged entity object with all fields
 *
 * @example
 * ```typescript
 * const entities = [
 *   { birthDate: "1941-09-08", nationality: "American" },
 *   { occupation: "U.S. Senator" },
 *   { education: ["Harvard", "Yale"] },
 *   { education: ["MIT"] }
 * ];
 *
 * const merged = mergeLangExtractEntities(entities);
 * // {
 * //   birthDate: "1941-09-08",
 * //   nationality: "American",
 * //   occupation: "U.S. Senator",
 * //   education: ["Harvard", "Yale", "MIT"]
 * // }
 * ```
 */
export function mergeLangExtractEntities(
  entities: any[],
  options: MergeLangExtractOptions = {}
): Record<string, any> {
  const {
    protectedFields = DEFAULT_PROTECTED_FIELDS,
    primitiveStrategy = "first",
    caseInsensitiveArrays = true,
  } = options;

  const merged: Record<string, any> = {};
  const protectedSet = new Set(protectedFields);

  entities.forEach((entity) => {
    if (typeof entity !== "object" || entity === null) return;

    Object.entries(entity).forEach(([field, value]) => {
      // Skip protected fields and metadata
      if (field.startsWith("_") || protectedSet.has(field)) return;

      // Skip empty values
      if (value === null || value === undefined || value === "") return;

      // Handle arrays: merge and deduplicate
      if (Array.isArray(value)) {
        if (!merged[field]) {
          merged[field] = [];
        }

        // Merge arrays
        const combinedArray = [...merged[field], ...value];

        // Deduplicate
        if (caseInsensitiveArrays && isStringArray(combinedArray)) {
          // Case-insensitive deduplication for string arrays
          merged[field] = deduplicateStringsIgnoreCase(combinedArray);
        } else {
          // Standard deduplication
          merged[field] = Array.from(new Set(combinedArray));
        }
      }
      // Handle primitives based on strategy
      else if (primitiveStrategy === "first" && !merged[field]) {
        // Only set if not already populated
        merged[field] = value;
      } else if (primitiveStrategy === "last") {
        // Always overwrite with latest value
        merged[field] = value;
      }
    });
  });

  return merged;
}

/**
 * Extract and merge entities from LangExtract response structure
 *
 * Handles the typical LangExtract response format:
 * {
 *   data: {
 *     extracted_data: [...entities],
 *     Person: [...entities],
 *     Organization: [...entities]
 *   }
 * }
 *
 * @param response - Full LangExtract response object
 * @param options - Merge configuration options
 * @returns Merged entity object
 *
 * @example
 * ```typescript
 * const response = {
 *   data: {
 *     extracted_data: [
 *       { birthDate: "1941-09-08" },
 *       { occupation: "Senator" }
 *     ]
 *   }
 * };
 *
 * const entity = extractAndMergeLangExtractResponse(response);
 * // { birthDate: "1941-09-08", occupation: "Senator" }
 * ```
 */
export function extractAndMergeLangExtractResponse(
  response: any,
  options: MergeLangExtractOptions = {}
): Record<string, any> {
  const extractedData = response?.data || {};
  const allEntities: any[] = [];

  // Collect all entity arrays from response
  Object.values(extractedData).forEach((value) => {
    if (Array.isArray(value)) {
      allEntities.push(...value);
    }
  });

  return mergeLangExtractEntities(allEntities, options);
}

/**
 * Track which fields were found vs not found in merged entity
 *
 * @param mergedEntity - Result from mergeLangExtractEntities
 * @param requestedFields - Fields that were requested
 * @returns Object with fieldsAdded and fieldsNotFound arrays
 */
export function trackEnrichmentFields(
  mergedEntity: Record<string, any>,
  requestedFields: string[]
): {
  fieldsAdded: string[];
  fieldsNotFound: string[];
} {
  const fieldsAdded = Object.keys(mergedEntity).filter(
    (field) => !field.startsWith("_")
  );

  const fieldsNotFound = requestedFields.filter(
    (field) => !fieldsAdded.includes(field)
  );

  return { fieldsAdded, fieldsNotFound };
}

// Helper functions

function isStringArray(arr: any[]): boolean {
  return arr.length > 0 && arr.every((item) => typeof item === "string");
}

function deduplicateStringsIgnoreCase(strings: string[]): string[] {
  const seen = new Map<string, string>();

  strings.forEach((str) => {
    const lower = str.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, str); // Keep first occurrence's casing
    }
  });

  return Array.from(seen.values());
}
