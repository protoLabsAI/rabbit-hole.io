/**
 * Neo4j Integer Conversion Utilities
 *
 * Centralized utilities for handling Neo4j integer parameter conversion.
 * All neo4j.int() conversions should go through these functions for consistency.
 */

import neo4j from "neo4j-driver";

export interface Neo4jClient {
  executeRead: (
    query: string,
    parameters?: Record<string, any>
  ) => Promise<any>;
  executeWrite?: (
    query: string,
    parameters?: Record<string, any>
  ) => Promise<any>;
}

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

/**
 * Create a Neo4j client wrapper that automatically converts integer parameters
 */
export function createNeo4jClientWithIntegerConversion(
  client: Neo4jClient
): Neo4jClient {
  return {
    executeRead: async (query: string, parameters?: Record<string, any>) => {
      const convertedParams = convertParametersToNeo4j(parameters || {});
      return await client.executeRead(query, convertedParams);
    },
    executeWrite: client.executeWrite
      ? async (query: string, parameters?: Record<string, any>) => {
          const convertedParams = convertParametersToNeo4j(parameters || {});
          return await client.executeWrite!(query, convertedParams);
        }
      : undefined,
  };
}

/**
 * Convert common pagination parameters to Neo4j integers
 */
export function convertPaginationParams(params: {
  pageSize?: number;
  offset?: number;
  limit?: number;
  skip?: number;
  [key: string]: any;
}): Record<string, any> {
  const converted: Record<string, any> = { ...params };

  // Convert common pagination parameters
  if (converted.pageSize !== undefined) {
    converted.pageSize = neo4j.int(converted.pageSize);
  }
  if (converted.offset !== undefined) {
    converted.offset = neo4j.int(converted.offset);
  }
  if (converted.limit !== undefined) {
    converted.limit = neo4j.int(converted.limit);
  }
  if (converted.skip !== undefined) {
    converted.skip = neo4j.int(converted.skip);
  }

  return converted;
}

/**
 * Convert common numeric parameters used in Neo4j queries
 */
export function convertNumericParams(params: {
  maxNodes?: number;
  nodeLimit?: number;
  edgeLimit?: number;
  minActivity?: number;
  communityId?: number;
  intervalMs?: number;
  [key: string]: any;
}): Record<string, any> {
  const converted: Record<string, any> = { ...params };

  // Convert common numeric parameters
  const numericKeys = [
    "maxNodes",
    "nodeLimit",
    "edgeLimit",
    "minActivity",
    "communityId",
    "intervalMs",
  ];

  numericKeys.forEach((key) => {
    if (converted[key] !== undefined && typeof converted[key] === "number") {
      converted[key] = neo4j.int(converted[key]);
    }
  });

  return converted;
}

/**
 * Combined function that converts both pagination and numeric parameters
 */
export function convertAllNeo4jParams(
  params: Record<string, any>
): Record<string, any> {
  return convertNumericParams(convertPaginationParams(params));
}
