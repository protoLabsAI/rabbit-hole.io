/**
 * Farm Entity Schema - Biological Domain
 *
 * Schema for farm entities in the biological domain.
 * Covers agricultural operations, farming facilities, and cultivation sites.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Farm Entity Schema ====================

export const FarmEntitySchema = EntitySchema.extend({
  type: z.literal("Farm"),
  properties: z
    .object({
      farm_type: z
        .enum([
          "crop",
          "livestock",
          "dairy",
          "poultry",
          "mixed",
          "organic",
          "hydroponic",
          "greenhouse",
          "orchard",
          "vineyard",
          "ranch",
          "aquaculture",
        ])
        .optional(),
      area: z.number().positive().optional(), // hectares or acres
      crops_grown: z.array(z.string()).optional(), // crop UIDs
      livestock_types: z.array(z.string()).optional(), // animal UIDs
      farming_method: z
        .enum([
          "conventional",
          "organic",
          "sustainable",
          "permaculture",
          "biodynamic",
          "no_till",
          "crop_rotation",
          "monoculture",
        ])
        .optional(),
      irrigation_system: z.string().optional(),
      soil_type: z.string().optional(), // soil UID
      climate_zone: z.string().optional(),
      annual_yield: z.number().nonnegative().optional(),
      established_year: z.number().int().positive().optional(),
      certifications: z.array(z.string()).optional(), // organic, fair trade, etc.
      equipment_used: z.array(z.string()).optional(),
      water_source: z.string().optional(),
      pest_management: z.string().optional(),
      fertilizer_type: z.string().optional(),
      harvest_seasons: z
        .array(z.enum(["spring", "summer", "fall", "winter"]))
        .optional(),
      market_channels: z.array(z.string()).optional(), // local, wholesale, etc.
      sustainability_practices: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const FARM_UID_PREFIX = "farm";

/**
 * Validate Farm UID format
 */
export function validateFarmUID(uid: string): boolean {
  return uid.startsWith(`${FARM_UID_PREFIX}:`);
}
