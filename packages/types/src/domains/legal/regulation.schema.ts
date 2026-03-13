/**
 * Regulation Entity Schema - Legal Domain
 *
 * Schema for regulation entities in the legal domain.
 * Covers government regulations, rules, and administrative law.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Regulation Entity Schema ====================

export const RegulationEntitySchema = EntitySchema.extend({
  type: z.literal("Regulation"),
  properties: z
    .object({
      regulationType: z
        .enum([
          "federal_regulation",
          "state_regulation",
          "local_regulation",
          "administrative_rule",
          "executive_order",
          "agency_guidance",
          "policy_directive",
          "technical_standard",
        ])
        .optional(),
      agencyIssuer: z.string().optional(), // Issuing agency
      cfr: z.string().optional(), // Code of Federal Regulations citation
      frNumber: z.string().optional(), // Federal Register number
      effectiveDate: z.string().optional(), // ISO date
      publishedDate: z.string().optional(), // ISO date
      commentPeriod: z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional(),
      status: z
        .enum([
          "proposed",
          "final",
          "interim",
          "emergency",
          "withdrawn",
          "superseded",
        ])
        .optional(),
      industry: z.array(z.string()).optional(), // Affected industries
      compliance: z
        .object({
          mandatory: z.boolean().optional(),
          voluntary: z.boolean().optional(),
          deadline: z.string().optional(), // ISO date
        })
        .optional(),
      penalties: z.array(z.string()).optional(), // Non-compliance penalties
      exemptions: z.array(z.string()).optional(), // Exemption criteria
      scope: z.string().optional(), // Regulatory scope
      authority: z.string().optional(), // Legal authority for regulation
      parentLaw: z.string().optional(), // Authorizing law UID
      amendments: z.array(z.string()).optional(), // Amendment history
      supersedes: z.array(z.string()).optional(), // Replaced regulations
      relatedRegulations: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const REGULATION_UID_PREFIX = "regulation";

export const validateRegulationUID = (uid: string): boolean => {
  return uid.startsWith("regulation:");
};

// ==================== Type Exports ====================

export type RegulationEntity = z.infer<typeof RegulationEntitySchema>;
