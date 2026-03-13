/**
 * Utility Entity Schema - Infrastructure Domain
 *
 * Schema for utility entities in the infrastructure domain.
 * Covers power, water, gas, and telecommunications infrastructure.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Utility Entity Schema ====================

export const UtilityEntitySchema = EntitySchema.extend({
  type: z.literal("Utility"),
  properties: z
    .object({
      utility_type: z
        .enum([
          "electric_power",
          "natural_gas",
          "water",
          "wastewater",
          "telecommunications",
          "internet",
          "cable_tv",
          "steam",
          "district_heating",
        ])
        .optional(),
      established_date: z.string().optional(),
      coverage_area: z.number().min(0).optional(), // square kilometers
      capacity: z.number().min(0).optional(), // varies by type
      customers_served: z.number().min(0).optional(),
      energy_source: z.array(z.string()).optional(),
      generation_capacity: z.number().min(0).optional(), // MW or equivalent
      transmission_voltage: z.number().min(0).optional(), // kV
      distribution_network: z.string().optional(),
      reliability_rating: z.number().min(0).max(100).optional(), // percentage uptime
      environmental_impact: z.enum(["low", "medium", "high"]).optional(),
      renewable_percentage: z.number().min(0).max(100).optional(),
      regulatory_authority: z.string().optional(), // Organization UID
      service_areas: z.array(z.string()).optional(), // City/Region UIDs
      infrastructure_age: z.number().min(0).optional(), // years
      maintenance_schedule: z.string().optional(),
      emergency_backup: z.boolean().optional(),
      smart_grid: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const UTILITY_UID_PREFIX = "utility";

export const validateUtilityUID = (uid: string): boolean => {
  return uid.startsWith("utility:");
};

// ==================== Type Exports ====================

export type UtilityEntity = z.infer<typeof UtilityEntitySchema>;
