/**
 * Theorem Entity Schema - Academic Domain
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const TheoremEntitySchema = EntitySchema.extend({
  type: z.literal("Theorem"),
  properties: z
    .object({
      proof_method: z.array(z.string()).optional(),
      field: z.array(z.string()).optional(),
    })
    .optional(),
});

export const THEOREM_UID_PREFIX = "theorem";
export function validateTheoremUID(uid: string): boolean {
  return uid.startsWith(`${THEOREM_UID_PREFIX}:`);
}
