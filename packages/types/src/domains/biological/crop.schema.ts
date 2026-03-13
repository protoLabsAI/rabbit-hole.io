/**
 * Crop Entity Schema - Biological Domain
 *
 * Schema for crop entities in the biological domain.
 * Covers agricultural crops, cultivated plants, and harvest products.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Crop Entity Schema ====================

export const CropEntitySchema = EntitySchema.extend({
  type: z.literal("Crop"),
  properties: z
    .object({
      crop_type: z
        .enum([
          "cereal",
          "legume",
          "root",
          "fruit",
          "vegetable",
          "oilseed",
          "fiber",
          "forage",
          "tree_crop",
          "vine_crop",
          "herb",
          "spice",
          "cash_crop",
          "cover_crop",
        ])
        .optional(),
      growing_season: z
        .array(z.enum(["spring", "summer", "fall", "winter"]))
        .optional(),
      maturity_period: z.number().int().positive().optional(), // days to maturity
      yield_per_hectare: z.number().positive().optional(), // kg per hectare
      market_price: z.number().positive().optional(), // price per unit
      water_requirements: z
        .enum(["low", "medium", "high", "very_high"])
        .optional(),
      soil_requirements: z.string().optional(),
      temperature_range: z.string().optional(), // optimal growing temperature
      pest_resistance: z.array(z.string()).optional(),
      disease_resistance: z.array(z.string()).optional(),
      nutritional_value: z.string().optional(),
      harvest_method: z.enum(["manual", "mechanical", "mixed"]).optional(),
      storage_requirements: z.string().optional(),
      processing_methods: z.array(z.string()).optional(),
      end_uses: z.array(z.string()).optional(), // food, feed, fuel, etc.
      companion_plants: z.array(z.string()).optional(), // crop UIDs
      rotation_compatibility: z.array(z.string()).optional(),
      genetic_varieties: z.array(z.string()).optional(),
      organic_suitable: z.boolean().optional(),
      drought_tolerance: z
        .enum(["poor", "fair", "good", "excellent"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CROP_UID_PREFIX = "crop";

/**
 * Validate Crop UID format
 */
export function validateCropUID(uid: string): boolean {
  return uid.startsWith(`${CROP_UID_PREFIX}:`);
}
