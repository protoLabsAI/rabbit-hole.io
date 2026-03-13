/**
 * Entity Merge Strategy Types
 *
 * Defines how to handle conflicts when importing entities that already exist.
 */

import { z } from "zod";

// ==================== Merge Strategy Enum ====================

/**
 * Available merge strategies for handling duplicate entities during import
 */
export const MergeStrategyEnum = z.enum([
  "keep_local", // Keep existing entity, discard incoming (default)
  "replace", // Replace existing entity with incoming
  "merge_smart", // Intelligently merge properties (future)
  "merge_append", // Append new properties, keep existing (future)
  "fail_on_conflict", // Throw error on any conflict (future)
]);

export type MergeStrategy = z.infer<typeof MergeStrategyEnum>;

// ==================== Merge Options Schema ====================

/**
 * Options for configuring merge behavior
 */
export const MergeOptionsSchema = z
  .object({
    strategy: MergeStrategyEnum.default("keep_local"),
    preserveTimestamps: z.boolean().default(true),
    conflictResolution: z.enum(["local", "incoming", "newer"]).default("local"),
  })
  .optional();

export type MergeOptions = z.infer<typeof MergeOptionsSchema>;

// ==================== Import Request Schema ====================

/**
 * Extended request schema that includes merge strategy
 */
export const BundleImportRequestSchema = z.object({
  // Bundle data (existing RabbitHoleBundleData will be validated separately)
  data: z.unknown(),

  // Merge configuration
  mergeOptions: MergeOptionsSchema,
});

export type BundleImportRequest = z.infer<typeof BundleImportRequestSchema>;

// ==================== Merge Result Types ====================

export interface MergeResult {
  action: "kept_local" | "replaced" | "merged" | "failed";
  entityId: string;
  reason?: string;
}

export interface ImportSummary {
  evidenceCreated: number;
  evidenceKept: number;
  filesCreated: number;
  filesKept: number;
  contentCreated: number;
  contentKept: number;
  entitiesCreated: number;
  entitiesKept: number;
  relationshipsCreated: number;
  relationshipsKept: number;
  mergeResults: MergeResult[];
}
