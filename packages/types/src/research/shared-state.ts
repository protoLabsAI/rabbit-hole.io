/**
 * Research Agent Shared State Types
 *
 * Defines interfaces for CopilotKit shared state integration
 * between the research agent and frontend application
 */

import { z } from "zod";
// TODO: Import proper types once they are available
// import type { Entity, Relationship, Evidence } from "../domains/core";

// Research session metadata
export const ResearchSessionSchema = z.object({
  sessionId: z.string(),
  sessionName: z.string(),
  createdAt: z.string().datetime(),
  lastUpdated: z.string().datetime(),
  description: z.string().optional(),
});

export type ResearchSession = z.infer<typeof ResearchSessionSchema>;

// Research progress state
export const ResearchProgressSchema = z.object({
  isResearching: z.boolean(),
  currentTarget: z.string().nullable(),
  researchQueue: z.array(z.string()),
  discoveredEntityCount: z.number(),
  discoveredRelationshipCount: z.number(),
  researchDepth: z
    .enum(["basic", "detailed", "comprehensive"])
    .default("detailed"),
});

export type ResearchProgress = z.infer<typeof ResearchProgressSchema>;

// Graph visualization preferences
export const ViewSettingsSchema = z.object({
  viewMode: z.enum(["ego", "full", "community"]).default("full"),
  selectedEntity: z.string().nullable(),
  layout: z.enum(["force", "breadthfirst", "atlas"]).default("atlas"),
  showLabels: z.boolean().default(true),
  highlightConnections: z.boolean().default(true),
});

export type ViewSettings = z.infer<typeof ViewSettingsSchema>;

// Main shared state interface
export const ResearchSharedStateSchema = z.object({
  // Session metadata
  session: ResearchSessionSchema,

  // Research progress
  progress: ResearchProgressSchema,

  // In-memory graph data (will be populated by agent)
  entities: z.array(z.any()), // TODO: Use proper Entity schema when available
  relationships: z.array(z.any()), // TODO: Use proper Relationship schema when available
  evidence: z.array(z.any()), // TODO: Use proper Evidence schema when available

  // Graph visualization state
  viewSettings: ViewSettingsSchema,

  // Research configuration
  researchConfig: z.object({
    maxEntities: z.number().default(100),
    maxRelationships: z.number().default(200),
    autoSave: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
  }),
});

export type ResearchSharedState = z.infer<typeof ResearchSharedStateSchema>;

// Agent-specific state for internal use
export const ResearchAgentStateSchema = z.object({
  // Input context
  targetEntityName: z.string(),
  entityType: z.string().optional(),

  // Existing context for relationship detection
  existingEntities: z.array(z.any()),
  existingRelationships: z.array(z.any()),

  // Research state
  researchSources: z.array(z.string()),
  researchNotes: z.string(),
  confidenceLevel: z.number().min(0).max(1),

  // Output state
  discoveredEntities: z.array(z.any()),
  discoveredRelationships: z.array(z.any()),
  collectedEvidence: z.array(z.any()),

  // Summary and analysis
  researchSummary: z.string(),
  dataGaps: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
});

export type ResearchAgentState = z.infer<typeof ResearchAgentStateSchema>;

// Schemas and types are exported inline above
