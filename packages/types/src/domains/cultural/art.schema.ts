/**
 * Art Entity Schema - Cultural Domain
 *
 * Schema for art entities in the cultural domain.
 * Covers visual artworks, sculptures, paintings, and artistic creations.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Art Entity Schema ====================

export const ArtEntitySchema = EntitySchema.extend({
  type: z.literal("Art"),
  properties: z
    .object({
      artist: z.array(z.string()).optional(), // Artist person UIDs
      medium: z
        .array(
          z.enum([
            "oil_painting",
            "watercolor",
            "acrylic",
            "tempera",
            "pastel",
            "charcoal",
            "pencil",
            "ink",
            "sculpture",
            "bronze",
            "marble",
            "wood",
            "clay",
            "digital",
            "photography",
            "printmaking",
            "mixed_media",
          ])
        )
        .optional(),
      dimensions: z
        .object({
          height: z.number().min(0).optional(), // in centimeters
          width: z.number().min(0).optional(),
          depth: z.number().min(0).optional(),
        })
        .optional(),
      creationDate: z.string().optional(), // ISO date or period
      period: z.string().optional(), // Art period/movement
      style: z.array(z.string()).optional(), // Artistic styles
      subject: z.string().optional(), // Subject matter
      currentLocation: z.string().optional(), // Museum/gallery UID
      owner: z.string().optional(), // Current owner UID
      provenance: z.array(z.string()).optional(), // Ownership history
      exhibitions: z.array(z.string()).optional(), // Exhibition history
      condition: z
        .enum(["excellent", "good", "fair", "poor", "restored"])
        .optional(),
      authentication: z
        .object({
          authenticated: z.boolean().optional(),
          authenticator: z.string().optional(), // Expert UID
          certificate: z.boolean().optional(),
        })
        .optional(),
      value: z
        .object({
          estimated: z.number().min(0).optional(),
          currency: z.string().optional(),
          appraisalDate: z.string().optional(),
        })
        .optional(),
      sales: z
        .array(
          z.object({
            date: z.string().optional(),
            price: z.number().min(0).optional(),
            auctionHouse: z.string().optional(),
          })
        )
        .optional(),
      reproductions: z.array(z.string()).optional(), // Reproduction UIDs
      significance: z.string().optional(), // Art historical significance
      influences: z.array(z.string()).optional(), // Influenced by (art UIDs)
      influenced: z.array(z.string()).optional(), // Influenced (art UIDs)
      cultural: z
        .object({
          culturalOrigin: z.string().optional(),
          religious: z.boolean().optional(),
          ceremonial: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ART_UID_PREFIX = "art";

export const validateArtUID = (uid: string): boolean => {
  return uid.startsWith("art:");
};

// ==================== Type Exports ====================

export type ArtEntity = z.infer<typeof ArtEntitySchema>;
