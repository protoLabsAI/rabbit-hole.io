/**
 * Research Settings Schema
 *
 * Zod schemas for research page URL state and UI controls.
 * Single source of truth for validation across nuqs, forms, and AI agent.
 */

import { z } from "zod";

/**
 * Research Settings Schema
 * Controls ego network loading and filtering
 */
export const ResearchSettingsSchema = z.object({
  hops: z
    .number()
    .int()
    .min(0, "Hops must be at least 0")
    .max(3, "Maximum 3 hops allowed")
    .default(0)
    .describe(
      "Ego network depth to display (0-3, loads hops+1 for AI context)"
    ),

  nodeLimit: z
    .number()
    .int()
    .min(10, "Minimum 10 nodes")
    .max(100, "Maximum 100 nodes")
    .default(50)
    .describe("Maximum number of nodes to load"),

  sentiments: z
    .array(z.string())
    .nullable()
    .default(null)
    .describe(
      "Filter relationships by sentiment (null = all, use hostile/supportive/neutral/ambiguous)"
    ),

  entityTypes: z
    .array(z.string())
    .nullable()
    .default(null)
    .describe("Filter entities by type (null = all)"),
});

export type ResearchSettings = z.infer<typeof ResearchSettingsSchema>;

/**
 * Time Window Schema
 * Date range filtering for entities/relationships
 */
export const TimeWindowSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .describe("Start date (YYYY-MM-DD)"),

  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .describe("End date (YYYY-MM-DD)"),
});

export type TimeWindow = z.infer<typeof TimeWindowSchema>;

/**
 * UI Preferences Schema
 * Visualization display settings
 */
export const UIPreferencesSchema = z.object({
  showLabels: z.boolean().default(true).describe("Show node labels"),
  showEdgeLabels: z.boolean().default(true).describe("Show edge labels"),
});

export type UIPreferences = z.infer<typeof UIPreferencesSchema>;

/**
 * Complete Research Page State Schema
 * All URL parameters and UI state
 */
export const ResearchPageStateSchema = z.object({
  entity: z
    .string()
    .regex(
      /^[a-z_]+:[a-zA-Z0-9_\-]+$/,
      "Entity UID must be in format domain:identifier"
    )
    .nullable()
    .describe("Entity UID to load"),

  settings: ResearchSettingsSchema,
  timeWindow: TimeWindowSchema.nullable().default(null),
  ui: UIPreferencesSchema,
});

export type ResearchPageState = z.infer<typeof ResearchPageStateSchema>;

/**
 * Partial update schema for form changes
 */
export const ResearchSettingsUpdateSchema = ResearchSettingsSchema.partial();
export type ResearchSettingsUpdate = z.infer<
  typeof ResearchSettingsUpdateSchema
>;

/**
 * Validation helper
 */
export function validateResearchSettings(
  data: unknown
):
  | { success: true; data: ResearchSettings }
  | { success: false; error: string } {
  const result = ResearchSettingsSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; "),
  };
}

/**
 * Safe validation with defaults for partial data
 */
export function validateResearchSettingsPartial(
  data: unknown
): ResearchSettings {
  // Try to parse with full schema
  const result = ResearchSettingsSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Fall back to defaults and merge with provided data
  const partial = ResearchSettingsUpdateSchema.safeParse(data);
  const defaults = ResearchSettingsSchema.parse({});

  if (partial.success) {
    return { ...defaults, ...partial.data };
  }

  return defaults;
}

/**
 * Sentiment options for UI dropdowns
 */
export const SENTIMENT_OPTIONS = [
  { value: "hostile", label: "Hostile", color: "red" },
  { value: "supportive", label: "Supportive", color: "green" },
  { value: "neutral", label: "Neutral", color: "gray" },
  { value: "ambiguous", label: "Ambiguous", color: "orange" },
] as const;

/**
 * Hops options for UI sliders/dropdowns
 */
export const HOPS_OPTIONS = [
  { value: 0, label: "Center only", description: "Just the selected entity" },
  {
    value: 1,
    label: "1 hop",
    description: "Direct connections (friends)",
  },
  {
    value: 2,
    label: "2 hops",
    description: "Friends of friends",
  },
  {
    value: 3,
    label: "3 hops",
    description: "Extended network (may be large)",
  },
] as const;

