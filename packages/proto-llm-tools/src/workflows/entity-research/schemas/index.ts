/**
 * Entity Research Schemas
 * Modular schema definitions to reduce TypeScript compilation memory usage
 */

export { EntityBaseSchema, type EntityBase } from "./base-entity.schema";
export {
  EntityResearchSourceSchema,
  RawDataSchema,
  type EntityResearchSource,
  type RawData,
} from "./research-source.schema";
export {
  DataSourceConfigSchema,
  type DataSourceConfig,
} from "./data-source-config.schema";
export {
  ExistingEntitiesSchema,
  ExistingRelationshipsSchema,
  type ExistingEntities,
  type ExistingRelationships,
} from "./knowledge-graph.schema";

// Composed main schema
import { z } from "zod";

import { EntityBaseSchema } from "./base-entity.schema";
import { DataSourceConfigSchema } from "./data-source-config.schema";
import {
  ExistingEntitiesSchema,
  ExistingRelationshipsSchema,
} from "./knowledge-graph.schema";
import { RawDataSchema } from "./research-source.schema";

/**
 * Main Entity Research Schema - composed from smaller modules
 * This replaces the massive 138-line schema with modular composition
 */
export const EntityResearchSchema = EntityBaseSchema.extend({
  rawData: RawDataSchema,
  existingEntities: ExistingEntitiesSchema,
  existingRelationships: ExistingRelationshipsSchema,
  dataSourceConfig: DataSourceConfigSchema,
});

export type EntityResearchInput = z.infer<typeof EntityResearchSchema>;
