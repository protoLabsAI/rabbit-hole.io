/**
 * Airport Entity Schema - Infrastructure Domain
 *
 * Schema for airport entities in the infrastructure domain.
 * Covers aviation facilities and transportation hubs.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Airport Entity Schema ====================

export const AirportEntitySchema = EntitySchema.extend({
  type: z.literal("Airport"),
  properties: z
    .object({
      airport_code: z.string().optional(), // IATA/ICAO codes
      airport_type: z
        .enum([
          "international",
          "domestic",
          "regional",
          "general_aviation",
          "military",
          "cargo",
          "heliport",
        ])
        .optional(),
      opened_date: z.string().optional(),
      elevation: z.number().optional(), // meters above sea level
      runway_count: z.number().min(0).optional(),
      longest_runway: z.number().min(0).optional(), // meters
      passenger_capacity: z.number().min(0).optional(), // annual
      cargo_capacity: z.number().min(0).optional(), // tonnes per year
      terminal_count: z.number().min(0).optional(),
      gates: z.number().min(0).optional(),
      parking_spaces: z.number().min(0).optional(),
      annual_passengers: z.number().min(0).optional(),
      annual_operations: z.number().min(0).optional(), // flights per year
      airlines: z.array(z.string()).optional(), // Organization UIDs
      destinations: z.array(z.string()).optional(), // Airport UIDs
      ground_transportation: z.array(z.string()).optional(),
      customs_facility: z.boolean().optional(),
      immigration_facility: z.boolean().optional(),
      duty_free: z.boolean().optional(),
      wifi_available: z.boolean().optional(),
      hotel_onsite: z.boolean().optional(),
      security_level: z.enum(["standard", "enhanced", "maximum"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const AIRPORT_UID_PREFIX = "airport";

export const validateAirportUID = (uid: string): boolean => {
  return uid.startsWith("airport:");
};

// ==================== Type Exports ====================

export type AirportEntity = z.infer<typeof AirportEntitySchema>;
