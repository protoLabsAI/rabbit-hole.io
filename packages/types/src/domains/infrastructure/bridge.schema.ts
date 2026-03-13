/**
 * Bridge Entity Schema - Infrastructure Domain
 *
 * Schema for bridge entities in the infrastructure domain.
 * Covers transportation bridges and structural crossings.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Bridge Entity Schema ====================

export const BridgeEntitySchema = EntitySchema.extend({
  type: z.literal("Bridge"),
  properties: z
    .object({
      bridge_type: z
        .enum([
          "arch",
          "beam",
          "cable_stayed",
          "cantilever",
          "suspension",
          "truss",
          "movable",
          "footbridge",
        ])
        .optional(),
      construction_date: z.string().optional(),
      length: z.number().min(0).optional(), // in meters
      width: z.number().min(0).optional(), // in meters
      height: z.number().min(0).optional(), // in meters
      max_load: z.number().min(0).optional(), // in tonnes
      spans: z.number().min(1).optional(),
      crosses: z.string().optional(), // what it crosses (river, road, etc.)
      material: z.array(z.string()).optional(),
      lanes: z.number().min(0).optional(),
      pedestrian_access: z.boolean().optional(),
      engineer: z.string().optional(), // Person UID
      contractor: z.string().optional(), // Organization UID
      owner: z.string().optional(), // Organization UID
      maintenance_schedule: z.string().optional(),
      inspection_rating: z
        .enum(["excellent", "good", "fair", "poor", "critical"])
        .optional(),
      toll_bridge: z.boolean().optional(),
      clearance_height: z.number().min(0).optional(), // meters
      daily_traffic: z.number().min(0).optional(),
      weight_restrictions: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const BRIDGE_UID_PREFIX = "bridge";

export const validateBridgeUID = (uid: string): boolean => {
  return uid.startsWith("bridge:");
};

// ==================== Type Exports ====================

export type BridgeEntity = z.infer<typeof BridgeEntitySchema>;
