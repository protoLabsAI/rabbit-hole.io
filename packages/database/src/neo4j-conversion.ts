/**
 * Neo4j Integer Conversion Utilities
 *
 * Internal utilities for handling Neo4j integer parameter conversion within @protolabsai/database.
 */

import neo4j from "neo4j-driver";

/**
 * Convert a single value to Neo4j integer if it's a number
 */
export function toNeo4jInt(value: any): any {
  if (typeof value === "number" && Number.isInteger(value)) {
    return neo4j.int(value);
  }
  return value;
}

/**
 * Convert all numeric integer parameters in an object to Neo4j integers
 */
export function convertParametersToNeo4j(
  parameters: Record<string, any>
): Record<string, any> {
  if (!parameters) return {};

  const converted = { ...parameters };

  Object.keys(converted).forEach((key) => {
    converted[key] = toNeo4jInt(converted[key]);
  });

  return converted;
}
