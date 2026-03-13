/**
 * University Entity Schema - Academic Domain
 *
 * Schema for university entities in the academic domain.
 * Covers universities, colleges, and higher education institutions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== University Entity Schema ====================

export const UniversityEntitySchema = EntitySchema.extend({
  type: z.literal("University"),
  properties: z
    .object({
      institutionType: z
        .enum([
          "university",
          "college",
          "community_college",
          "technical_college",
          "graduate_school",
          "professional_school",
          "research_institute",
        ])
        .optional(),
      foundedYear: z.number().min(800).max(new Date().getFullYear()).optional(),
      accreditation: z.array(z.string()).optional(), // Accrediting bodies
      studentCount: z.number().min(0).optional(),
      facultyCount: z.number().min(0).optional(),
      campuses: z.array(z.string()).optional(), // Campus locations
      publicPrivate: z.enum(["public", "private", "for_profit"]).optional(),
      endowment: z.number().min(0).optional(), // Endowment value
      ranking: z
        .object({
          national: z.number().min(1).optional(),
          global: z.number().min(1).optional(),
          specialty: z.record(z.string(), z.number().min(1)).optional(), // field rankings
        })
        .optional(),
      global_ranking: z.number().min(1).optional(), // Simple global ranking field
      tuition: z
        .object({
          inState: z.number().min(0).optional(),
          outOfState: z.number().min(0).optional(),
          international: z.number().min(0).optional(),
        })
        .optional(),
      programs: z.array(z.string()).optional(), // Academic programs offered
      degrees: z
        .array(
          z.enum([
            "associates",
            "bachelors",
            "masters",
            "doctorate",
            "professional",
            "certificate",
          ])
        )
        .optional(),
      researchLevel: z
        .enum(["r1", "r2", "r3", "doctoral", "masters", "baccalaureate"])
        .optional(),
      athleticConference: z.string().optional(),
      mascot: z.string().optional(),
      colors: z.array(z.string()).optional(),
      motto: z.string().optional(),
      website: z.string().optional(),
      president: z.string().optional(), // Current president/chancellor
      notableAlumni: z.array(z.string()).optional(), // Notable alumni UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const UNIVERSITY_UID_PREFIX = "university";

export const validateUniversityUID = (uid: string): boolean => {
  return uid.startsWith("university:");
};

// ==================== Type Exports ====================

export type UniversityEntity = z.infer<typeof UniversityEntitySchema>;
