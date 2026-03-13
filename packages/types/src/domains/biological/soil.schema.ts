/**
 * Soil Entity Schema - Biological Domain
 *
 * Schema for soil entities in the biological domain.
 * Covers soil types, compositions, and agricultural soil properties.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Soil Entity Schema ====================

export const SoilEntitySchema = EntitySchema.extend({
  type: z.literal("Soil"),
  properties: z
    .object({
      soil_type: z
        .enum([
          "clay",
          "sand",
          "silt",
          "loam",
          "sandy_loam",
          "clay_loam",
          "silty_loam",
          "peat",
          "chalk",
          "alluvial",
          "volcanic",
        ])
        .optional(),
      ph_level: z.number().min(0).max(14).optional(),
      organic_matter_content: z.number().min(0).max(100).optional(), // percentage
      fertility: z.enum(["poor", "fair", "good", "excellent"]).optional(),
      drainage: z.enum(["poor", "fair", "good", "excellent"]).optional(),
      texture: z.string().optional(),
      structure: z.string().optional(),
      color: z.string().optional(),
      depth: z.number().positive().optional(), // cm
      nitrogen_content: z.number().nonnegative().optional(),
      phosphorus_content: z.number().nonnegative().optional(),
      potassium_content: z.number().nonnegative().optional(),
      suitable_crops: z.array(z.string()).optional(), // crop UIDs
      climate_suitability: z.array(z.string()).optional(),
      erosion_risk: z.enum(["low", "moderate", "high", "severe"]).optional(),
      compaction_risk: z.enum(["low", "moderate", "high"]).optional(),
      water_holding_capacity: z.enum(["low", "moderate", "high"]).optional(),
      microbial_activity: z.enum(["low", "moderate", "high"]).optional(),
      contamination_level: z
        .enum(["clean", "low", "moderate", "high"])
        .optional(),
      management_practices: z.array(z.string()).optional(),
      formation_process: z.string().optional(),
      parent_material: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SOIL_UID_PREFIX = "soil";

/**
 * Validate Soil UID format
 */
export function validateSoilUID(uid: string): boolean {
  return uid.startsWith(`${SOIL_UID_PREFIX}:`);
}
