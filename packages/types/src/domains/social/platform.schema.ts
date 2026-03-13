/**
 * Platform Entity Schema - Social Domain
 *
 * Schema for digital platform entities in the social domain.
 * Covers social media, news sites, forums, and other online platforms.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Platform Entity Schema ====================

export const PlatformEntitySchema = EntitySchema.extend({
  type: z.literal("Platform"),
  properties: z
    .object({
      platformType: z
        .enum([
          "social_media",
          "news",
          "video",
          "podcast",
          "messaging",
          "forum",
          "blog",
          "website",
        ])
        .optional(),
      launched: z.string().optional(), // launch date
      shutdown: z.string().optional(), // platform shutdown date
      discontinued: z.string().optional(), // service discontinuation
      rebranded: z.string().optional(), // platform rebranding date
      userBase: z.number().min(0).optional(), // active user count
      parentCompany: z.string().optional(), // owning organization UID
      headquarters: z.string().optional(),
      ceo: z.string().optional(), // current leadership
      website: z.string().url().optional(),
      moderationPolicies: z.string().optional(), // policy summary
      contentTypes: z.array(z.string()).optional(), // supported content types
      primaryAudience: z.string().optional(), // target demographic
      businessModel: z
        .enum([
          "advertising",
          "subscription",
          "freemium",
          "donation",
          "ecommerce",
          "mixed",
        ])
        .optional(),
      status: z
        .enum(["active", "discontinued", "acquired", "rebranded"])
        .optional(),
      features: z.array(z.string()).optional(), // platform features
      apiAvailable: z.boolean().optional(), // public API availability
      dataPolicy: z.string().optional(), // data usage policy
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PLATFORM_UID_PREFIX = "platform";

export const validatePlatformUID = (uid: string): boolean => {
  return uid.startsWith("platform:");
};

// ==================== Type Exports ====================

export type PlatformEntity = z.infer<typeof PlatformEntitySchema>;
