/**
 * Planet Entity Schema - Astronomical Domain
 *
 * Schema for planet entities in the astronomical domain.
 * Covers planets, dwarf planets, and planetary bodies.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Planet Entity Schema ====================

export const PlanetEntitySchema = EntitySchema.extend({
  type: z.literal("Planet"),
  properties: z
    .object({
      planetType: z
        .enum([
          "terrestrial",
          "gas_giant",
          "ice_giant",
          "dwarf_planet",
          "exoplanet",
          "rogue_planet",
        ])
        .optional(),
      mass: z.number().min(0).optional(), // in Earth masses
      diameter: z.number().min(0).optional(), // in kilometers
      orbitalPeriod: z.number().min(0).optional(), // in Earth days
      rotationPeriod: z.number().min(0).optional(), // in Earth days
      distanceFromStar: z.number().min(0).optional(), // in AU
      surfaceTemperature: z.number().optional(), // in Kelvin
      atmosphere: z.array(z.string()).optional(), // atmospheric composition
      hasRings: z.boolean().optional(),
      moonCount: z.number().min(0).optional(),
      surfaceGravity: z.number().min(0).optional(), // relative to Earth
      magneticField: z.boolean().optional(),
      habitabilityIndex: z.number().min(0).max(1).optional(),
      discoveryDate: z.string().optional(),
      discoverer: z.string().optional(),
      orbitalEccentricity: z.number().min(0).max(1).optional(),
      axialTilt: z.number().optional(), // in degrees
      albedo: z.number().min(0).max(1).optional(), // reflectivity
      composition: z.array(z.string()).optional(), // primary materials
      hasWater: z.boolean().optional(),
      stellarSystem: z.string().optional(), // parent star system
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PLANET_UID_PREFIX = "planet";

export const validatePlanetUID = (uid: string): boolean => {
  return uid.startsWith("planet:");
};

// ==================== Type Exports ====================

export type PlanetEntity = z.infer<typeof PlanetEntitySchema>;
