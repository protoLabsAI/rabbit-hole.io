import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const ProofEntitySchema = EntitySchema.extend({
  type: z.literal("Proof"),
  properties: z
    .object({
      proof_type: z
        .enum(["direct", "indirect", "contradiction", "induction"])
        .optional(),
    })
    .optional(),
});

export const PROOF_UID_PREFIX = "proof";
export function validateProofUID(uid: string): boolean {
  return uid.startsWith(`${PROOF_UID_PREFIX}:`);
}
