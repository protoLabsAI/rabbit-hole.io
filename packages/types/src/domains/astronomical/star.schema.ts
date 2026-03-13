/**
 * Star Entity Schema - Astronomical Domain
 *
 * Schema for star entities in the astronomical domain.
 * Covers main sequence stars, giants, supergiants, white dwarfs, neutron stars, etc.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Star Entity Schema ====================

export const StarEntitySchema = EntitySchema.extend({
  type: z.literal("Star"),
  properties: z
    .object({
      starType: z
        .enum([
          "main_sequence",
          "white_dwarf",
          "red_giant",
          "blue_giant",
          "supergiant",
          "neutron_star",
          "pulsar",
          "brown_dwarf",
          "variable_star",
          "binary_star",
        ])
        .optional(),
      spectralClass: z
        .enum(["O", "B", "A", "F", "G", "K", "M", "L", "T", "Y"])
        .optional(),
      mass: z.number().min(0).optional(), // in solar masses
      radius: z.number().min(0).optional(), // in solar radii
      luminosity: z.number().min(0).optional(), // in solar luminosities
      surfaceTemperature: z.number().min(0).optional(), // in Kelvin
      age: z.number().min(0).optional(), // in years
      metallicity: z.number().optional(), // relative to Sun
      magnitude: z.number().optional(), // apparent magnitude
      absoluteMagnitude: z.number().optional(),
      distance: z.number().min(0).optional(), // in light years
      rightAscension: z.string().optional(), // celestial coordinates
      declination: z.string().optional(), // celestial coordinates
      constellation: z.string().optional(),
      hasplanets: z.boolean().optional(),
      planetCount: z.number().min(0).optional(),
      variabilityType: z.string().optional(), // for variable stars
      binarySystem: z.boolean().optional(),
      companionStars: z.number().min(0).optional(),
      stellarWind: z.boolean().optional(),
      coronalActivity: z.string().optional(),
      rotationPeriod: z.number().min(0).optional(), // in days
      catalogNames: z.array(z.string()).optional(), // HD, HR, HIP numbers
    })
    .optional(),
});

// ==================== UID Validation ====================

export const STAR_UID_PREFIX = "star";

export const validateStarUID = (uid: string): boolean => {
  return uid.startsWith("star:");
};

// ==================== Type Exports ====================

export type StarEntity = z.infer<typeof StarEntitySchema>;
