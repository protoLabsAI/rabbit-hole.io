import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const AlgorithmEntitySchema = EntitySchema.extend({
  type: z.literal("Algorithm"),
  properties: z
    .object({
      complexity: z.string().optional(),
      algorithm_type: z
        .enum(["sorting", "search", "optimization", "machine_learning"])
        .optional(),
    })
    .optional(),
});

export const ALGORITHM_UID_PREFIX = "algorithm";
export function validateAlgorithmUID(uid: string): boolean {
  return uid.startsWith(`${ALGORITHM_UID_PREFIX}:`);
}
