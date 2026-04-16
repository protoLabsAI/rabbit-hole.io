import { z } from "zod";

/**
 * Knowledge Graph Schema
 * Handles existing entities and relationships for context
 * Using passthrough to accept any entity/relationship structure from @protolabsai/types
 */
export const ExistingEntitiesSchema = z
  .array(z.object({}).passthrough())
  .optional()
  .describe("Existing entities in knowledge graph for relationship detection");

export const ExistingRelationshipsSchema = z
  .array(z.object({}).passthrough())
  .optional()
  .describe("Existing relationships in knowledge graph for context");

export type ExistingEntities = z.infer<typeof ExistingEntitiesSchema>;
export type ExistingRelationships = z.infer<typeof ExistingRelationshipsSchema>;
