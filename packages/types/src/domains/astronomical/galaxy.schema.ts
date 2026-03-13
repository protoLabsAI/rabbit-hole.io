/**
 * Galaxy Entity Schema - Astronomical Domain
 *
 * Schema for galaxy entities in the astronomical domain.
 * Covers spiral, elliptical, irregular, and dwarf galaxies.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Galaxy Entity Schema ====================

export const GalaxyEntitySchema = EntitySchema.extend({
  type: z.literal("Galaxy"),
  properties: z
    .object({
      galaxyType: z
        .enum([
          "spiral",
          "elliptical",
          "irregular",
          "dwarf_elliptical",
          "dwarf_spiral",
          "lenticular",
          "ring_galaxy",
          "peculiar",
        ])
        .optional(),
      morphology: z.string().optional(), // Hubble classification (Sa, Sb, E0, etc.)
      diameter: z.number().min(0).optional(), // in light years
      mass: z.number().min(0).optional(), // in solar masses
      starCount: z.number().min(0).optional(), // estimated number of stars
      distance: z.number().min(0).optional(), // in light years from Earth
      redshift: z.number().optional(), // cosmological redshift
      recession_velocity: z.number().optional(), // in km/s
      magnitude: z.number().optional(), // apparent magnitude
      absoluteMagnitude: z.number().optional(),
      surfaceBrightness: z.number().optional(),
      centralBlackHole: z.boolean().optional(),
      blackHoleMass: z.number().min(0).optional(), // in solar masses
      hasActiveNucleus: z.boolean().optional(),
      nucleusType: z
        .enum(["quasar", "blazar", "seyfert", "liner", "inactive"])
        .optional(),
      metallicity: z.number().optional(),
      starFormationRate: z.number().min(0).optional(), // solar masses per year
      rightAscension: z.string().optional(),
      declination: z.string().optional(),
      constellation: z.string().optional(),
      localGroup: z.boolean().optional(),
      clusterMember: z.string().optional(), // galaxy cluster membership
      companionGalaxies: z.number().min(0).optional(),
      discoveryDate: z.string().optional(),
      discoverer: z.string().optional(),
      catalogNames: z.array(z.string()).optional(), // NGC, IC, Messier numbers
    })
    .optional(),
});

// ==================== UID Validation ====================

export const GALAXY_UID_PREFIX = "galaxy";

export const validateGalaxyUID = (uid: string): boolean => {
  return uid.startsWith("galaxy:");
};

// ==================== Type Exports ====================

export type GalaxyEntity = z.infer<typeof GalaxyEntitySchema>;
