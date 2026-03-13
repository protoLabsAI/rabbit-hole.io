/**
 * Publication Entity Schema - Academic Domain
 *
 * Schema for publication entities in the academic domain.
 * Covers academic papers, articles, books, and other publications.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Publication Entity Schema ====================

export const PublicationEntitySchema = EntitySchema.extend({
  type: z.literal("Publication"),
  properties: z
    .object({
      publicationType: z
        .enum([
          "journal_article",
          "conference_paper",
          "book_chapter",
          "book",
          "thesis",
          "dissertation",
          "preprint",
          "technical_report",
          "working_paper",
          "review",
          "editorial",
        ])
        .optional(),
      publishedDate: z.string().optional(), // ISO date
      submittedDate: z.string().optional(), // ISO date
      acceptedDate: z.string().optional(), // ISO date
      authors: z.array(z.string()).optional(), // Author person UIDs
      correspondingAuthor: z.string().optional(), // Corresponding author UID
      journal: z.string().optional(), // Journal UID
      volume: z.string().optional(),
      issue: z.string().optional(),
      pages: z.string().optional(),
      doi: z.string().optional(), // Digital Object Identifier
      isbn: z.string().optional(), // For books
      pmid: z.string().optional(), // PubMed ID
      arxivId: z.string().optional(), // arXiv identifier
      publisher: z.string().optional(), // Publisher organization UID
      peerReviewed: z.boolean().optional(),
      openAccess: z.boolean().optional(),
      license: z.string().optional(), // Creative Commons, etc.
      abstract: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      field: z.string().optional(), // Primary academic field
      subfields: z.array(z.string()).optional(),
      citations: z
        .object({
          count: z.number().min(0).optional(),
          citedBy: z.array(z.string()).optional(), // Citation publication UIDs
          cites: z.array(z.string()).optional(), // Referenced publication UIDs
        })
        .optional(),
      metrics: z
        .object({
          impactFactor: z.number().min(0).optional(),
          hIndex: z.number().min(0).optional(),
          altmetric: z.number().min(0).optional(),
          downloads: z.number().min(0).optional(),
        })
        .optional(),
      funding: z.array(z.string()).optional(), // Funding source UIDs
      affiliations: z.array(z.string()).optional(), // Author institution UIDs
      language: z.string().optional(),
      retracted: z.boolean().optional(),
      retractionReason: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PUBLICATION_UID_PREFIX = "publication";

export const validatePublicationUID = (uid: string): boolean => {
  return uid.startsWith("publication:");
};

// ==================== Type Exports ====================

export type PublicationEntity = z.infer<typeof PublicationEntitySchema>;
