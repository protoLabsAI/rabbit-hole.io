/**
 * Evidence, Content, and File Schemas - Core Domain
 *
 * Validation schemas for evidence, content, and file attachments.
 */

import { z } from "zod";

// ==================== Evidence Schemas ====================

export const EvidenceKindEnum = z.enum([
  "government",
  "court",
  "major_media",
  "research",
  "social",
  "platform_log",
]);

const evidenceUidValidator = z
  .string()
  .min(1, "Evidence UID is required")
  .refine((uid) => uid.startsWith("evidence:"), {
    message:
      "Evidence UIDs must use format 'evidence:identifier' (colon required)",
  });

export const EvidenceSchema = z.object({
  uid: evidenceUidValidator,
  kind: EvidenceKindEnum,
  title: z.string().min(1, "Evidence title is required"),
  publisher: z.string().min(1, "Evidence publisher is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  url: z.string().url("Must be a valid URL"),
  archive: z.array(z.string().url()).optional(),
  retrieved_at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
      "Must be ISO datetime"
    )
    .optional(),
  reliability: z
    .number()
    .min(0)
    .max(1, "Reliability must be between 0 and 1")
    .optional(),
  notes: z.string().optional(),
});

// ==================== File Schemas ====================

const fileUidValidator = z
  .string()
  .min(1, "File UID is required")
  .refine((uid) => uid.startsWith("file:"), {
    message: "File UIDs must use format 'file:identifier' (colon required)",
  });

export const FileSchema = z.object({
  uid: fileUidValidator,
  content_hash: z
    .string()
    .regex(/^sha256-[a-f0-9]{64}$/, "Must be valid SHA256 hash"),
  mime: z.string().min(1, "MIME type is required"),
  bytes: z.number().min(0).optional(),
  bucket: z.string().min(1, "Bucket name is required"),
  key: z.string().min(1, "Object key is required"),
  aliases: z.array(z.string()).optional(),
});

// ==================== Content Schemas ====================

export const ContentTypeEnum = z.enum([
  "post",
  "video",
  "article",
  "pdf",
  "audio",
  "image",
  "speech",
  "transcript",
  "document",
  "podcast",
  "broadcast",
]);

const contentUidValidator = z
  .string()
  .min(1, "Content UID is required")
  .refine((uid) => uid.startsWith("content:"), {
    message:
      "Content UIDs must use format 'content:identifier' (colon required)",
  });

export const ContentSchema = z.object({
  uid: contentUidValidator,
  content_type: ContentTypeEnum,
  platform_uid: z.string().optional(),
  author_uid: z.string().optional(),
  published_at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
      "Must be ISO datetime"
    ),
  url: z.string().url().optional(),
  text_excerpt: z.string().optional(),
});

// ==================== Type Exports ====================

export type EvidenceKind = z.infer<typeof EvidenceKindEnum>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type File = z.infer<typeof FileSchema>;
export type ContentType = z.infer<typeof ContentTypeEnum>;
export type Content = z.infer<typeof ContentSchema>;
