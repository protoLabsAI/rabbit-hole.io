/**
 * Journal Entity Schema - Academic Domain
 *
 * Schema for journal entities in the academic domain.
 * Covers academic journals, periodicals, and serials.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Journal Entity Schema ====================

export const JournalEntitySchema = EntitySchema.extend({
  type: z.literal("Journal"),
  properties: z
    .object({
      journalType: z
        .enum([
          "academic_journal",
          "trade_journal",
          "popular_science",
          "review_journal",
          "conference_proceedings",
          "magazine",
          "newsletter",
        ])
        .optional(),
      issn: z.string().optional(), // International Standard Serial Number
      eIssn: z.string().optional(), // Electronic ISSN
      publisher: z.string().optional(), // Publisher organization UID
      editor: z.string().optional(), // Editor-in-chief person UID
      editorialBoard: z.array(z.string()).optional(), // Editor person UIDs
      foundedYear: z
        .number()
        .min(1665)
        .max(new Date().getFullYear())
        .optional(),
      frequency: z
        .enum([
          "daily",
          "weekly",
          "biweekly",
          "monthly",
          "bimonthly",
          "quarterly",
          "biannual",
          "annual",
          "irregular",
        ])
        .optional(),
      field: z.string().optional(), // Primary academic field
      subfields: z.array(z.string()).optional(),
      language: z.array(z.string()).optional(),
      country: z.string().optional(), // Country of publication
      indexing: z
        .array(
          z.enum([
            "sci",
            "ssci",
            "ahci",
            "medline",
            "pubmed",
            "scopus",
            "google_scholar",
            "jstor",
          ])
        )
        .optional(),
      impactFactor: z.number().min(0).optional(),
      quartile: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
      hIndex: z.number().min(0).optional(),
      citationCount: z.number().min(0).optional(),
      openAccess: z
        .object({
          type: z
            .enum(["diamond", "gold", "green", "bronze", "hybrid", "closed"])
            .optional(),
          apc: z.number().min(0).optional(), // Article Processing Charge
          policy: z.string().optional(),
        })
        .optional(),
      peerReview: z
        .object({
          type: z
            .enum([
              "single_blind",
              "double_blind",
              "triple_blind",
              "open",
              "post_publication",
            ])
            .optional(),
          averageTime: z.number().min(0).optional(), // Days
        })
        .optional(),
      acceptanceRate: z.number().min(0).max(100).optional(), // Percentage
      website: z.string().optional(),
      socialMedia: z.array(z.string()).optional(),
      discontinuation: z
        .object({
          discontinued: z.boolean().optional(),
          lastIssue: z.string().optional(), // ISO date
          reason: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const JOURNAL_UID_PREFIX = "journal";

export const validateJournalUID = (uid: string): boolean => {
  return uid.startsWith("journal:");
};

// ==================== Type Exports ====================

export type JournalEntity = z.infer<typeof JournalEntitySchema>;
