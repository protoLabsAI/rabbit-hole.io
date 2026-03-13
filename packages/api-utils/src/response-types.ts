/**
 * Standardized API Response Types
 *
 * Consolidates response patterns used across all API routes
 */

// ==================== Standard Response Interface ====================

export interface StandardApiResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  errors?: string[];
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  userId?: string;
  processingTimeMs?: number;
  pagination?: PaginationMetadata;
  validation?: ValidationMetadata;
}

export interface PaginationMetadata {
  pageSize: number;
  offset: number;
  hasMore: boolean;
  totalCount?: number;
  cursor?: string;
  maxPageSize: number;
}

export interface ValidationMetadata {
  schemaUsed: string;
  fieldsValidated: number;
  warnings?: string[];
}

// ==================== Specialized Response Types ====================

// ==================== Domain-Specific Types ====================

export interface GraphNode {
  uid: string;
  name: string;
  type: string;
  display: {
    title: string;
    subtitle: string;
    badges?: string[];
  };
  metadata: {
    tags?: string[];
    aliases?: string[];
    position?: { x: number; y: number };
    communityId?: number;
    degree?: number;
  };
  metrics?: {
    speechActs?: {
      hostile: number;
      supportive: number;
      neutral: number;
      total: number;
    };
    degree?: {
      in: number;
      out: number;
      total: number;
    };
    lastActiveAt?: string;
  };
}

export interface GraphEdge {
  uid: string;
  source: string;
  target: string;
  type: string;
  sentiment?: "hostile" | "supportive" | "neutral" | "ambiguous";
  intensity?: "low" | "medium" | "high" | "extreme";
  display: {
    label: string;
    color?: string;
    excerpt?: string;
    timestamp?: string;
  };
  metadata: {
    confidence: number;
    at?: string;
    category?: string;
    notes?: string;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: "intrinsic" | "relationship" | "milestone";
  category: string;
  title: string;
  description?: string;
  relationshipType?: string;
  targetEntity?: {
    uid: string;
    name: string;
    type: string;
  };
  entityProperty?: string;
  isPlaceholder?: boolean;
  properties?: Record<string, unknown>;
  evidence?: Array<{
    uid: string;
    title: string;
    publisher: string;
    url: string;
    reliability: number;
  }>;
  confidence: number;
  importance: "critical" | "major" | "minor";
}

// ==================== Typed Response Interfaces ====================

export type EntityResponse<TEntity = unknown> = StandardApiResponse<{
  entity: TEntity;
  relationshipStats?: {
    total: number;
    incoming: number;
    outgoing: number;
    byType: Record<string, number>;
  };
}>;

export type ListResponse<TItem = unknown> = StandardApiResponse<{
  items: TItem[];
  totalCount: number;
  isEmpty: boolean;
}>;

export type GraphResponse = StandardApiResponse<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    nodeCount: number;
    edgeCount: number;
    schemaVersion: string;
    viewMode?: string;
    bounded?: boolean;
    filters?: Record<string, unknown>;
    pagination?: PaginationMetadata;
    performance?: {
      queryTime?: number;
      batchOptimized?: boolean;
      memoryTargetMB?: number;
    };
  };
}>;

export type TimelineResponse = StandardApiResponse<{
  entity: {
    uid: string;
    name: string;
    type: string;
    dates?: Record<string, string>;
  };
  timeline: TimelineEvent[];
  summary: {
    totalEvents: number;
    dateRange: { earliest: string; latest: string };
    eventCategories: Record<string, number>;
    intrinsicEvents?: number;
    relationshipEvents?: number;
    placeholderEvents?: number;
  };
  filters?: {
    tags?: string[];
    entityTypes?: string[];
    relationshipTypes?: string[];
    dateRange?: { from: string; to: string };
    importance?: string[];
  };
}>;

export type BundleIngestResponse = StandardApiResponse<{
  summary: {
    evidenceCreated: number;
    filesCreated: number;
    contentCreated: number;
    entitiesCreated: number;
    relationshipsCreated: number;
  };
  timing: {
    totalMs: number;
    phaseTimings: Record<string, number>;
  };
}>;

// ==================== Response Builder Utilities ====================

export function createSuccessResponse<T = unknown>(
  data: T,
  metadata?: Partial<ResponseMetadata>
): StandardApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

export function createErrorResponse(
  error: string | string[],
  metadata?: Partial<ResponseMetadata>
): StandardApiResponse {
  const errors = Array.isArray(error) ? error : [error];

  return {
    success: false,
    error: errors[0],
    errors: errors.length > 1 ? errors : undefined,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

export function createValidationErrorResponse(
  validationErrors: string[],
  metadata?: Partial<ResponseMetadata>
): StandardApiResponse {
  return createErrorResponse(
    `Validation failed: ${validationErrors.join("; ")}`,
    {
      ...metadata,
      validation: {
        schemaUsed: "unknown",
        fieldsValidated: 0,
        warnings: validationErrors,
        ...metadata?.validation,
      },
    }
  );
}

export function createEmptyListResponse<T>(
  message: string = "No results found",
  metadata?: Partial<ResponseMetadata>
): ListResponse<T> {
  return createSuccessResponse(
    {
      items: [],
      totalCount: 0,
      isEmpty: true,
      message,
    },
    metadata
  );
}

// ==================== Response Validation Utilities ====================

export function validateResponseData<T>(
  data: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      missingFields.push(String(field));
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
