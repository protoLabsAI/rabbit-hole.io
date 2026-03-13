/**
 * Framework Entity Schema - Technology Domain
 *
 * Schema for framework entities in the technology domain.
 * Covers development frameworks, libraries, and programming tools.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Framework Entity Schema ====================

export const FrameworkEntitySchema = EntitySchema.extend({
  type: z.literal("Framework"),
  properties: z
    .object({
      category: z
        .enum([
          "web",
          "mobile",
          "desktop",
          "game",
          "ml_ai",
          "testing",
          "backend",
          "frontend",
          "fullstack",
          "other",
        ])
        .optional(),
      language: z.array(z.string()).optional(), // Programming languages
      paradigm: z
        .array(
          z.enum(["mvc", "mvp", "mvvm", "component", "reactive", "functional"])
        )
        .optional(),
      license: z
        .enum(["MIT", "GPL", "Apache", "BSD", "Commercial", "Other"])
        .optional(),
      maintainer: z.string().optional(), // Maintainer organization UID
      repository: z.string().url().optional(),
      documentation: z.string().url().optional(),
      learning_curve: z.enum(["easy", "moderate", "steep"]).optional(),
      community_size: z.enum(["small", "medium", "large", "huge"]).optional(),
      version: z.string().optional(),
      release_date: z.string().optional(),
      last_update: z.string().optional(),
      dependencies: z.array(z.string()).optional(), // Framework/Library UIDs
      plugins: z.array(z.string()).optional(), // Available plugin UIDs
      performance: z.enum(["high", "medium", "low"]).optional(),
      bundle_size: z.string().optional(), // Size information
      browser_support: z.array(z.string()).optional(),
      status: z
        .enum(["active", "deprecated", "maintenance", "beta", "alpha"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const FRAMEWORK_UID_PREFIX = "framework";

export const validateFrameworkUID = (uid: string): boolean => {
  return uid.startsWith("framework:");
};

// ==================== Type Exports ====================

export type FrameworkEntity = z.infer<typeof FrameworkEntitySchema>;
