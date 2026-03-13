/**
 * Application Constants
 *
 * Centralized constants used across the API layer to ensure consistency
 * and prevent magic numbers throughout the codebase.
 */

/**
 * Pagination limits and defaults
 */
export const PAGINATION_LIMITS = {
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_OFFSET: 100000,

  // Search-specific limits
  SEARCH_MIN_LIMIT: 1,
  SEARCH_MAX_LIMIT: 50,
  SEARCH_DEFAULT_LIMIT: 10,
} as const;

/**
 * Confidence scoring defaults
 */
export const CONFIDENCE_DEFAULTS = {
  DEFAULT: 0.8,
  HIGH_RELIABILITY: 0.9,
  SPEECH_ACT_RELIABILITY: 0.85,
  EXACT_MATCH: 0.95,
  PARTIAL_MATCH: 0.7,
  WEAK_MATCH: 0.5,

  // Search similarity thresholds
  SEARCH_EXACT_MATCH: 0.9,
  SEARCH_STRONG_MATCH: 0.8,
  SEARCH_PARTIAL_MATCH: 0.6,
} as const;

/**
 * Research and cascade limits
 */
export const RESEARCH_LIMITS = {
  MAX_CASCADE_DEPTH: 3,
  MAX_RESEARCH_ENTITIES: 100,
  MAX_RELATIONSHIP_DEPTH: 5,
  DEFAULT_RESEARCH_TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * Geographic coordinate precision
 */
export const GEO_PRECISION = {
  COORDINATE_MULTIPLIER: 1000000,
  DECIMAL_PLACES: 6,
} as const;

/**
 * Network analysis constants
 */
export const NETWORK_ANALYSIS = {
  MAX_NETWORK_CONNECTIONS: 10,
  NORMALIZED_OVERLAP_DIVISOR: 10,
  MAX_OVERLAP_SCORE: 1.0,
} as const;

/**
 * Database query limits
 */
export const QUERY_LIMITS = {
  MAX_NODES: 2000,
  MAX_RELATIONSHIPS: 5000,
  MAX_EVIDENCE_ITEMS: 1000,
  DEFAULT_TIMEOUT: 30000,
} as const;

/**
 * Utility functions for common calculations
 */
export const CALCULATIONS = {
  /**
   * Normalize geographic coordinates to 6 decimal places
   */
  normalizeCoordinate: (value: number): number =>
    Math.floor(value * GEO_PRECISION.COORDINATE_MULTIPLIER) /
    GEO_PRECISION.COORDINATE_MULTIPLIER,

  /**
   * Normalize confidence score to 6 decimal places
   */
  normalizeConfidence: (value: number): number =>
    Math.floor(value * GEO_PRECISION.COORDINATE_MULTIPLIER) /
    GEO_PRECISION.COORDINATE_MULTIPLIER,

  /**
   * Calculate network overlap score
   */
  calculateNetworkOverlap: (mutualConnections: number): number =>
    Math.min(
      mutualConnections / NETWORK_ANALYSIS.NORMALIZED_OVERLAP_DIVISOR,
      NETWORK_ANALYSIS.MAX_OVERLAP_SCORE
    ),

  /**
   * Validate pagination parameters with proper limits
   */
  validatePagination: (params: {
    pageSize?: number;
    offset?: number;
    limit?: number;
  }) => {
    const pageSize = Math.min(
      Math.max(
        Math.floor(
          params.pageSize || params.limit || PAGINATION_LIMITS.DEFAULT_PAGE_SIZE
        ),
        PAGINATION_LIMITS.MIN_PAGE_SIZE
      ),
      PAGINATION_LIMITS.MAX_PAGE_SIZE
    );

    const offset = Math.min(
      Math.max(Math.floor(params.offset || 0), 0),
      PAGINATION_LIMITS.MAX_OFFSET
    );

    return { pageSize, offset };
  },
} as const;
