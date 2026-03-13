/**
 * Aircraft Entity Schema - Transportation Domain
 *
 * Schema for aircraft entities in the transportation domain.
 * Covers airplanes, helicopters, and flying vehicles.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Aircraft Entity Schema ====================

export const AircraftEntitySchema = EntitySchema.extend({
  type: z.literal("Aircraft"),
  properties: z
    .object({
      aircraft_type: z
        .enum([
          "airliner",
          "regional",
          "business_jet",
          "general_aviation",
          "cargo",
          "military",
          "helicopter",
          "glider",
          "ultralight",
        ])
        .optional(),
      manufacturer: z.string().optional(), // Company UID
      model: z.string().optional(),
      first_flight: z.string().optional(),
      passenger_capacity: z.number().min(0).optional(),
      cargo_capacity: z.number().min(0).optional(), // kg
      range: z.number().min(0).optional(), // nautical miles
      cruising_speed: z.number().min(0).optional(), // knots
      service_ceiling: z.number().min(0).optional(), // feet
      engines: z.number().min(0).optional(),
      engine_type: z
        .enum(["turbofan", "turboprop", "piston", "turbojet"])
        .optional(),
      wingspan: z.number().min(0).optional(), // meters
      length: z.number().min(0).optional(), // meters
      height: z.number().min(0).optional(), // meters
      max_takeoff_weight: z.number().min(0).optional(), // kg
      fuel_capacity: z.number().min(0).optional(), // liters
      avionics: z.array(z.string()).optional(),
      registration: z.string().optional(),
      owner: z.string().optional(), // Person/Organization UID
      operator: z.string().optional(), // Organization UID
      home_airport: z.string().optional(), // Airport UID
    })
    .optional(),
});

// ==================== UID Validation ====================

export const AIRCRAFT_UID_PREFIX = "aircraft";

export const validateAircraftUID = (uid: string): boolean => {
  return uid.startsWith("aircraft:");
};

// ==================== Type Exports ====================

export type AircraftEntity = z.infer<typeof AircraftEntitySchema>;
