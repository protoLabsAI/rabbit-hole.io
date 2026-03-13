/**
 * Recipe Entity Schema - Cultural Domain
 *
 * Schema for recipe entities in the cultural domain.
 * Covers cooking recipes, preparation instructions, and culinary methods.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Recipe Entity Schema ====================

export const RecipeEntitySchema = EntitySchema.extend({
  type: z.literal("Recipe"),
  properties: z
    .object({
      cuisine: z.string().optional(), // UID of cuisine entity
      difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional(),
      prep_time: z.number().int().nonnegative().optional(), // minutes
      cook_time: z.number().int().nonnegative().optional(), // minutes
      total_time: z.number().int().nonnegative().optional(), // minutes
      servings: z.number().int().positive().optional(),
      course: z
        .enum([
          "appetizer",
          "main_course",
          "side_dish",
          "dessert",
          "beverage",
          "soup",
          "salad",
          "breakfast",
          "lunch",
          "dinner",
          "snack",
        ])
        .optional(),
      cooking_method: z.array(z.string()).optional(), // baking, frying, etc.
      dietary_restrictions: z.array(z.string()).optional(), // vegetarian, gluten-free, etc.
      ingredients: z.array(z.string()).optional(), // ingredient UIDs or names
      equipment_needed: z.array(z.string()).optional(),
      skill_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      temperature: z.string().optional(), // cooking temperature
      allergens: z.array(z.string()).optional(),
      nutritional_info: z.string().optional(),
      chef: z.string().optional(), // chef/author UID
      origin_story: z.string().optional(),
      variations: z.array(z.string()).optional(),
      wine_pairing: z.array(z.string()).optional(),
      cost_estimate: z.string().optional(),
      popularity_rating: z.number().min(0).max(5).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const RECIPE_UID_PREFIX = "recipe";

/**
 * Validate Recipe UID format
 */
export function validateRecipeUID(uid: string): boolean {
  return uid.startsWith(`${RECIPE_UID_PREFIX}:`);
}
