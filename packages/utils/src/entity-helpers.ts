/**
 * Entity Helper Utilities
 *
 * Common utilities for working with entity IDs and names
 * across the application.
 */

/**
 * Extract readable name from entity ID
 *
 * Converts entity IDs to human-readable names:
 * - "per:hillary_clinton" → "Hillary Clinton"
 * - "org:tesla_inc" → "Tesla Inc"
 * - "plt:twitter" → "Twitter"
 *
 * @param entityId The entity ID with prefix (per:, org:, etc.)
 * @returns Human-readable name with proper capitalization
 *
 * @example
 * ```typescript
 * extractNameFromEntityId("per:joe_biden") // "Joe Biden"
 * extractNameFromEntityId("org:meta") // "Meta"
 * ```
 */
export function extractNameFromEntityId(entityId: string): string {
  // Remove prefix (per:, org:, etc.)
  const namePart = entityId.split(":")[1] || entityId;

  // Convert underscores to spaces and capitalize each word
  return namePart
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generate entity UID from type and name
 *
 * Creates consistent entity UIDs using type prefixes:
 * - person → per:
 * - organization → org:
 * - platform → plt:
 * - movement → mov:
 * - event → evt:
 * - legal_case → leg:
 * - file → file:
 *
 * @param entityType The entity type
 * @param name The entity name
 * @returns Generated UID with type prefix
 *
 * @example
 * ```typescript
 * generateEntityUID("person", "Joe Biden") // "per:joe_biden"
 * generateEntityUID("organization", "Tesla Inc") // "org:tesla_inc"
 * ```
 */
export function generateEntityUID(entityType: string, name: string): string {
  const typePrefix =
    {
      person: "per",
      organization: "org",
      platform: "plt",
      movement: "mov",
      event: "evt",
      media: "org", // media entities are organizations
      legal_case: "leg",
      file: "file",
    }[entityType] || "ent";

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return `${typePrefix}:${slug}`;
}

/**
 * Parse entity UID to extract type and name parts
 *
 * @param entityId The entity UID
 * @returns Object with type prefix and name part
 *
 * @example
 * ```typescript
 * parseEntityUID("per:joe_biden") // { prefix: "per", namePart: "joe_biden" }
 * ```
 */
export function parseEntityUID(entityId: string): {
  prefix: string;
  namePart: string;
} {
  const [prefix, ...namePartsArray] = entityId.split(":");
  const namePart = namePartsArray.join(":"); // Handle edge cases with multiple colons

  return {
    prefix: prefix || "",
    namePart: namePart || entityId,
  };
}

/**
 * Generate event UID with optional date suffix
 *
 * Events often need date-based UIDs for uniqueness:
 * - "Iowa Rally" + "2024-01-15" → "event:iowa_rally_2024_01_15"
 * - "Conference" + no date → "event:conference"
 *
 * @param name The event name
 * @param date Optional date (YYYY-MM-DD format)
 * @returns Generated event UID with event: prefix
 * @throws Error if date is provided but invalid
 *
 * @example
 * ```typescript
 * generateEventUID("Iowa Rally", "2024-01-15") // "event:iowa_rally_2024_01_15"
 * generateEventUID("Conference") // "event:conference"
 * generateEventUID("Event", "2024-02-30") // Throws Error: Invalid date format, expected YYYY-MM-DD
 * ```
 */
export function generateEventUID(name: string, date?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (date) {
    // Validate date before using it
    if (!isValidDate(date)) {
      throw new Error(`Invalid date format, expected YYYY-MM-DD. Got: ${date}`);
    }
    const dateSlug = date.replace(/-/g, "_");
    return `event:${slug}_${dateSlug}`;
  }

  return `event:${slug}`;
}

/**
 * Validate date format and semantic validity (YYYY-MM-DD)
 *
 * Validates both the format (YYYY-MM-DD) and semantic validity (actual calendar date).
 * Rejects invalid dates like 2024-02-30 or 2024-13-45.
 *
 * @param dateStr Date string to validate
 * @returns True if valid YYYY-MM-DD format AND represents a real calendar date
 *
 * @example
 * ```typescript
 * isValidDate("2024-01-15") // true
 * isValidDate("2024-02-29") // true (leap year)
 * isValidDate("2024-02-30") // false (invalid date)
 * isValidDate("2024-1-15") // false (format only)
 * isValidDate("invalid") // false
 * ```
 */
export function isValidDate(dateStr: string): boolean {
  // Check format first
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  // Parse components
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Create Date and validate it matches input components
  // Note: Date constructor uses 0-indexed months, so subtract 1
  const date = new Date(Date.UTC(year, month - 1, day));

  // Check if the date is valid by verifying components match
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

/**
 * Check if date is within range (inclusive)
 *
 * @param date Date to check (YYYY-MM-DD)
 * @param range Date range with from and to
 * @returns True if date is within range
 *
 * @example
 * ```typescript
 * isDateInRange("2024-06-15", { from: "2024-01-01", to: "2024-12-31" }) // true
 * isDateInRange("2023-12-31", { from: "2024-01-01", to: "2024-12-31" }) // false
 * ```
 */
export function isDateInRange(
  date: string,
  range: { from: string; to: string }
): boolean {
  if (!isValidDate(date)) return false;
  if (!isValidDate(range.from)) return false;
  if (!isValidDate(range.to)) return false;
  return date >= range.from && date <= range.to;
}
