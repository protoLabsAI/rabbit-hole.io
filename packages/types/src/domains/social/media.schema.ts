/**
 * Media Entity Schema - Social Domain
 *
 * Schema for media entities - news articles, publications, broadcasts, etc.
 * Covers traditional and digital media content.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Media Entity Schema ====================

export const MediaEntitySchema = EntitySchema.extend({
  type: z.literal("Media"),
  properties: z
    .object({
      mediaType: z
        .enum([
          "article",
          "video",
          "podcast",
          "book",
          "documentary",
          "broadcast",
          "social_post",
          "interview",
          "report",
          "investigation",
        ])
        .optional(),
      publishedDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional(),
      author: z.array(z.string()).optional(), // author person UIDs
      publisher: z.string().optional(), // publishing organization UID
      platform: z.string().optional(), // publishing platform UID
      url: z.string().url().optional(), // original URL
      headline: z.string().optional(), // title/headline
      summary: z.string().optional(), // brief description
      topics: z.array(z.string()).optional(), // covered topics
      subjects: z.array(z.string()).optional(), // subject entity UIDs
      language: z.string().optional(), // primary language
      audience: z.string().optional(), // target audience
      credibility: z
        .enum(["verified", "reliable", "questionable", "false", "satire"])
        .optional(),
      viewCount: z.number().min(0).optional(), // view/read count
      shareCount: z.number().min(0).optional(), // share count
      engagement: z.number().min(0).optional(), // engagement metrics
      archived: z.boolean().optional(), // archived status
      factChecked: z.boolean().optional(), // fact-check status
      corrections: z.array(z.string()).optional(), // correction notes
      sources: z.array(z.string()).optional(), // source entity UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const MEDIA_UID_PREFIX = "media";

export const validateMediaUID = (uid: string): boolean => {
  return uid.startsWith("media:");
};

// ==================== Type Exports ====================

export type MediaEntity = z.infer<typeof MediaEntitySchema>;
