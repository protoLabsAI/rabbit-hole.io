/**
 * Building Entity Schema - Infrastructure Domain
 *
 * Schema for building entities in the infrastructure domain.
 * Covers residential, commercial, and institutional structures.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Building Entity Schema ====================

export const BuildingEntitySchema = EntitySchema.extend({
  type: z.literal("Building"),
  properties: z
    .object({
      building_type: z
        .enum([
          "residential",
          "commercial",
          "industrial",
          "institutional",
          "mixed_use",
          "warehouse",
          "office",
          "retail",
          "hospital",
          "school",
        ])
        .optional(),
      construction_date: z.string().optional(),
      completion_date: z.string().optional(),
      height: z.number().min(0).optional(), // in meters
      floors: z.number().min(1).optional(),
      floor_area: z.number().min(0).optional(), // square meters
      capacity: z.number().min(0).optional(), // occupancy
      energy_rating: z.enum(["A", "B", "C", "D", "E", "F", "G"]).optional(),
      architect: z.string().optional(), // Person UID
      developer: z.string().optional(), // Organization UID
      owner: z.string().optional(), // Person/Organization UID
      construction_cost: z.number().min(0).optional(),
      property_value: z.number().min(0).optional(),
      zoning: z.string().optional(),
      accessibility_compliant: z.boolean().optional(),
      parking_spaces: z.number().min(0).optional(),
      utilities: z.array(z.string()).optional(), // Utility UIDs
      safety_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
      renovation_history: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const BUILDING_UID_PREFIX = "building";

export const validateBuildingUID = (uid: string): boolean => {
  return uid.startsWith("building:");
};

// ==================== Type Exports ====================

export type BuildingEntity = z.infer<typeof BuildingEntitySchema>;
