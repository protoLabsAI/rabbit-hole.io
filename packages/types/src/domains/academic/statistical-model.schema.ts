import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const StatisticalModelEntitySchema = EntitySchema.extend({
  type: z.literal("Statistical_Model"),
  properties: z
    .object({
      model_type: z
        .enum(["linear", "nonlinear", "bayesian", "frequentist"])
        .optional(),
    })
    .optional(),
});

export const STATISTICAL_MODEL_UID_PREFIX = "statistical_model";
export function validateStatisticalModelUID(uid: string): boolean {
  return uid.startsWith(`${STATISTICAL_MODEL_UID_PREFIX}:`);
}
