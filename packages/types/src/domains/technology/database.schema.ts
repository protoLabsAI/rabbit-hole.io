/**
 * Database Entity Schema - Technology Domain
 *
 * Schema for database entities in the technology domain.
 * Covers database management systems and data storage solutions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Database Entity Schema ====================

export const DatabaseEntitySchema = EntitySchema.extend({
  type: z.literal("Database"),
  properties: z
    .object({
      database_type: z
        .enum([
          "relational",
          "nosql",
          "graph",
          "document",
          "key_value",
          "time_series",
          "search",
          "vector",
          "other",
        ])
        .optional(),
      query_language: z.array(z.string()).optional(), // SQL, GraphQL, etc.
      vendor: z.string().optional(), // Vendor organization UID
      license: z
        .enum(["open_source", "commercial", "freemium", "enterprise"])
        .optional(),
      cloud_native: z.boolean().optional(),
      acid_compliant: z.boolean().optional(),
      scalability: z
        .enum(["single_node", "horizontal", "vertical", "both"])
        .optional(),
      primary_use_cases: z.array(z.string()).optional(),
      supported_platforms: z.array(z.string()).optional(),
      replication: z.boolean().optional(),
      clustering: z.boolean().optional(),
      backup_features: z.array(z.string()).optional(),
      security_features: z.array(z.string()).optional(),
      performance_metrics: z.record(z.string(), z.string()).optional(),
      version: z.string().optional(),
      release_date: z.string().optional(),
      status: z.enum(["active", "deprecated", "beta", "legacy"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const DATABASE_UID_PREFIX = "database";

export const validateDatabaseUID = (uid: string): boolean => {
  return uid.startsWith("database:");
};

// ==================== Type Exports ====================

export type DatabaseEntity = z.infer<typeof DatabaseEntitySchema>;
