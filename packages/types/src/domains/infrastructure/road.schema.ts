/**
 * Road Entity Schema - Infrastructure Domain
 *
 * Schema for road entities in the infrastructure domain.
 * Covers highways, streets, and transportation routes.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Road Entity Schema ====================

export const RoadEntitySchema = EntitySchema.extend({
  type: z.literal("Road"),
  properties: z
    .object({
      road_type: z
        .enum([
          "highway",
          "arterial",
          "collector",
          "local",
          "residential",
          "rural",
          "urban",
          "toll_road",
        ])
        .optional(),
      construction_date: z.string().optional(),
      length: z.number().min(0).optional(), // in kilometers
      width: z.number().min(0).optional(), // in meters
      lanes: z.number().min(1).optional(),
      speed_limit: z.number().min(0).optional(), // in km/h
      surface_type: z
        .enum(["asphalt", "concrete", "gravel", "dirt", "cobblestone"])
        .optional(),
      traffic_volume: z.number().min(0).optional(), // AADT - Average Annual Daily Traffic
      condition: z
        .enum(["excellent", "good", "fair", "poor", "critical"])
        .optional(),
      lighting: z.boolean().optional(),
      sidewalks: z.boolean().optional(),
      bike_lanes: z.boolean().optional(),
      toll_road: z.boolean().optional(),
      maintenance_authority: z.string().optional(), // Organization UID
      connects: z.array(z.string()).optional(), // Connected road/city UIDs
      bridges: z.array(z.string()).optional(), // Bridge UIDs on this road
      intersections: z.array(z.string()).optional(),
      scenic_route: z.boolean().optional(),
      commercial_access: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ROAD_UID_PREFIX = "road";

export const validateRoadUID = (uid: string): boolean => {
  return uid.startsWith("road:");
};

// ==================== Type Exports ====================

export type RoadEntity = z.infer<typeof RoadEntitySchema>;
