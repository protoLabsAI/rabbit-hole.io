/**
 * Atlas Settings Panel - Validation Schemas
 *
 * Zod schemas for form validation of all settings panel controls.
 * Source of truth: @proto/types/atlas (these are kept for react-hook-form compatibility)
 */

import { z } from "zod/v3";

// Ego Network Settings Schema
export const egoSettingsSchema = z.object({
  hops: z
    .number()
    .min(1, "Minimum 1 hop required")
    .max(10, "Maximum 10 hops allowed")
    .refine((val) => val <= 3, {
      message: "More than 3 hops may impact performance",
      path: ["performance_warning"],
    }),
  nodeLimit: z
    .number()
    .min(25, "Minimum 25 nodes required")
    .max(150, "Maximum 150 nodes allowed")
    .refine((val) => val <= 100, {
      message: "More than 100 nodes may impact performance",
      path: ["performance_warning"],
    }),
  centerEntity: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length > 0,
      "Center entity cannot be empty if provided"
    ),
  sentiments: z.array(z.string()).nullable().optional(),
});

// Time Window Schema - enhanced validation
export const timeWindowSchema = z
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

// Community Settings Schema
export const communitySettingsSchema = z.object({
  communityId: z
    .number()
    .min(0, "Community ID must be non-negative")
    .max(100, "Community ID must be less than 100")
    .nullable()
    .refine((val) => val === null || Number.isInteger(val), {
      message: "Community ID must be a whole number",
    }),
});

// Layout Settings Schema
export const layoutSettingsSchema = z.object({
  layoutType: z.enum(["breadthfirst", "force", "atlas"]),
});

// View Options Schema
export const viewOptionsSchema = z.object({
  showLabels: z.boolean(),
  highlightConnections: z.boolean(),
  showTimeline: z.boolean(),
});

// Master Settings Schema
export const atlasSettingsSchema = z.object({
  viewMode: z.enum(["full-atlas", "ego", "community", "timeslice"]),
  egoSettings: egoSettingsSchema,
  timeWindow: timeWindowSchema,
  communitySettings: communitySettingsSchema,
  layoutSettings: layoutSettingsSchema,
  viewOptions: viewOptionsSchema,
});

// Type exports
export type EgoSettings = z.infer<typeof egoSettingsSchema>;
export type TimeWindow = z.infer<typeof timeWindowSchema>;
export type CommunitySettings = z.infer<typeof communitySettingsSchema>;
export type LayoutSettings = z.infer<typeof layoutSettingsSchema>;
export type ViewOptions = z.infer<typeof viewOptionsSchema>;
export type AtlasSettings = z.infer<typeof atlasSettingsSchema>;
