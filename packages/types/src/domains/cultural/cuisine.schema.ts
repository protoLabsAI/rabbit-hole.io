/**
 * Cuisine Entity Schema - Cultural Domain
 *
 * Schema for cuisine entities in the cultural domain.
 * Covers regional cooking styles, culinary traditions, and food cultures.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Cuisine Entity Schema ====================

export const CuisineEntitySchema = EntitySchema.extend({
  type: z.literal("Cuisine"),
  properties: z
    .object({
      origin_region: z.string().optional(), // country/region UID
      characteristic_ingredients: z.array(z.string()).optional(), // ingredient UIDs
      cooking_techniques: z.array(z.string()).optional(),
      flavor_profile: z.array(z.string()).optional(), // spicy, mild, sweet, etc.
      signature_dishes: z.array(z.string()).optional(), // recipe UIDs
      dietary_traditions: z.array(z.string()).optional(),
      meal_structure: z.string().optional(), // how meals are structured
      utensils_used: z.array(z.string()).optional(),
      preparation_methods: z.array(z.string()).optional(),
      preservation_techniques: z.array(z.string()).optional(),
      ceremonial_foods: z.array(z.string()).optional(),
      seasonal_specialties: z.array(z.string()).optional(),
      religious_restrictions: z.array(z.string()).optional(),
      historical_influences: z.array(z.string()).optional(),
      modern_adaptations: z.array(z.string()).optional(),
      popular_beverages: z.array(z.string()).optional(),
      street_food_culture: z.boolean().optional(),
      fine_dining_tradition: z.boolean().optional(),
      fusion_influences: z.array(z.string()).optional(),
      unesco_recognition: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CUISINE_UID_PREFIX = "cuisine";

/**
 * Validate Cuisine UID format
 */
export function validateCuisineUID(uid: string): boolean {
  return uid.startsWith(`${CUISINE_UID_PREFIX}:`);
}
