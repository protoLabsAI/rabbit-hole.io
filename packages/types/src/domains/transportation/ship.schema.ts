/**
 * Ship Entity Schema - Transportation Domain
 *
 * Schema for ship entities in the transportation domain.
 * Covers maritime vessels and waterborne transportation.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Ship Entity Schema ====================

export const ShipEntitySchema = EntitySchema.extend({
  type: z.literal("Ship"),
  properties: z
    .object({
      ship_type: z
        .enum([
          "container",
          "bulk_carrier",
          "tanker",
          "passenger",
          "cruise",
          "ferry",
          "cargo",
          "fishing",
          "naval",
          "yacht",
        ])
        .optional(),
      built_date: z.string().optional(),
      shipyard: z.string().optional(), // Organization UID
      tonnage: z.number().min(0).optional(), // gross tonnage
      deadweight: z.number().min(0).optional(), // tonnes
      length: z.number().min(0).optional(), // meters
      beam: z.number().min(0).optional(), // meters
      draft: z.number().min(0).optional(), // meters
      speed: z.number().min(0).optional(), // knots
      crew: z.number().min(0).optional(),
      passenger_capacity: z.number().min(0).optional(),
      cargo_capacity: z.number().min(0).optional(), // TEU or tonnes
      engine_type: z
        .enum(["diesel", "steam", "nuclear", "sail", "electric"])
        .optional(),
      engine_power: z.number().min(0).optional(), // kW
      flag_state: z.string().optional(), // Country UID
      owner: z.string().optional(), // Person/Organization UID
      operator: z.string().optional(), // Organization UID
      home_port: z.string().optional(), // Port UID
      imo_number: z.string().optional(),
      call_sign: z.string().optional(),
      classification_society: z.string().optional(),
      insurance: z.string().optional(), // Insurance UID
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SHIP_UID_PREFIX = "ship";

export const validateShipUID = (uid: string): boolean => {
  return uid.startsWith("ship:");
};

// ==================== Type Exports ====================

export type ShipEntity = z.infer<typeof ShipEntitySchema>;
