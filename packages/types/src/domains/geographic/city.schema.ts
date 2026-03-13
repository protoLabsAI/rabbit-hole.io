/**
 * City Entity Schema - Geographic Domain
 *
 * Schema for city entities in the geographic domain.
 * Covers cities, towns, and urban areas.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== City Entity Schema ====================

export const CityEntitySchema = EntitySchema.extend({
  type: z.literal("City"),
  properties: z
    .object({
      founded: z.string().optional(), // founding date
      country: z.string().optional(), // Country UID
      region: z.string().optional(), // State/province
      population: z.number().min(0).optional(), // current population
      area: z.number().min(0).optional(), // area in square kilometers
      elevation: z.number().optional(), // elevation in meters
      timeZone: z.string().optional(), // timezone
      mayor: z.string().optional(), // Current mayor UID
      government: z.string().optional(), // City government type
      economy: z.array(z.string()).optional(), // Major economic sectors
      landmarks: z.array(z.string()).optional(), // Notable landmark UIDs
      sisterCities: z.array(z.string()).optional(), // Sister city UIDs
      cityType: z
        .enum([
          "capital",
          "metropolis",
          "city",
          "town",
          "village",
          "municipality",
        ])
        .optional(),
      climate: z.string().optional(), // climate description
      transportation: z.array(z.string()).optional(), // transport systems
      universities: z.array(z.string()).optional(), // university UIDs
      gdp: z.number().min(0).optional(), // city GDP
      founded_by: z.string().optional(), // founder person/organization UID
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CITY_UID_PREFIX = "city";

export const validateCityUID = (uid: string): boolean => {
  return uid.startsWith("city:");
};

// ==================== Type Exports ====================

export type CityEntity = z.infer<typeof CityEntitySchema>;
