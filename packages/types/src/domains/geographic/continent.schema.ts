/**
 * Continent Entity Schema - Geographic Domain
 *
 * Schema for continent entities in the geographic domain.
 * Covers the major continental landmasses and regions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Continent Entity Schema ====================

export const ContinentEntitySchema = EntitySchema.extend({
  type: z.literal("Continent"),
  properties: z
    .object({
      area: z.number().min(0).optional(), // area in square kilometers
      population: z.number().min(0).optional(), // total population
      countries: z.array(z.string()).optional(), // country UIDs
      highestPoint: z.string().optional(), // highest elevation point
      lowestPoint: z.string().optional(), // lowest elevation point
      majorRivers: z.array(z.string()).optional(), // major river names
      majorMountainRanges: z.array(z.string()).optional(), // mountain ranges
      climateZones: z.array(z.string()).optional(), // climate zones present
      languages: z.array(z.string()).optional(), // major languages
      timeZones: z.array(z.string()).optional(), // time zones covered
      geology: z.string().optional(), // geological characteristics
      biodiversity: z.string().optional(), // biodiversity description
      economicRegions: z.array(z.string()).optional(), // economic region UIDs
      culturalRegions: z.array(z.string()).optional(), // cultural regions
      majorCities: z.array(z.string()).optional(), // major city UIDs
      plateauRegions: z.array(z.string()).optional(), // plateau regions
      coastlineLength: z.number().min(0).optional(), // total coastline in km
      islandGroups: z.array(z.string()).optional(), // major island groups
      deserts: z.array(z.string()).optional(), // major deserts
      forests: z.array(z.string()).optional(), // major forest regions
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CONTINENT_UID_PREFIX = "continent";

export const validateContinentUID = (uid: string): boolean => {
  return uid.startsWith("continent:");
};

// ==================== Type Exports ====================

export type ContinentEntity = z.infer<typeof ContinentEntitySchema>;
