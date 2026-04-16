/**
 * Zod Validation Schemas for Bulk Import
 *
 * Comprehensive validation to prevent orphaned nodes and ensure data integrity
 *
 * NOTE: Core schemas moved to @protolabsai/types for sharing between client/server
 */

import { z } from "zod";

// Note: All schemas and types are defined locally to avoid conflicts with @protolabsai/types
// This file predates the shared schema migration and uses legacy formats

// Keep validation function here since it's business logic, not just types
// Entity validation schemas - MOVED TO @protolabsai/types
/*
    export const EntitySchema = z.object({
      id: z.string().min(1, "Entity ID is required"),
      type: z.enum([
    'Person', 
    'Organization', 
    'Platform', 
    'Movement', 
    'Event', 
    'Statement', 
    'Media', 
    'LegalCase',
    'Evidence'
  ], {
    errorMap: () => ({ message: "Invalid entity type" })
  }),
  subtype: z.string().optional(),
  name: z.string().min(1, "Entity name is required"),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  bio: z.string().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be in YYYY-MM-DD format").optional(),
  birthPlace: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  politicalParty: z.string().optional(),
  education: z.array(z.string()).optional(),
  netWorth: z.number().optional(),
  residence: z.string().optional(),
  properties: z.record(z.any()).optional()
});
*/

// Relationship validation schemas
export const RelationshipSchema = z.object({
  id: z.string().min(1, "Relationship ID is required"),
  source: z.string().min(1, "Source entity ID is required"),
  target: z.string().min(1, "Target entity ID is required"),
  type: z.enum([
    "AMPLIFIES",
    "ATTACKS",
    "ENDORSES",
    "OWNS",
    "FUNDS",
    "EMPLOYED_BY",
    "FOUNDED",
    "HOLDS_ROLE",
    "PLATFORMS",
    "MARRIED_TO",
    "DIVORCED_FROM",
    "PARENT_OF",
    "CHILD_OF",
    "SIBLING_OF",
    "RELATED_TO",
    "SPEECH_ACT",
    "MENTIONS",
    "INTERVIEWS",
    "MODERATION_ACTION",
    "ACTION_AGAINST",
    "SECURITY_DESIGNATION",
  ]),
  label: z.string().min(1, "Relationship label is required"),
  properties: z.record(z.string(), z.any()).optional(),
  confidence: z
    .number()
    .min(0)
    .max(1, "Confidence must be between 0 and 1")
    .optional(),
  evidence: z.array(z.string()).optional(),
});

// Speech act validation schemas
export const SpeechActSchema = z.object({
  id: z.string().min(1, "Speech act ID is required"),
  speaker_id: z.string().min(1, "Speaker ID is required"),
  platform_id: z.string().optional(),
  category: z.enum([
    "endorsement",
    "symbolic_action",
    "inadvertent_confession",
    "public_accusation",
    "leaked_recording",
    "court_testimony",
    "public_statement",
    "dehumanization",
    "xenophobic_trope",
    "religious_exclusionism",
    "great_replacement_rhetoric",
    "explicit_violence_incitement",
    "menacing_rhetoric",
    "accusation_demonization",
    "delegitimizing_press",
    "militarized_xenophobia",
    "bothsidesing_extremism",
    "conspiracy_promotion",
    "apocalyptic_threat_frame",
    "public_retraction",
  ]),
  sentiment: z
    .enum(["hostile", "supportive", "neutral", "ambiguous"])
    .optional(),
  intensity: z.enum(["low", "medium", "high"]).optional(),
  text_excerpt: z.string().optional(),
  at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
      "Date must be in ISO format (with or without milliseconds)"
    )
    .optional(),
  confidence: z
    .number()
    .min(0)
    .max(1, "Confidence must be between 0 and 1")
    .optional(),
});

