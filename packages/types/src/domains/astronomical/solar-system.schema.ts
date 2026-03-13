/**
 * Solar System Entity Schema - Astronomical Domain
 *
 * Schema for solar system entities in the astronomical domain.
 * Covers planetary systems around stars.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Solar System Entity Schema ====================

export const SolarSystemEntitySchema = EntitySchema.extend({
  type: z.literal("Solar_System"),
  properties: z
    .object({
      systemType: z
        .enum([
          "single_star",
          "binary_star",
          "multiple_star",
          "brown_dwarf",
          "rogue_system",
        ])
        .optional(),
      centralStar: z.string().optional(), // primary star name/UID
      companionStars: z.array(z.string()).optional(), // binary/multiple systems
      planetCount: z.number().min(0).optional(),
      terrestrialPlanets: z.number().min(0).optional(),
      gasGiants: z.number().min(0).optional(),
      dwarfPlanets: z.number().min(0).optional(),
      asteroidBelt: z.boolean().optional(),
      cometCount: z.number().min(0).optional(),
      age: z.number().min(0).optional(), // in years
      metallicity: z.number().optional(), // relative to Sun
      habitableZone: z
        .object({
          innerRadius: z.number().min(0).optional(), // in AU
          outerRadius: z.number().min(0).optional(), // in AU
        })
        .optional(),
      hasHabitablePlanets: z.boolean().optional(),
      habitablePlanetCount: z.number().min(0).optional(),
      systemRadius: z.number().min(0).optional(), // in AU
      totalMass: z.number().min(0).optional(), // in solar masses
      discoveryMethod: z
        .enum([
          "direct_imaging",
          "radial_velocity",
          "transit_photometry",
          "gravitational_microlensing",
          "astrometry",
          "pulsar_timing",
          "disk_kinematics",
        ])
        .optional(),
      discoveryDate: z.string().optional(),
      distance: z.number().min(0).optional(), // in light years
      rightAscension: z.string().optional(),
      declination: z.string().optional(),
      constellation: z.string().optional(),
      catalogNames: z.array(z.string()).optional(), // system designations
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SOLAR_SYSTEM_UID_PREFIX = "solar_system";

export const validateSolarSystemUID = (uid: string): boolean => {
  return uid.startsWith("solar_system:");
};

// ==================== Type Exports ====================

export type SolarSystemEntity = z.infer<typeof SolarSystemEntitySchema>;
