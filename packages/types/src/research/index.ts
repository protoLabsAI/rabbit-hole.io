/**
 * Research Types - Index Exports
 *
 * Centralized exports for research-related types and schemas
 */

// Shared state types for CopilotKit integration
export type {
  ResearchSession,
  ResearchProgress,
  ViewSettings,
  ResearchSharedState,
  ResearchAgentState,
} from "./shared-state";

export {
  ResearchSessionSchema,
  ResearchProgressSchema,
  ViewSettingsSchema,
  ResearchSharedStateSchema,
  ResearchAgentStateSchema,
} from "./shared-state";

// Research settings and URL state schemas
export type {
  ResearchSettings,
  TimeWindow,
  UIPreferences,
  ResearchPageState,
  ResearchSettingsUpdate,
} from "./settings.schema";

export {
  ResearchSettingsSchema,
  TimeWindowSchema,
  UIPreferencesSchema,
  ResearchPageStateSchema,
  ResearchSettingsUpdateSchema,
  validateResearchSettings,
  validateResearchSettingsPartial,
  SENTIMENT_OPTIONS,
  HOPS_OPTIONS,
  ENTITY_TYPE_OPTIONS,
} from "./settings.schema";

// Research session configuration
export type {
  ResearchSessionConfig,
  ResearchDepth,
} from "./session-config";

export { DEFAULT_RESEARCH_SESSION_CONFIG } from "./session-config";

// Partial bundle for progressive streaming
export type {
  PartialBundle,
  ResearchPhase,
} from "./partial-bundle";

export {
  PartialBundleSchema,
  ResearchPhaseSchema,
  createEmptyPartialBundle,
  mergePartialBundle,
} from "./partial-bundle";
