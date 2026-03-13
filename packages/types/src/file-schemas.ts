/**
 * File Upload and Processing Validation Schemas
 *
 * Zod schemas for file upload workflow, processing states, and entity validation.
 */

import { z } from "zod";

// ==================== File Processing State ====================

export const FileProcessingStateEnum = z.enum([
  "unprocessed",
  "queued",
  "processing",
  "processed",
  "failed",
]);

export type FileProcessingState = z.infer<typeof FileProcessingStateEnum>;

// ==================== File Metadata Schemas ====================

export const FileMetadataSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  originalFilename: z.string().min(1, "Original filename is required"),
  size: z
    .number()
    .min(0, "File size must be non-negative")
    .max(100 * 1024 * 1024, "File size exceeds 100MB limit"),
  sizeFormatted: z.string().min(1, "Formatted size is required"),
  mediaType: z
    .string()
    .min(1, "Media type is required")
    .regex(
      /^[a-zA-Z]+\/[a-zA-Z0-9][a-zA-Z0-9\!#\$&\-\^_]*$/,
      "Invalid MIME type format"
    ),
  suggestedEntityId: z
    .string()
    .min(1, "Suggested entity ID is required")
    .regex(/^file:/, "Entity ID must start with 'file:' prefix"),
  contentHash: z
    .string()
    .optional()
    .refine((hash) => !hash || hash.startsWith("sha256-"), {
      message: "Content hash must start with 'sha256-' prefix",
    }),
  isValid: z.boolean(),
  validationErrors: z.array(z.string()),
  lastModified: z.date().optional(),
  extractedText: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// ==================== File Upload API Schemas ====================

export const SignPutRequestSchema = z.object({
  contentHash: z
    .string()
    .min(1, "Content hash is required")
    .startsWith("sha256-", "Content hash must be SHA256"),
  mediaType: z.string().min(1, "Media type is required"),
  filename: z.string().optional(),
  sourceUrl: z.string().optional(),
  fileSize: z.number().positive("File size must be positive"),
  workspaceId: z.string().min(1, "Workspace ID required"),
});

export const SignPutResponseDataSchema = z.object({
  uploadUrl: z.string().url("Upload URL must be valid"),
  tempKey: z
    .string()
    .min(1, "Temp key is required")
    .startsWith("temp/", "Temp key must start with 'temp/'"),
  uploadId: z.string().uuid("Upload ID must be a valid UUID"),
  expiresAt: z.string().datetime("Expires at must be a valid ISO datetime"),
  requiredHeaders: z.record(z.string(), z.string()).optional(),
});

export const PromoteRequestSchema = z.object({
  tempKey: z
    .string()
    .min(1, "Temp key is required")
    .startsWith("temp/", "Temp key must start with 'temp/'"),
  expectedHash: z
    .string()
    .min(1, "Expected hash is required")
    .startsWith("sha256-", "Expected hash must be SHA256"),
  originalFilename: z.string().optional(),
  sourceUrl: z.string().optional(),
  capturedAt: z
    .string()
    .datetime("Captured at must be a valid ISO datetime")
    .optional(),
});

export const PromoteResponseDataSchema = z.object({
  canonicalKey: z.string().min(1, "Canonical key is required"),
  aliases: z.array(z.string()),
  derivations: z.array(z.string()),
  ownership: z.object({
    uploadedBy: z.string().min(1),
    workspaceId: z.string().min(1),
    orgId: z.string(),
  }),
});

// ==================== File Entity Schemas ====================

export const FileEntitySchema = z.object({
  uid: z
    .string()
    .min(1, "File UID is required")
    .startsWith("file:", "File UID must start with 'file:' prefix"),
  name: z.string().min(1, "File name is required"),
  size: z.number().min(0, "File size must be non-negative"),
  mediaType: z.string().min(1, "Media type is required"),
  contentHash: z
    .string()
    .min(1, "Content hash is required")
    .startsWith("sha256-", "Content hash must be SHA256"),
  canonicalKey: z.string().min(1, "Canonical key is required"),
  aliases: z.array(z.string()),
  processingState: FileProcessingStateEnum,
  queuedAt: z.string().datetime().optional(),
  processedAt: z.string().datetime().optional(),
  processingError: z.string().optional(),
  uploadedAt: z.string().datetime("Uploaded at must be a valid ISO datetime"),
  uploadId: z.string().uuid("Upload ID must be a valid UUID"),
});

export type FileEntity = z.infer<typeof FileEntitySchema>;

// ==================== Processing State Update Schema ====================

export const ProcessingStateUpdateSchema = z.object({
  fileUid: z
    .string()
    .min(1, "File UID is required")
    .startsWith("file:", "File UID must start with 'file:' prefix"),
  processingState: FileProcessingStateEnum,
  processingError: z.string().optional(),
  extractedData: z
    .object({
      text: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export type ProcessingStateUpdate = z.infer<typeof ProcessingStateUpdateSchema>;

// ==================== File Upload Result Schema ====================

export const FileUploadResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      fileEntity: FileEntitySchema,
      uploadId: z.string().uuid("Upload ID must be a valid UUID"),
    })
    .optional(),
  error: z.string().optional(),
});

export type FileUploadResult = z.infer<typeof FileUploadResultSchema>;

// ==================== Atlas CRUD File Entity Schema ====================

export const AtlasCrudFileEntityDataSchema = z.object({
  id: z
    .string()
    .min(1, "Entity ID is required")
    .startsWith("file:", "File entity ID must start with 'file:' prefix"),
  label: z.string().min(1, "Entity label is required"),
  entityType: z.literal("file"),
  tags: z.array(z.string()).default([]),
  aka: z.array(z.string()).optional(),
  // File-specific properties
  size: z.number().min(0).optional(),
  mediaType: z.string().optional(),
  contentHash: z.string().startsWith("sha256-").optional(),
  canonicalKey: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  uploadId: z.string().uuid().optional(),
  uploadedAt: z.string().datetime().optional(),
  processingState: FileProcessingStateEnum.optional(),
  queuedAt: z.string().datetime().optional(),
  processedAt: z.string().datetime().optional(),
  processingError: z.string().optional(),
  // Ownership and access control
  uploadedBy: z.string().min(1, "User ID required"),
  workspaceId: z.string().min(1, "Workspace ID required"),
  orgId: z.string(),
  accessLevel: z
    .enum(["private", "workspace", "org", "public"])
    .default("workspace"),
});

export type AtlasCrudFileEntityData = z.infer<
  typeof AtlasCrudFileEntityDataSchema
>;

// ==================== File-Entity Relationship Schemas ====================

export const FileEntityRelationshipSchema = z.object({
  id: z.string().optional(),
  fileUid: z
    .string()
    .min(1, "File UID is required")
    .startsWith("file:", "File UID must start with 'file:' prefix"),
  entityUid: z.string().min(1, "Entity UID is required"),
  relationshipType: z.enum([
    "DOCUMENTS",
    "EVIDENCES",
    "SUPPORTS",
    "REFERENCES",
    "AUTHORED_BY",
    "PUBLISHED_BY",
    "MENTIONS",
    "CONTAINS",
  ]),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  notes: z.string().optional(),
});

export type FileEntityRelationship = z.infer<
  typeof FileEntityRelationshipSchema
>;

export const CreateFileEntityRelationshipSchema = z.object({
  relationships: z
    .array(FileEntityRelationshipSchema)
    .min(1, "At least one relationship is required"),
});

export type CreateFileEntityRelationshipRequest = z.infer<
  typeof CreateFileEntityRelationshipSchema
>;

export const FileEntityLinkingResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      relationshipsCreated: z.number(),
      relationships: z.array(
        z.object({
          id: z.string(),
          fileUid: z.string(),
          entityUid: z.string(),
          relationshipType: z.string(),
          label: z.string().optional(),
        })
      ),
    })
    .optional(),
  error: z.string().optional(),
});

export type FileEntityLinkingResult = z.infer<
  typeof FileEntityLinkingResultSchema
>;

// ==================== Validation Utilities ====================

/**
 * Validate file processing metadata
 */
export function validateFileMetadata(data: unknown): FileMetadata {
  return FileMetadataSchema.parse(data);
}

/**
 * Validate file entity data for atlas-crud
 */
export function validateAtlasCrudFileEntity(
  data: unknown
): AtlasCrudFileEntityData {
  return AtlasCrudFileEntityDataSchema.parse(data);
}

/**
 * Validate processing state update
 */
export function validateProcessingStateUpdate(
  data: unknown
): ProcessingStateUpdate {
  return ProcessingStateUpdateSchema.parse(data);
}

/**
 * Safe validation with error handling
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      issues: z.ZodIssue[];
    } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; "),
    issues: result.error.issues,
  };
}
