/**
 * Formula Entity Schema - Academic Domain
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const FormulaEntitySchema = EntitySchema.extend({
  type: z.literal("Formula"),
  properties: z
    .object({
      formula_type: z
        .enum(["algebraic", "geometric", "calculus", "statistical", "physical"])
        .optional(),
      variables: z.array(z.string()).optional(),
      constants: z.array(z.string()).optional(),
      domain: z.string().optional(),
      range: z.string().optional(),
    })
    .optional(),
});

export const FORMULA_UID_PREFIX = "formula";
export function validateFormulaUID(uid: string): boolean {
  return uid.startsWith(`${FORMULA_UID_PREFIX}:`);
}
