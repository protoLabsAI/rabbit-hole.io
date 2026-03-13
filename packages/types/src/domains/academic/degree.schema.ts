/**
 * Degree Entity Schema - Academic Domain
 *
 * Schema for degree entities in the academic domain.
 * Covers academic degrees, diplomas, and certifications.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Degree Entity Schema ====================

export const DegreeEntitySchema = EntitySchema.extend({
  type: z.literal("Degree"),
  properties: z
    .object({
      degreeType: z
        .enum([
          "associates",
          "bachelors",
          "masters",
          "doctorate",
          "professional",
          "certificate",
          "diploma",
          "postdoc",
        ])
        .optional(),
      degreeLevel: z
        .enum([
          "undergraduate",
          "graduate",
          "postgraduate",
          "doctoral",
          "professional",
          "certificate",
        ])
        .optional(),
      field: z.string().optional(), // Major/field of study
      minorFields: z.array(z.string()).optional(), // Minor fields
      concentration: z.string().optional(), // Specialization
      university: z.string().optional(), // Awarding institution UID
      school: z.string().optional(), // School/college within university
      department: z.string().optional(), // Academic department
      requirements: z
        .object({
          creditHours: z.number().min(0).optional(),
          courses: z.array(z.string()).optional(), // Required course UIDs
          gpaMinimum: z.number().min(0).max(4).optional(),
          thesis: z.boolean().optional(),
          dissertation: z.boolean().optional(),
          comprehensives: z.boolean().optional(),
          residency: z.boolean().optional(),
          internship: z.boolean().optional(),
          practicum: z.boolean().optional(),
        })
        .optional(),
      duration: z
        .object({
          typical: z.string().optional(), // Typical completion time
          minimum: z.string().optional(),
          maximum: z.string().optional(),
        })
        .optional(),
      accreditation: z.array(z.string()).optional(), // Accrediting bodies
      licensure: z
        .object({
          prepares: z.boolean().optional(), // Prepares for professional licensure
          licenses: z.array(z.string()).optional(), // License types
        })
        .optional(),
      career: z
        .object({
          paths: z.array(z.string()).optional(), // Career paths
          median_salary: z.number().min(0).optional(),
          employment_rate: z.number().min(0).max(100).optional(),
        })
        .optional(),
      admission: z
        .object({
          requirements: z.array(z.string()).optional(),
          tests: z.array(z.string()).optional(), // GRE, GMAT, etc.
          gpa: z.number().min(0).max(4).optional(),
          competitiveness: z
            .enum(["highly_competitive", "competitive", "moderate", "open"])
            .optional(),
        })
        .optional(),
      delivery: z
        .array(z.enum(["on_campus", "online", "hybrid", "distance"]))
        .optional(),
      cost: z
        .object({
          tuition: z.number().min(0).optional(),
          fees: z.number().min(0).optional(),
          total: z.number().min(0).optional(),
        })
        .optional(),
      languages: z.array(z.string()).optional(), // Languages of instruction
      international: z.boolean().optional(), // Available internationally
    })
    .optional(),
});

// ==================== UID Validation ====================

export const DEGREE_UID_PREFIX = "degree";

export const validateDegreeUID = (uid: string): boolean => {
  return uid.startsWith("degree:");
};

// ==================== Type Exports ====================

export type DegreeEntity = z.infer<typeof DegreeEntitySchema>;
