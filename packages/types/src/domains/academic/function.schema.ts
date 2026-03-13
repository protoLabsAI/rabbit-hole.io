import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

export const FunctionEntitySchema = EntitySchema.extend({
  type: z.literal("Function"),
  properties: z
    .object({
      function_type: z
        .enum(["linear", "quadratic", "exponential", "trigonometric"])
        .optional(),
      domain: z.string().optional(),
      range: z.string().optional(),
    })
    .optional(),
});

export const FUNCTION_UID_PREFIX = "function";
export function validateFunctionUID(uid: string): boolean {
  return uid.startsWith(`${FUNCTION_UID_PREFIX}:`);
}