/**
 * Entity type options organized by domain for UI filtering
 */
export const ENTITY_TYPE_OPTIONS = [
  {
    domain: "social",
    label: "Social",
    description: "People, organizations, platforms, events",
    types: [
      { value: "Person", label: "Person" },
      { value: "Organization", label: "Organization" },
      { value: "Platform", label: "Platform" },
      { value: "Movement", label: "Movement" },
      { value: "Event", label: "Event" },
      { value: "Media", label: "Media" },
      { value: "Athlete", label: "Athlete" },
      { value: "Character", label: "Character" },
      { value: "Location", label: "Location" },
    ],
  },
  {
    domain: "medical",
    label: "Medical",
    description: "Health, diseases, treatments, facilities",
    types: [
      { value: "Disease", label: "Disease" },
      { value: "Drug", label: "Drug" },
      { value: "Treatment", label: "Treatment" },
      { value: "Symptom", label: "Symptom" },
      { value: "Condition", label: "Condition" },
      { value: "Medical_Device", label: "Medical Device" },
      { value: "Hospital", label: "Hospital" },
      { value: "Clinic", label: "Clinic" },
      { value: "Pharmacy", label: "Pharmacy" },
      { value: "Insurance", label: "Insurance" },
      { value: "Clinical_Trial", label: "Clinical Trial" },
    ],
  },
  {
    domain: "academic",
    label: "Academic",
    description: "Education, research, publications, concepts",
    types: [
      { value: "University", label: "University" },
      { value: "Research", label: "Research" },
      { value: "Publication", label: "Publication" },
      { value: "Journal", label: "Journal" },
      { value: "Course", label: "Course" },
      { value: "Degree", label: "Degree" },
      { value: "Mathematical_Concept", label: "Mathematical Concept" },
      { value: "Algorithm", label: "Algorithm" },
      { value: "Element", label: "Chemical Element" },
      { value: "Compound", label: "Chemical Compound" },
    ],
  },
  {
    domain: "cultural",
    label: "Cultural",
    description: "Arts, entertainment, traditions, language",
    types: [
      { value: "Book", label: "Book" },
      { value: "Film", label: "Film" },
      { value: "Song", label: "Song" },
      { value: "Art", label: "Art" },
      { value: "Language", label: "Language" },
      { value: "Religion", label: "Religion" },
      { value: "Tradition", label: "Tradition" },
      { value: "Food", label: "Food" },
      { value: "Game", label: "Game" },
      { value: "Sport", label: "Sport" },
      { value: "TV_Show", label: "TV Show" },
      { value: "Podcast", label: "Podcast" },
    ],
  },
  {
    domain: "economic",
    label: "Economic",
    description: "Business, finance, markets, investments",
    types: [
      { value: "Company", label: "Company" },
      { value: "Market", label: "Market" },
      { value: "Currency", label: "Currency" },
      { value: "Industry", label: "Industry" },
      { value: "Investment", label: "Investment" },
      { value: "Commodity", label: "Commodity" },
      { value: "Stock", label: "Stock" },
      { value: "Bond", label: "Bond" },
    ],
  },
  {
    domain: "geographic",
    label: "Geographic",
    description: "Countries, cities, regions, natural features",
    types: [
      { value: "Country", label: "Country" },
      { value: "City", label: "City" },
      { value: "Region", label: "Region" },
      { value: "Continent", label: "Continent" },
      { value: "Landmark", label: "Landmark" },
    ],
  },
  {
    domain: "technology",
    label: "Technology",
    description: "Software, hardware, systems, networks",
    types: [
      { value: "Software", label: "Software" },
      { value: "Hardware", label: "Hardware" },
      { value: "API", label: "API" },
      { value: "Database", label: "Database" },
      { value: "Network", label: "Network" },
      { value: "Protocol", label: "Protocol" },
    ],
  },
  {
    domain: "legal",
    label: "Legal",
    description: "Laws, courts, cases, contracts",
    types: [
      { value: "Law", label: "Law" },
      { value: "Court", label: "Court" },
      { value: "Case", label: "Legal Case" },
      { value: "Contract", label: "Contract" },
    ],
  },
] as const;
