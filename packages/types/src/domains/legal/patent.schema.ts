/**
 * Patent Entity Schema - Legal Domain
 *
 * Schema for patent entities in the legal domain.
 * Covers patents, patent applications, and intellectual property.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Patent Entity Schema ====================

export const PatentEntitySchema = EntitySchema.extend({
  type: z.literal("Patent"),
  properties: z
    .object({
      patentType: z
        .enum([
          "utility",
          "design",
          "plant",
          "provisional",
          "continuation",
          "divisional",
          "reissue",
        ])
        .optional(),
      patentNumber: z.string().optional(), // Official patent number
      applicationNumber: z.string().optional(), // Application number
      filingDate: z.string().optional(), // ISO date
      priorityDate: z.string().optional(), // ISO date
      issueDate: z.string().optional(), // ISO date
      publicationDate: z.string().optional(), // ISO date
      expirationDate: z.string().optional(), // ISO date
      status: z
        .enum([
          "pending",
          "granted",
          "abandoned",
          "expired",
          "rejected",
          "withdrawn",
          "interference",
        ])
        .optional(),
      inventors: z.array(z.string()).optional(), // Inventor entity UIDs
      assignee: z.string().optional(), // Patent assignee organization UID
      attorney: z.string().optional(), // Patent attorney/agent UID
      classification: z
        .object({
          ipc: z.array(z.string()).optional(), // International Patent Class
          cpc: z.array(z.string()).optional(), // Cooperative Patent Class
          uspc: z.array(z.string()).optional(), // US Patent Classification
        })
        .optional(),
      claims: z.number().min(1).optional(), // Number of claims
      references: z
        .object({
          patents: z.array(z.string()).optional(), // Referenced patent UIDs
          nonPatent: z.array(z.string()).optional(), // Non-patent references
        })
        .optional(),
      family: z.array(z.string()).optional(), // Patent family UIDs
      licensing: z
        .object({
          licensed: z.boolean().optional(),
          licensees: z.array(z.string()).optional(),
          royalty: z.boolean().optional(),
        })
        .optional(),
      maintenance: z
        .object({
          fees_paid: z.boolean().optional(),
          next_fee_due: z.string().optional(), // ISO date
        })
        .optional(),
      litigation: z.array(z.string()).optional(), // Related litigation case UIDs
      abstract: z.string().optional(), // Patent abstract
      field: z.string().optional(), // Technical field
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PATENT_UID_PREFIX = "patent";

export const validatePatentUID = (uid: string): boolean => {
  return uid.startsWith("patent:");
};

// ==================== Type Exports ====================

export type PatentEntity = z.infer<typeof PatentEntitySchema>;
