/**
 * Hardware Entity Schema - Technology Domain
 *
 * Schema for hardware entities in the technology domain.
 * Covers computer components, devices, and physical technology.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Hardware Entity Schema ====================

export const HardwareEntitySchema = EntitySchema.extend({
  type: z.literal("Hardware"),
  properties: z
    .object({
      category: z
        .enum([
          "processor",
          "memory",
          "storage",
          "graphics_card",
          "motherboard",
          "network",
          "mobile_device",
          "computer",
          "server",
          "sensor",
          "other",
        ])
        .optional(),
      manufacturer: z.string().optional(), // Manufacturer organization UID
      model: z.string().optional(),
      specifications: z.record(z.string(), z.string()).optional(), // Key-value specs
      release_date: z.string().optional(),
      end_of_life: z.string().optional(),
      architecture: z.string().optional(), // x86, ARM, etc.
      power_consumption: z.number().min(0).optional(), // Watts
      price_range: z.string().optional(),
      supported_software: z.array(z.string()).optional(), // Software UIDs
      compatibility: z.array(z.string()).optional(), // Compatible hardware UIDs
      form_factor: z.string().optional(), // Physical form factor
      connectivity: z.array(z.string()).optional(), // Connection types
      performance_metrics: z.record(z.string(), z.number()).optional(), // Benchmarks
      availability: z
        .enum(["available", "discontinued", "limited", "upcoming"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const HARDWARE_UID_PREFIX = "hardware";

export const validateHardwareUID = (uid: string): boolean => {
  return uid.startsWith("hardware:");
};

// ==================== Type Exports ====================

export type HardwareEntity = z.infer<typeof HardwareEntitySchema>;
