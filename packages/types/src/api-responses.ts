/**
 * Standardized API Response Types
 *
 * Common response interfaces used across all API endpoints
 * to ensure consistency and reduce duplicate type definitions.
 */

/**
 * Base API response structure
 *
 * All API responses should follow this pattern for consistency.
 */
export interface BaseApiResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Response timestamp */
  timestamp?: string;
  /** API version */
  apiVersion?: string;
}

/**
 * Standard API response with typed data
 *
 * @template T The type of data returned on success
 */
export interface StandardApiResponse<T = any> extends BaseApiResponse {
  /** Response data on success */
  data?: T;
}

/**
 * Paginated response structure
 *
 * For endpoints that return paginated data.
 */
export interface PaginationInfo {
  /** Current page size */
  pageSize: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** Cursor for next page (if using cursor pagination) */
  cursor?: string;
  /** Total estimated count (if available) */
  totalEstimate?: number;
  /** Current offset (if using offset pagination) */
  offset?: number;
  /** Maximum allowed page size */
  maxPageSize?: number;
}

/**
 * Paginated API response
 *
 * @template T The type of data items returned
 */
export interface PaginatedResponse<T = any> extends StandardApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationInfo;
}

/**
 * Entity response structure
 *
 * Standard structure for entity-related endpoints.
 */
export interface EntityResponse<T = any> extends StandardApiResponse {
  data?: {
    /** The entity data */
    entity: T;
    /** Entity metadata */
    metadata?: {
      type: string;
      uid: string;
      lastUpdated?: string;
      confidence?: number;
    };
  };
}

/**
 * Search response structure
 *
 * Standard structure for search endpoints with results and metadata.
 */
export interface SearchResponse<T = any> extends StandardApiResponse {
  data?: {
    /** Search results */
    results: T[];
    /** Total matching results (if available) */
    totalResults?: number;
    /** Search query executed */
    query: string;
    /** Search execution time in ms */
    searchTime?: number;
    /** Debug information */
    debug?: {
      searchQuery: string;
      totalEntitiesChecked?: number;
      matchingResults?: number;
    };
  };
}

/**
 * Analysis response structure
 *
 * For endpoints that perform analysis and return insights.
 */
export interface AnalysisResponse<T = any> extends StandardApiResponse {
  data?: {
    /** Analysis results */
    analysis: T;
    /** Summary statistics */
    summary?: {
      totalItems?: number;
      processingTime?: number;
      confidenceScore?: number;
      completenessScore?: number;
    };
    /** Metadata about the analysis */
    metadata?: {
      analysisType: string;
      version: string;
      parameters?: Record<string, any>;
    };
  };
}

/**
 * Timeline response structure
 *
 * For timeline-related endpoints.
 */
export interface TimelineResponse<T = any> extends StandardApiResponse {
  data?: {
    /** Entity information */
    entity: {
      uid: string;
      name: string;
      type: string;
      dates?: Record<string, string>;
    };
    /** Timeline events */
    timeline: T[];
    /** Timeline summary */
    summary: {
      totalEvents: number;
      dateRange?: { earliest: string; latest: string };
      eventCategories?: Record<string, number>;
      [key: string]: any;
    };
    /** Applied filters */
    filters?: Record<string, any>;
  };
}

/**
 * File operation response structure
 *
 * For file upload, processing, and management endpoints.
 */
export interface FileOperationResponse<T = any> extends StandardApiResponse {
  data?: {
    /** File information */
    file?: {
      uid: string;
      filename?: string;
      size?: number;
      mediaType?: string;
      contentHash?: string;
      status?: string;
    };
    /** Operation-specific data */
    operation?: T;
    /** Processing queue information */
    derivationQueue?: string[];
  };
}

/**
 * Mutation response structure
 *
 * For endpoints that modify data (create, update, delete).
 */
export interface MutationResponse<T = any> extends StandardApiResponse {
  data?: {
    /** The modified resource */
    result: T;
    /** Operation details */
    operation: {
      type: "create" | "update" | "delete" | "merge";
      affectedCount?: number;
      previousState?: any;
      newState?: any;
    };
    /** Backend information */
    backend?: "neo4j" | "partitions";
    /** Test session info (for testing) */
    testSession?: string;
  };
}

/**
 * Health check response structure
 *
 * For system health and status endpoints.
 */
export interface HealthCheckResponse extends StandardApiResponse {
  data?: {
    /** Service status */
    status: "healthy" | "degraded" | "unhealthy";
    /** Individual service checks */
    services: Record<
      string,
      {
        status: "up" | "down" | "degraded";
        responseTime?: number;
        error?: string;
        metadata?: any;
      }
    >;
    /** System information */
    system?: {
      uptime: number;
      version: string;
      environment: string;
    };
  };
}

/**
 * Generic list response
 *
 * For simple list endpoints without pagination.
 */
export interface ListResponse<T = any> extends StandardApiResponse<T[]> {
  data?: T[] & {
    /** List metadata */
    metadata?: {
      totalCount: number;
      itemType: string;
      lastUpdated?: string;
    };
  };
}

/**
 * Research response structure
 *
 * For AI research and analysis endpoints.
 */
export interface ResearchResponse<T = any> extends StandardApiResponse {
  data?: {
    /** Research results */
    research: T;
    /** Research metadata */
    metadata: {
      researchMethod: string;
      confidenceScore: number;
      processingTime: number;
      dataGaps?: string[];
      sources?: string[];
    };
    /** Summary of findings */
    summary?: {
      entitiesGenerated?: number;
      relationshipsDiscovered?: number;
      evidenceSourcesUsed?: number;
      completenessScore?: number;
    };
  };
}

/**
 * Type guards for response validation
 */
export function isStandardResponse<T>(obj: any): obj is StandardApiResponse<T> {
  return typeof obj === "object" && typeof obj.success === "boolean";
}

export function isPaginatedResponse<T>(obj: any): obj is PaginatedResponse<T> {
  return (
    isStandardResponse(obj) &&
    typeof obj === "object" &&
    "pagination" in obj &&
    typeof obj.pagination === "object"
  );
}

export function isErrorResponse(
  obj: any
): obj is BaseApiResponse & { success: false; error: string } {
  return (
    isStandardResponse(obj) &&
    obj.success === false &&
    typeof obj.error === "string"
  );
}
