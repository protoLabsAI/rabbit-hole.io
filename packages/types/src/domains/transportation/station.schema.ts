/**
 * Station Entity Schema - Transportation Domain
 *
 * Schema for station entities in the transportation domain.
 * Covers transportation terminals, stops, and hubs.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Station Entity Schema ====================

export const StationEntitySchema = EntitySchema.extend({
  type: z.literal("Station"),
  properties: z
    .object({
      station_type: z
        .enum([
          "train",
          "subway",
          "bus",
          "ferry",
          "airport_terminal",
          "truck_stop",
          "rest_area",
          "charging",
          "fuel",
        ])
        .optional(),
      opened_date: z.string().optional(),
      platform_count: z.number().min(0).optional(),
      tracks: z.number().min(0).optional(),
      passenger_capacity: z.number().min(0).optional(),
      daily_ridership: z.number().min(0).optional(),
      accessibility_features: z.boolean().optional(),
      parking_spaces: z.number().min(0).optional(),
      bicycle_parking: z.number().min(0).optional(),
      services: z.array(z.string()).optional(),
      operated_by: z.string().optional(), // Organization UID
      connected_routes: z.array(z.string()).optional(), // Route UIDs
      transfer_connections: z.array(z.string()).optional(), // Other station UIDs
      facilities: z.array(z.string()).optional(),
      retail_outlets: z.array(z.string()).optional(),
      hours_of_operation: z.string().optional(),
      staffed: z.boolean().optional(),
      security_level: z.enum(["low", "medium", "high"]).optional(),
      wifi_available: z.boolean().optional(),
      waiting_area: z.boolean().optional(),
      ticketing: z.enum(["automated", "staffed", "mobile", "none"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const STATION_UID_PREFIX = "station";

export const validateStationUID = (uid: string): boolean => {
  return uid.startsWith("station:");
};

// ==================== Type Exports ====================

export type StationEntity = z.infer<typeof StationEntitySchema>;
