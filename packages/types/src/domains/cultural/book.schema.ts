/**
 * Book Entity Schema - Cultural Domain
 *
 * Schema for book entities in the cultural domain.
 * Covers books, novels, textbooks, and other written works.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Book Entity Schema ====================

export const BookEntitySchema = EntitySchema.extend({
  type: z.literal("Book"),
  properties: z
    .object({
      isbn: z.string().optional(), // International Standard Book Number
      isbn13: z.string().optional(),
      authors: z.array(z.string()).optional(), // Author person UIDs
      publisher: z.string().optional(), // Publisher organization UID
      publicationDate: z.string().optional(), // ISO date
      edition: z.string().optional(),
      pages: z.number().min(1).optional(),
      language: z.string().optional(),
      genre: z.array(z.string()).optional(),
      fiction: z.boolean().optional(),
      format: z
        .enum(["hardcover", "paperback", "ebook", "audiobook", "pdf"])
        .optional(),
      series: z.string().optional(), // Book series name
      volume: z.number().min(1).optional(), // Volume in series
      awards: z.array(z.string()).optional(), // Literary awards won
      adaptations: z.array(z.string()).optional(), // Film/TV adaptations
      translations: z.array(z.string()).optional(), // Available translations
      subjects: z.array(z.string()).optional(), // Subject categories
      deweyDecimal: z.string().optional(), // Dewey Decimal Classification
      lccn: z.string().optional(), // Library of Congress Control Number
      reviews: z
        .object({
          averageRating: z.number().min(0).max(5).optional(),
          totalReviews: z.number().min(0).optional(),
        })
        .optional(),
      sales: z
        .object({
          totalSold: z.number().min(0).optional(),
          bestseller: z.boolean().optional(),
        })
        .optional(),
      availability: z
        .object({
          inPrint: z.boolean().optional(),
          publicDomain: z.boolean().optional(),
          openAccess: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const BOOK_UID_PREFIX = "book";

export const validateBookUID = (uid: string): boolean => {
  return uid.startsWith("book:");
};

// ==================== Type Exports ====================

export type BookEntity = z.infer<typeof BookEntitySchema>;
