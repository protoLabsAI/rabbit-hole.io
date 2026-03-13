/**
 * Consolidated Pagination Utilities
 *
 * Standardizes pagination handling across all API routes
 */

import { z } from "zod";

// ==================== Pagination Constants ====================

export const PAGINATION_LIMITS = {
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_OFFSET: 100000,
  // Route-specific limits
  GRAPH_MAX_NODES: 5000,
  TIMELINE_MAX_EVENTS: 200,
  SEARCH_MAX_RESULTS: 100,
} as const;

// ==================== Pagination Schemas ====================

export const PaginationParamsSchema = z.object({
  pageSize: z
    .number()
    .int()
    .min(PAGINATION_LIMITS.MIN_PAGE_SIZE)
    .max(PAGINATION_LIMITS.MAX_PAGE_SIZE)
    .optional(),
  offset: z.number().int().min(0).max(PAGINATION_LIMITS.MAX_OFFSET).optional(),
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(PAGINATION_LIMITS.MIN_PAGE_SIZE)
    .max(PAGINATION_LIMITS.MAX_PAGE_SIZE)
    .optional(),
});

export const DateRangeSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

export const SearchParamsSchema = z.object({
  query: z.string().min(2).max(100).optional(),
  entityTypes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// Combined schema for common query patterns
export const StandardQueryParamsSchema =
  PaginationParamsSchema.merge(DateRangeSchema).merge(SearchParamsSchema);

// ==================== Type Definitions ====================

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type DateRangeParams = z.infer<typeof DateRangeSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type StandardQueryParams = z.infer<typeof StandardQueryParamsSchema>;

export interface ValidatedPaginationParams {
  pageSize: number;
  offset: number;
  cursor?: string;
  limit: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    pageSize: number;
    offset: number;
    hasMore: boolean;
    totalCount?: number;
    cursor?: string;
    nextCursor?: string;
  };
}

// ==================== Validation Functions ====================

/**
 * Validates and normalizes pagination parameters with Neo4j compliance
 */
export function validatePaginationParams(params: {
  pageSize?: number | string;
  offset?: number | string;
  limit?: number | string;
  cursor?: string;
}): ValidatedPaginationParams {
  // Convert string parameters to numbers
  const pageSize = Math.floor(
    Number(params.pageSize) || PAGINATION_LIMITS.DEFAULT_PAGE_SIZE
  );
  const offset = Math.floor(Number(params.offset) || 0);
  const limit = Math.floor(Number(params.limit) || pageSize);

  // Apply boundaries
  const validatedPageSize = Math.min(
    Math.max(pageSize, PAGINATION_LIMITS.MIN_PAGE_SIZE),
    PAGINATION_LIMITS.MAX_PAGE_SIZE
  );

  const validatedOffset = Math.min(
    Math.max(offset, 0),
    PAGINATION_LIMITS.MAX_OFFSET
  );

  const validatedLimit = Math.min(
    Math.max(limit, PAGINATION_LIMITS.MIN_PAGE_SIZE),
    PAGINATION_LIMITS.MAX_PAGE_SIZE
  );

  return {
    pageSize: validatedPageSize,
    offset: validatedOffset,
    limit: validatedLimit,
    cursor: params.cursor,
  };
}

/**
 * Validates date range parameters
 */
export function validateDateRange(params: { from?: string; to?: string }): {
  from?: Date;
  to?: Date;
  errors: string[];
} {
  const errors: string[] = [];
  let from: Date | undefined;
  let to: Date | undefined;

  if (params.from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
      errors.push("'from' date must be in YYYY-MM-DD format");
    } else {
      from = new Date(params.from);
      if (isNaN(from.getTime())) {
        errors.push("'from' date is invalid");
      }
    }
  }

  if (params.to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
      errors.push("'to' date must be in YYYY-MM-DD format");
    } else {
      to = new Date(params.to);
      if (isNaN(to.getTime())) {
        errors.push("'to' date is invalid");
      }
    }
  }

  // Validate date range logic
  if (from && to && from > to) {
    errors.push("'from' date must be before 'to' date");
  }

  return { from, to, errors };
}

/**
 * Parses URL search params into validated pagination + filters
 */
export function parseStandardQueryParams(searchParams: URLSearchParams): {
  pagination: ValidatedPaginationParams;
  dateRange: { from?: Date; to?: Date };
  filters: {
    entityTypes?: string[];
    tags?: string[];
    query?: string;
  };
  errors: string[];
} {
  const errors: string[] = [];

  // Parse pagination
  const pagination = validatePaginationParams({
    pageSize: searchParams.get("pageSize") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });

  // Parse date range
  const {
    from,
    to,
    errors: dateErrors,
  } = validateDateRange({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  errors.push(...dateErrors);

  // Parse filters
  const filters = {
    entityTypes: searchParams.get("entityTypes")?.split(",").filter(Boolean),
    tags: searchParams.get("tags")?.split(",").filter(Boolean),
    query: searchParams.get("query") ?? undefined,
  };

  // Validate query length
  if (
    filters.query &&
    (filters.query.length < 2 || filters.query.length > 100)
  ) {
    errors.push("Query must be between 2 and 100 characters");
  }

  return {
    pagination,
    dateRange: { from, to },
    filters,
    errors,
  };
}

// ==================== Neo4j Integration Utilities ====================

/**
 * Converts pagination params to Neo4j-safe integers
 */
export async function toNeo4jPagination(params: ValidatedPaginationParams) {
  // Dynamic import to avoid dependency issues
  try {
    const neo4j = await import("neo4j-driver");
    return {
      pageSize: neo4j.int(params.pageSize),
      offset: neo4j.int(params.offset),
      limit: neo4j.int(params.limit),
    };
  } catch {
    // Fallback if neo4j-driver not available
    return {
      pageSize: Math.floor(params.pageSize),
      offset: Math.floor(params.offset),
      limit: Math.floor(params.limit),
    };
  }
}

// ==================== Response Builders ====================

/**
 * Creates a paginated response with proper metadata
 */
export function createPaginatedResponse<T>(
  items: T[],
  pagination: ValidatedPaginationParams,
  totalCount?: number,
  nextCursor?: string
): PaginationResult<T> {
  const hasMore = totalCount
    ? pagination.offset + items.length < totalCount
    : items.length === pagination.pageSize;

  return {
    items,
    pagination: {
      pageSize: pagination.pageSize,
      offset: pagination.offset,
      hasMore,
      totalCount,
      cursor: pagination.cursor,
      nextCursor,
    },
  };
}

/**
 * Generates cursor for cursor-based pagination
 */
export function generateCursor(timestamp: string | Date, id: string): string {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  return Buffer.from(`${ts}_${id}`).toString("base64");
}

/**
 * Parses cursor for cursor-based pagination
 */
export function parseCursor(
  cursor: string
): { timestamp: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString();
    const [timestamp, id] = decoded.split("_");
    return timestamp && id ? { timestamp, id } : null;
  } catch {
    return null;
  }
}
