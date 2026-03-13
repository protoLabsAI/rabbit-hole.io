/**
 * Food Entity Schema - Cultural Domain
 *
 * Schema for food entities in the cultural domain.
 * Covers food items, ingredients, and food products.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Food Entity Schema ====================

export const FoodEntitySchema = EntitySchema.extend({
  type: z.literal("Food"),
  properties: z
    .object({
      food_category: z
        .enum([
          "fruit",
          "vegetable",
          "grain",
          "protein",
          "dairy",
          "spice",
          "herb",
          "nut",
          "seed",
          "oil",
          "beverage",
          "processed",
          "fermented",
          "baked",
          "preserved",
        ])
        .optional(),
      calories_per_100g: z.number().nonnegative().optional(),
      carbohydrate_content: z.number().nonnegative().optional(), // grams per 100g
      protein_content: z.number().nonnegative().optional(),
      fat_content: z.number().nonnegative().optional(),
      fiber_content: z.number().nonnegative().optional(),
      sugar_content: z.number().nonnegative().optional(),
      sodium_content: z.number().nonnegative().optional(),
      shelf_life: z.string().optional(), // storage duration
      seasonality: z
        .array(z.enum(["spring", "summer", "fall", "winter"]))
        .optional(),
      origin_region: z.string().optional(), // where it originates from
      storage_requirements: z.string().optional(),
      allergens: z.array(z.string()).optional(),
      cooking_methods: z.array(z.string()).optional(),
      flavor_profile: z.array(z.string()).optional(), // sweet, salty, sour, etc.
      nutritional_benefits: z.array(z.string()).optional(),
      culinary_uses: z.array(z.string()).optional(),
      processing_method: z.string().optional(),
      organic_available: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const FOOD_UID_PREFIX = "food";

/**
 * Validate Food UID format
 */
export function validateFoodUID(uid: string): boolean {
  return uid.startsWith(`${FOOD_UID_PREFIX}:`);
}