// Evidence validation schemas
export const EvidenceSchema = z.object({
  id: z.string().min(1, "Evidence ID is required"),
  title: z.string().min(1, "Evidence title is required"),
  publisher: z.string().min(1, "Evidence publisher is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  url: z.string().url("Must be a valid URL").optional(),
  kind: z
    .enum([
      "research",
      "news_article",
      "government_document",
      "court_filing",
      "social_media",
      "video",
      "audio",
      "photo",
      "witness_testimony",
    ])
    .optional(),
  reliability: z
    .number()
    .min(0)
    .max(1, "Reliability must be between 0 and 1")
    .optional(),
});

// Main bulk import schema - simplified for local use
export const BulkImportSchema = z.object({
  entities: z.array(z.any()).optional().default([]),
  relationships: z.array(z.any()).optional().default([]),
  speech_acts: z.array(z.any()).optional().default([]),
  evidence: z.array(z.any()).optional().default([]),
});

// Validation result types
export interface ValidationError {
  type: "validation" | "orphaned_node" | "missing_reference";
  message: string;
  field?: string;
  itemId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: z.infer<typeof BulkImportSchema>;
}

/**
 * Comprehensive validation function that checks:
 * 1. Schema compliance
 * 2. Reference integrity
 * 3. Orphaned node detection
 */
export function validateBulkImport(data: unknown): ValidationResult {
  // First, validate the schema
  const schemaResult = BulkImportSchema.safeParse(data);

  if (!schemaResult.success) {
    return {
      isValid: false,
      errors: schemaResult.error.issues.map((err) => ({
        type: "validation",
        message: err.message,
        field: err.path.join("."),
      })),
    };
  }

  const validatedData = schemaResult.data;
  const errors: ValidationError[] = [];

  // Create sets of all entity IDs for reference checking
  const entityIds = new Set(validatedData.entities.map((e) => e.id));
  const allReferencedIds = new Set<string>();

  // Validate relationship references
  for (const relationship of validatedData.relationships) {
    // Check if source entity exists
    if (!entityIds.has(relationship.source)) {
      errors.push({
        type: "missing_reference",
        message: `Relationship "${relationship.id}" references non-existent source entity "${relationship.source}"`,
        itemId: relationship.id,
      });
    } else {
      allReferencedIds.add(relationship.source);
    }

    // Check if target entity exists
    if (!entityIds.has(relationship.target)) {
      errors.push({
        type: "missing_reference",
        message: `Relationship "${relationship.id}" references non-existent target entity "${relationship.target}"`,
        itemId: relationship.id,
      });
    } else {
      allReferencedIds.add(relationship.target);
    }
  }

  // Validate speech act references
  for (const speechAct of validatedData.speech_acts) {
    // Check if speaker exists
    if (!entityIds.has(speechAct.speaker_id)) {
      errors.push({
        type: "missing_reference",
        message: `Speech act "${speechAct.id}" references non-existent speaker "${speechAct.speaker_id}"`,
        itemId: speechAct.id,
      });
    } else {
      allReferencedIds.add(speechAct.speaker_id);
    }

    // Check if platform exists (if specified)
    if (speechAct.platform_id) {
      if (!entityIds.has(speechAct.platform_id)) {
        errors.push({
          type: "missing_reference",
          message: `Speech act "${speechAct.id}" references non-existent platform "${speechAct.platform_id}"`,
          itemId: speechAct.id,
        });
      } else {
        allReferencedIds.add(speechAct.platform_id);
      }
    }
  }

  // Check for orphaned entities (entities with no relationships)
  const orphanedEntities = validatedData.entities.filter(
    (entity) => !allReferencedIds.has(entity.id)
  );

  // Only warn about orphaned entities if we have relationships but some entities are orphaned
  if (validatedData.relationships.length > 0 && orphanedEntities.length > 0) {
    for (const orphan of orphanedEntities) {
      errors.push({
        type: "orphaned_node",
        message: `Entity "${orphan.name}" (${orphan.id}) has no relationships and will appear as an isolated node`,
        itemId: orphan.id,
      });
    }
  }

  // Additional business logic validations

  // Check for family relationship consistency
  const marriageRelationships = validatedData.relationships.filter(
    (r) => r.type === "MARRIED_TO"
  );
  const marriagePairs = new Set<string>();

  for (const marriage of marriageRelationships) {
    const pair = [marriage.source, marriage.target].sort().join("-");
    if (marriagePairs.has(pair)) {
      errors.push({
        type: "validation",
        message: `Duplicate marriage relationship between ${marriage.source} and ${marriage.target}`,
        itemId: marriage.id,
      });
    }
    marriagePairs.add(pair);
  }

  // Check for self-referential relationships (except for valid cases)
  const validSelfRefs = new Set(["CHILD_OF", "PARENT_OF", "SIBLING_OF"]);
  for (const relationship of validatedData.relationships) {
    if (
      relationship.source === relationship.target &&
      !validSelfRefs.has(relationship.type)
    ) {
      errors.push({
        type: "validation",
        message: `Self-referential relationship "${relationship.type}" not allowed for entity ${relationship.source}`,
        itemId: relationship.id,
      });
    }
  }

  return {
    isValid: errors.filter((e) => e.type !== "orphaned_node").length === 0, // Warnings don't fail validation
    errors,
    data: validatedData,
  };
}

/**
 * Helper function to format validation errors for API responses
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.errors.map((error) => {
    switch (error.type) {
      case "validation":
        return `Validation Error${error.field ? ` (${error.field})` : ""}: ${error.message}`;
      case "missing_reference":
        return `Reference Error: ${error.message}`;
      case "orphaned_node":
        return `Warning: ${error.message}`;
      default:
        return error.message;
    }
  });
}
