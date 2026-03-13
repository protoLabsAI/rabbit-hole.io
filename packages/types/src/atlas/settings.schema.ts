/**
 * Atlas Settings Schema
 *
 * Zod schemas for Atlas page URL state and UI controls.
 * Single source of truth for validation across nuqs, forms, and UI components.
 */

import { z } from "zod";

/**
 * View Mode Enum
 */
export const ViewModeSchema = z.enum([
  "full-atlas",
  "ego",
  "community",
  "timeslice",
]);
export type ViewMode = z.infer<typeof ViewModeSchema>;

/**
 * Ego Network Settings Schema
 */
export const EgoSettingsSchema = z.object({
  hops: z
    .number()
    .int()
    .min(1, "Minimum 1 hop required")
    .max(10, "Maximum 10 hops allowed"),

  nodeLimit: z
    .number()
    .int()
    .min(25, "Minimum 25 nodes required")
    .max(150, "Maximum 150 nodes allowed"),

  centerEntity: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length > 0,
      "Center entity cannot be empty if provided"
    ),

  sentiments: z.array(z.string()).nullable().optional(),
});

export type EgoSettings = z.infer<typeof EgoSettingsSchema>;

/**
 * Time Window Schema with enhanced validation
 */
export const TimeWindowSchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine((val) => {
        const date = new Date(val);
        return date instanceof Date && !isNaN(date.getTime());
      }, "Invalid date"),

    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine((val) => {
        const date = new Date(val);
        return date instanceof Date && !isNaN(date.getTime());
      }, "Invalid date"),
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return from < to;
    },
    {
      message: "Start date must be before end date",
      path: ["to"],
    }
  )
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      const daysDiff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 365;
    },
    {
      message: "Date range cannot exceed 365 days",
      path: ["range_warning"],
    }
  );

export type TimeWindow = z.infer<typeof TimeWindowSchema>;

/**
 * Community Settings Schema
 */
export const CommunitySettingsSchema = z.object({
  communityId: z
    .number()
    .int()
    .min(0, "Community ID must be non-negative")
    .max(100, "Community ID must be less than 100")
    .nullable()
    .refine((val) => val === null || Number.isInteger(val), {
      message: "Community ID must be a whole number",
    }),
});

export type CommunitySettings = z.infer<typeof CommunitySettingsSchema>;

/**
 * Layout Settings Schema
 */
export const LayoutSettingsSchema = z.object({
  layoutType: z.enum(["breadthfirst", "force", "atlas"]),
});

export type LayoutSettings = z.infer<typeof LayoutSettingsSchema>;

/**
 * View Options Schema
 */
export const ViewOptionsSchema = z.object({
  showLabels: z.boolean().default(true),
  highlightConnections: z.boolean().default(true),
  showTimeline: z.boolean().default(false),
});

export type ViewOptions = z.infer<typeof ViewOptionsSchema>;

/**
 * Master Atlas Settings Schema
 */
export const AtlasSettingsSchema = z.object({
  viewMode: ViewModeSchema,
  egoSettings: EgoSettingsSchema,
  timeWindow: TimeWindowSchema,
  communitySettings: CommunitySettingsSchema,
  layoutSettings: LayoutSettingsSchema,
  viewOptions: ViewOptionsSchema,
});

export type AtlasSettings = z.infer<typeof AtlasSettingsSchema>;

/**
 * Pan Position Schema (for viewport management)
 */
export const PanPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type PanPosition = z.infer<typeof PanPositionSchema>;

/**
 * Complete Atlas Page State Schema
 */
export const AtlasPageStateSchema = z.object({
  viewMode: ViewModeSchema.default("full-atlas"),
  centerEntity: z.string().nullable().default(null),
  communityId: z.number().int().nullable().default(null),
  zoom: z.number().default(1),
  pan: PanPositionSchema.default({ x: 0, y: 0 }),
  timeWindow: TimeWindowSchema.default({
    from: "2024-01-01",
    to: new Date().toISOString().split("T")[0],
  }),
  egoSettings: EgoSettingsSchema.default({
    hops: 1,
    nodeLimit: 50,
    sentiments: null,
  }),
  chatMode: z.boolean().default(false),
});

export type AtlasPageState = z.infer<typeof AtlasPageStateSchema>;

/**
 * Validation helpers
 */
export function validateEgoSettings(
  data: unknown
): { success: true; data: EgoSettings } | { success: false; error: string } {
  const result = EgoSettingsSchema.safeParse(data);

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

export function validateTimeWindow(
  data: unknown
): { success: true; data: TimeWindow } | { success: false; error: string } {
  const result = TimeWindowSchema.safeParse(data);

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

export function validateAtlasSettings(
  data: unknown
): { success: true; data: AtlasSettings } | { success: false; error: string } {
  const result = AtlasSettingsSchema.safeParse(data);

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
 * UI Constants for dropdowns and controls
 */
export const VIEW_MODE_OPTIONS = [
  {
    value: "full-atlas" as const,
    label: "🌐 Full Atlas",
    description: "Complete entity network (traditional)",
  },
  {
    value: "ego" as const,
    label: "🎯 Ego Network",
    description: "Focused entity + neighbors (50-150 nodes)",
  },
  {
    value: "community" as const,
    label: "🏘️ Community View",
    description: "Community cluster from detection (100-500 nodes)",
  },
  {
    value: "timeslice" as const,
    label: "⏰ Time Slice",
    description: "Activity within time window (200-1000 nodes)",
  },
] as const;

export const LAYOUT_OPTIONS = [
  {
    value: "atlas" as const,
    label: "🎯 Atlas Clusters",
    description: "Groups entities by type with clustering",
  },
  {
    value: "breadthfirst" as const,
    label: "🌳 Breadth-First",
    description: "Tree-like hierarchy spreading outward",
  },
  {
    value: "force" as const,
    label: "⚡ Force-Directed",
    description: "Physics simulation with edge optimization",
  },
] as const;

export const HOP_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1} Hop${i + 1 > 1 ? "s" : ""}`,
}));

export const NODE_LIMIT_OPTIONS = [
  { value: 25, label: "25 Nodes" },
  { value: 50, label: "50 Nodes" },
  { value: 75, label: "75 Nodes" },
  { value: 100, label: "100 Nodes" },
  { value: 150, label: "150 Nodes" },
] as const;
