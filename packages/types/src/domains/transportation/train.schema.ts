/**
 * Train Entity Schema - Transportation Domain
 *
 * Schema for train entities in the transportation domain.
 * Covers railway locomotives and train sets.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Train Entity Schema ====================

export const TrainEntitySchema = EntitySchema.extend({
  type: z.literal("Train"),
  properties: z
    .object({
      train_type: z
        .enum([
          "passenger",
          "freight",
          "high_speed",
          "commuter",
          "subway",
          "light_rail",
          "monorail",
          "maglev",
          "steam",
        ])
        .optional(),
      manufacturer: z.string().optional(), // Company UID
      model: z.string().optional(),
      built_date: z.string().optional(),
      cars: z.number().min(1).optional(),
      passenger_capacity: z.number().min(0).optional(),
      cargo_capacity: z.number().min(0).optional(), // tonnes
      power_type: z
        .enum(["electric", "diesel", "steam", "hybrid", "battery", "hydrogen"])
        .optional(),
      power_rating: z.number().min(0).optional(), // kW
      max_speed: z.number().min(0).optional(), // km/h
      operating_speed: z.number().min(0).optional(), // km/h
      length: z.number().min(0).optional(), // meters
      width: z.number().min(0).optional(), // meters
      height: z.number().min(0).optional(), // meters
      weight: z.number().min(0).optional(), // tonnes
      gauge: z.string().optional(), // track gauge
      operator: z.string().optional(), // Organization UID
      owner: z.string().optional(), // Organization UID
      routes_served: z.array(z.string()).optional(), // Route UIDs
      home_depot: z.string().optional(), // Station UID
      service_level: z
        .enum(["local", "express", "limited", "premium"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const TRAIN_UID_PREFIX = "train";

export const validateTrainUID = (uid: string): boolean => {
  return uid.startsWith("train:");
};

// ==================== Type Exports ====================

export type TrainEntity = z.infer<typeof TrainEntitySchema>;
