/**
 * Theater Entity Schema - Cultural Domain
 *
 * Schema for theater venue entities in the cultural domain.
 * Covers theaters, performance venues, and entertainment facilities.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Theater Entity Schema ====================

export const TheaterEntitySchema = EntitySchema.extend({
  type: z.literal("Theater"),
  properties: z
    .object({
      theater_type: z
        .enum([
          "broadway",
          "off_broadway",
          "regional",
          "community",
          "dinner",
          "opera_house",
          "concert_hall",
          "amphitheater",
          "drive_in",
          "experimental",
        ])
        .optional(),
      seating_capacity: z.number().int().positive().optional(),
      stage_type: z
        .enum([
          "proscenium",
          "thrust",
          "arena",
          "black_box",
          "outdoor",
          "flexible",
        ])
        .optional(),
      acoustics: z.enum(["excellent", "good", "fair", "poor"]).optional(),
      opened_year: z.number().int().positive().optional(),
      architect: z.string().optional(),
      renovation_years: z.array(z.string()).optional(),
      notable_productions: z.array(z.string()).optional(),
      resident_companies: z.array(z.string()).optional(),
      box_office: z.string().optional(), // contact info
      ticket_prices: z.string().optional(), // price range
      accessibility_features: z.array(z.string()).optional(),
      parking_availability: z.boolean().optional(),
      concessions: z.boolean().optional(),
      gift_shop: z.boolean().optional(),
      historic_designation: z.boolean().optional(),
      architecture_style: z.string().optional(),
      chandelier: z.boolean().optional(),
      balcony_seating: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const THEATER_UID_PREFIX = "theater";

/**
 * Validate Theater UID format
 */
export function validateTheaterUID(uid: string): boolean {
  return uid.startsWith(`${THEATER_UID_PREFIX}:`);
}
