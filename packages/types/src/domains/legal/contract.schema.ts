/**
 * Contract Entity Schema - Legal Domain
 *
 * Schema for contract entities in the legal domain.
 * Covers contracts, agreements, and legal instruments.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Contract Entity Schema ====================

export const ContractEntitySchema = EntitySchema.extend({
  type: z.literal("Contract"),
  properties: z
    .object({
      contractType: z
        .enum([
          "purchase_agreement",
          "service_agreement",
          "employment_contract",
          "lease_agreement",
          "partnership_agreement",
          "non_disclosure_agreement",
          "licensing_agreement",
          "merger_agreement",
          "loan_agreement",
          "insurance_policy",
          "construction_contract",
          "consulting_agreement",
        ])
        .optional(),
      parties: z.array(z.string()).optional(), // Contracting party entity UIDs
      signedDate: z.string().optional(), // ISO date
      effectiveDate: z.string().optional(), // ISO date
      expirationDate: z.string().optional(), // ISO date
      status: z
        .enum([
          "draft",
          "executed",
          "expired",
          "terminated",
          "breached",
          "under_negotiation",
          "pending_signature",
        ])
        .optional(),
      value: z.number().min(0).optional(), // Contract value
      currency: z.string().optional(), // Currency code
      jurisdiction: z.string().optional(), // Governing jurisdiction
      governingLaw: z.string().optional(), // Governing law
      terms: z
        .object({
          duration: z.string().optional(), // Contract duration
          renewalTerms: z.string().optional(),
          terminationClause: z.boolean().optional(),
          penaltyClause: z.boolean().optional(),
          forceMapjeure: z.boolean().optional(),
        })
        .optional(),
      payment: z
        .object({
          method: z.string().optional(),
          schedule: z.string().optional(),
          late_fees: z.boolean().optional(),
        })
        .optional(),
      deliverables: z.array(z.string()).optional(), // Contract deliverables
      milestones: z.array(z.string()).optional(), // Project milestones
      confidentiality: z.boolean().optional(), // Contains confidentiality clause
      exclusivity: z.boolean().optional(), // Exclusive agreement
      assignable: z.boolean().optional(), // Rights can be assigned
      amendments: z.array(z.string()).optional(), // Contract amendment UIDs
      relatedContracts: z.array(z.string()).optional(), // Related contract UIDs
      disputes: z.array(z.string()).optional(), // Dispute case UIDs
      witnesses: z.array(z.string()).optional(), // Witness entity UIDs
      notarized: z.boolean().optional(), // Notarized document
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CONTRACT_UID_PREFIX = "contract";

export const validateContractUID = (uid: string): boolean => {
  return uid.startsWith("contract:");
};

// ==================== Type Exports ====================

export type ContractEntity = z.infer<typeof ContractEntitySchema>;
