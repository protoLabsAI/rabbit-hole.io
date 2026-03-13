/**
 * Region Entity Schema - Geographic Domain
 *
 * Schema for region entities in the geographic domain.
 * Covers states, provinces, administrative divisions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Region Entity Schema ====================

export const RegionEntitySchema = EntitySchema.extend({
  type: z.literal("Region"),
  properties: z
    .object({
      regionType: z
        .enum([
          "state",
          "province",
          "territory",
          "autonomous_region",
          "administrative_division",
          "geographic_region",
        ])
        .optional(),
      country: z.string().optional(), // Country UID
      capital: z.string().optional(), // regional capital city UID
      established: z.string().optional(), // establishment date
      population: z.number().min(0).optional(), // current population
      area: z.number().min(0).optional(), // area in square kilometers
      governor: z.string().optional(), // current governor/leader UID
      legislature: z.string().optional(), // legislative body name
      majorCities: z.array(z.string()).optional(), // major city UIDs
      economy: z.array(z.string()).optional(), // major economic sectors
      naturalResources: z.array(z.string()).optional(), // natural resources
      climate: z.string().optional(), // climate description
      geography: z.string().optional(), // geographic features
      borders: z.array(z.string()).optional(), // neighboring region UIDs
      languages: z.array(z.string()).optional(), // regional languages
      autonomy_level: z
        .enum(["full", "limited", "administrative", "none"])
        .optional(),
      gdp: z.number().min(0).optional(), // regional GDP
      timezone: z.string().optional(), // primary timezone
    })
    .optional(),
});

// ==================== UID Validation ====================

export const REGION_UID_PREFIX = "region";

export const validateRegionUID = (uid: string): boolean => {
  return uid.startsWith("region:");
};

// ==================== Type Exports ====================

export type RegionEntity = z.infer<typeof RegionEntitySchema>;
