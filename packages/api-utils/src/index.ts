/**
 * @protolabsai/api-utils - Consolidated API Utilities
 *
 * Simple, working utilities without complex generics
 */

// ==================== Auth Utilities ====================
export {
  withAuth,
  withAuthAndLogging,
  type AuthenticatedUser,
} from "@protolabsai/auth";

// ==================== Response Types ====================
export {
  type StandardApiResponse,
  type ResponseMetadata,
  type PaginationMetadata,
  type ValidationMetadata,
  type GraphNode,
  type GraphEdge,
  type TimelineEvent,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createEmptyListResponse,
  validateResponseData,
} from "./response-types";

// ==================== Pagination Utilities ====================
export {
  PAGINATION_LIMITS,
  PaginationParamsSchema,
  DateRangeSchema,
  SearchParamsSchema,
  StandardQueryParamsSchema,
  type PaginationParams,
  type DateRangeParams,
  type SearchParams,
  type StandardQueryParams,
  type ValidatedPaginationParams,
  type PaginationResult,
  validatePaginationParams,
  validateDateRange,
  parseStandardQueryParams,
  toNeo4jPagination,
  createPaginatedResponse,
  generateCursor,
  parseCursor,
} from "./pagination-utils";

// ==================== Common Schemas ====================
export {
  RabbitHoleBundleSchema,
  EntitySchema,
  RelationshipSchema,
  EvidenceSchema,
  validateRabbitHoleBundle,
  type RabbitHoleBundleData,
  type Entity,
  type Relationship,
  type Evidence,
} from "@protolabsai/types";

// ==================== Response Patterns ====================

export const ResponsePatterns = {
  entityNotFound: (entityId: string) => ({
    success: false,
    error: `Entity ${entityId} not found`,
    metadata: { timestamp: new Date().toISOString() },
  }),

  authRequired: (action: string) => ({
    success: false,
    error: `Authentication required to ${action}`,
    metadata: { timestamp: new Date().toISOString() },
  }),

  validationFailed: (errors: string[]) => ({
    success: false,
    error: `Validation failed: ${errors.join("; ")}`,
    errors: errors.length > 1 ? errors : undefined,
    metadata: { timestamp: new Date().toISOString() },
  }),

  emptyResults: <T = unknown>(context: string) => ({
    success: true,
    data: {
      items: [] as T[],
      totalCount: 0,
      isEmpty: true,
      message: `No ${context} found`,
    },
    metadata: { timestamp: new Date().toISOString() },
  }),

  serverError: (error: Error | string) => ({
    success: false,
    error: error instanceof Error ? error.message : error,
    metadata: { timestamp: new Date().toISOString() },
  }),
};

// ==================== Validation Helpers ====================

export const ValidationHelpers = {
  isValidUID: (uid: string, expectedPrefix?: string): boolean => {
    if (!uid || typeof uid !== "string") return false;
    if (expectedPrefix) {
      return uid.startsWith(`${expectedPrefix}:`);
    }
    return /^[a-z_]+:[a-zA-Z0-9_-]+$/.test(uid);
  },

  isValidDate: (dateString: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  },

  isValidURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidEntityType: (type: string): boolean => {
    const validTypes = [
      "Person",
      "Organization",
      "Platform",
      "Movement",
      "Event",
      "Media",
    ];
    return validTypes.includes(type);
  },
};
