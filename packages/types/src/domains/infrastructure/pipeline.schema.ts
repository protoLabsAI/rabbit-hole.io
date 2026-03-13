/**
 * Pipeline Entity Schema - Infrastructure Domain
 *
 * Schema for pipeline entities in the infrastructure domain.
 * Covers oil, gas, water, and chemical transport pipelines.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Pipeline Entity Schema ====================

export const PipelineEntitySchema = EntitySchema.extend({
  type: z.literal("Pipeline"),
  properties: z
    .object({
      pipeline_type: z
        .enum([
          "oil",
          "natural_gas",
          "water",
          "sewage",
          "refined_products",
          "chemical",
          "slurry",
          "pneumatic",
        ])
        .optional(),
      construction_date: z.string().optional(),
      length: z.number().min(0).optional(), // kilometers
      diameter: z.number().min(0).optional(), // inches or mm
      pressure_rating: z.number().min(0).optional(), // PSI or bar
      material: z.string().optional(),
      transported_material: z.string().optional(),
      capacity: z.number().min(0).optional(), // varies by type
      operating_pressure: z.number().min(0).optional(),
      depth: z.number().min(0).optional(), // meters below surface
      operator: z.string().optional(), // Organization UID
      origin: z.string().optional(), // Starting location
      destination: z.string().optional(), // End location
      intermediate_stations: z.array(z.string()).optional(),
      safety_systems: z.array(z.string()).optional(),
      environmental_protection: z.array(z.string()).optional(),
      regulatory_compliance: z.array(z.string()).optional(),
      inspection_frequency: z.string().optional(),
      leak_detection: z.boolean().optional(),
      cathodic_protection: z.boolean().optional(),
      right_of_way: z.number().min(0).optional(), // meters
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PIPELINE_UID_PREFIX = "pipeline";

export const validatePipelineUID = (uid: string): boolean => {
  return uid.startsWith("pipeline:");
};

// ==================== Type Exports ====================

export type PipelineEntity = z.infer<typeof PipelineEntitySchema>;
