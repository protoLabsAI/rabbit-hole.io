/**
 * Case Entity Schema - Legal Domain
 *
 * Schema for case entities in the legal domain.
 * Covers legal cases, proceedings, and litigation.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Case Entity Schema ====================

export const CaseEntitySchema = EntitySchema.extend({
  type: z.literal("Case"),
  properties: z
    .object({
      caseType: z
        .enum([
          "civil",
          "criminal",
          "constitutional",
          "administrative",
          "family",
          "probate",
          "bankruptcy",
          "tax",
          "immigration",
          "labor",
          "intellectual_property",
          "class_action",
          "appeal",
        ])
        .optional(),
      caseNumber: z.string().optional(), // Official case number
      citation: z.string().optional(), // Legal citation
      filedDate: z.string().optional(), // ISO date
      closedDate: z.string().optional(), // ISO date
      status: z
        .enum([
          "pending",
          "closed",
          "settled",
          "dismissed",
          "on_appeal",
          "remanded",
        ])
        .optional(),
      court: z.string().optional(), // Court UID where filed
      plaintiff: z.array(z.string()).optional(), // Plaintiff entity UIDs
      defendant: z.array(z.string()).optional(), // Defendant entity UIDs
      judge: z.array(z.string()).optional(), // Presiding judge(s)
      attorneys: z.array(z.string()).optional(), // Attorney entity UIDs
      legalIssues: z.array(z.string()).optional(), // Legal issues involved
      outcome: z.string().optional(), // Case outcome/verdict
      damages: z.number().min(0).optional(), // Monetary damages awarded
      precedential: z.boolean().optional(), // Sets legal precedent
      publicRecord: z.boolean().optional(), // Public record case
      sealed: z.boolean().optional(), // Sealed case
      jury: z.boolean().optional(), // Jury trial
      benchTrial: z.boolean().optional(), // Bench trial
      settlement: z.boolean().optional(), // Settled case
      appeal: z.string().optional(), // Appeal case UID if appealed
      relatedCases: z.array(z.string()).optional(), // Related case UIDs
      subject: z.string().optional(), // Case subject matter
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CASE_UID_PREFIX = "case";

export const validateCaseUID = (uid: string): boolean => {
  return uid.startsWith("case:");
};

// ==================== Type Exports ====================

export type CaseEntity = z.infer<typeof CaseEntitySchema>;
