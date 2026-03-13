/**
 * Vehicle Entity Schema - Transportation Domain
 *
 * Schema for vehicle entities in the transportation domain.
 * Covers land-based transportation vehicles.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Vehicle Entity Schema ====================

export const VehicleEntitySchema = EntitySchema.extend({
  type: z.literal("Vehicle"),
  properties: z
    .object({
      vehicle_type: z
        .enum([
          "car",
          "truck",
          "bus",
          "motorcycle",
          "bicycle",
          "emergency",
          "construction",
          "agricultural",
          "military",
          "recreational",
        ])
        .optional(),
      manufacturer: z.string().optional(), // Company UID
      model: z.string().optional(),
      year: z.number().min(1800).optional(),
      fuel_type: z
        .enum([
          "gasoline",
          "diesel",
          "electric",
          "hybrid",
          "hydrogen",
          "cng",
          "lpg",
          "human_powered",
        ])
        .optional(),
      engine_size: z.number().min(0).optional(), // liters or kW
      horsepower: z.number().min(0).optional(),
      fuel_efficiency: z.number().min(0).optional(), // mpg or km/l
      seating_capacity: z.number().min(0).optional(),
      cargo_capacity: z.number().min(0).optional(), // cubic meters
      weight: z.number().min(0).optional(), // kg
      length: z.number().min(0).optional(), // meters
      width: z.number().min(0).optional(), // meters
      height: z.number().min(0).optional(), // meters
      top_speed: z.number().min(0).optional(), // km/h
      safety_rating: z
        .enum(["5_star", "4_star", "3_star", "2_star", "1_star"])
        .optional(),
      emissions_class: z.string().optional(),
      registration: z.string().optional(),
      owner: z.string().optional(), // Person/Organization UID
    })
    .optional(),
});

// ==================== UID Validation ====================

export const VEHICLE_UID_PREFIX = "vehicle";

export const validateVehicleUID = (uid: string): boolean => {
  return uid.startsWith("vehicle:");
};

// ==================== Type Exports ====================

export type VehicleEntity = z.infer<typeof VehicleEntitySchema>;
