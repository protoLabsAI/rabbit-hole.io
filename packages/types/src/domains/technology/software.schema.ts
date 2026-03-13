/**
 * Software Entity Schema - Technology Domain
 *
 * Schema for software entities in the technology domain.
 * Covers applications, operating systems, tools, and programs.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Software Entity Schema ====================

export const SoftwareEntitySchema = EntitySchema.extend({
  type: z.literal("Software"),
  properties: z
    .object({
      version: z.string().optional(), // Current version
      language: z.array(z.string()).optional(), // Programming languages
      framework: z.string().optional(), // Framework used
      license: z
        .enum([
          "MIT",
          "GPL",
          "Apache",
          "BSD",
          "Commercial",
          "Proprietary",
          "Other",
        ])
        .optional(),
      openSource: z.boolean().optional(),
      repository: z.string().url().optional(), // Source code repository
      documentation: z.string().url().optional(),
      company: z.string().optional(), // Developing company UID
      category: z
        .enum([
          "operating_system",
          "application",
          "library",
          "framework",
          "tool",
          "game",
          "mobile_app",
          "web_app",
          "system_software",
        ])
        .optional(),
      platform: z.array(z.string()).optional(), // Supported platforms
      dependencies: z.array(z.string()).optional(), // Required software UIDs
      release_date: z.string().optional(),
      end_of_life: z.string().optional(),
      user_base: z.number().min(0).optional(), // Number of users
      pricing_model: z
        .enum(["free", "freemium", "subscription", "one_time", "enterprise"])
        .optional(),
      status: z
        .enum(["active", "deprecated", "beta", "alpha", "discontinued"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SOFTWARE_UID_PREFIX = "software";

export const validateSoftwareUID = (uid: string): boolean => {
  return uid.startsWith("software:");
};

// ==================== Type Exports ====================

export type SoftwareEntity = z.infer<typeof SoftwareEntitySchema>;
