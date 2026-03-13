import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const ParticleEntitySchema = EntitySchema.extend({
  type: z.literal("Particle"),
  properties: z
    .object({
      particle_type: z.enum(["elementary", "composite", "virtual"]).optional(),
      charge: z.number().optional(),
      mass: z.number().optional(),
      spin: z.string().optional(),
    })
    .optional(),
});

export const PARTICLE_UID_PREFIX = "particle";
export function validateParticleUID(uid: string): boolean {
  return uid.startsWith(`${PARTICLE_UID_PREFIX}:`);
}
