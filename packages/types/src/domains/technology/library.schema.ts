/**
 * Library Entity Schema - Technology Domain
 *
 * Schema for library entities in the technology domain.
 * Covers code libraries, packages, and reusable components.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Library Entity Schema ====================

export const LibraryEntitySchema = EntitySchema.extend({
  type: z.literal("Library"),
  properties: z
    .object({
      language: z.array(z.string()).optional(), // Programming languages
      category: z
        .enum([
          "utility",
          "ui",
          "data_processing",
          "networking",
          "security",
          "graphics",
          "audio",
          "math",
          "testing",
          "logging",
          "other",
        ])
        .optional(),
      package_manager: z
        .array(
          z.enum([
            "npm",
            "pip",
            "maven",
            "nuget",
            "composer",
            "gem",
            "cargo",
            "other",
          ])
        )
        .optional(),
      version: z.string().optional(),
      license: z
        .enum(["MIT", "GPL", "Apache", "BSD", "Commercial", "Other"])
        .optional(),
      author: z.string().optional(), // Author person/organization UID
      maintainer: z.string().optional(), // Current maintainer UID
      repository: z.string().url().optional(),
      documentation: z.string().url().optional(),
      dependencies: z.array(z.string()).optional(), // Required library UIDs
      size: z.string().optional(), // Package size
      download_count: z.number().min(0).optional(), // Download statistics
      weekly_downloads: z.number().min(0).optional(),
      github_stars: z.number().min(0).optional(),
      open_issues: z.number().min(0).optional(),
      last_commit: z.string().optional(), // Last commit date
      stability: z.enum(["stable", "beta", "alpha", "experimental"]).optional(),
      breaking_changes: z.boolean().optional(),
      security_vulnerabilities: z.number().min(0).optional(),
      status: z
        .enum(["active", "deprecated", "maintenance", "archived"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const LIBRARY_UID_PREFIX = "library";

export const validateLibraryUID = (uid: string): boolean => {
  return uid.startsWith("library:");
};

// ==================== Type Exports ====================

export type LibraryEntity = z.infer<typeof LibraryEntitySchema>;
