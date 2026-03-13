/**
 * Atlas Types - Index Exports
 *
 * Centralized exports for Atlas-related types and schemas
 */

// Atlas settings and URL state schemas (namespaced exports to avoid conflicts)
export type {
  ViewMode as AtlasViewMode,
  EgoSettings as AtlasEgoSettings,
  TimeWindow as AtlasTimeWindow,
  CommunitySettings,
  LayoutSettings,
  ViewOptions as AtlasViewOptions,
  AtlasSettings,
  PanPosition,
  AtlasPageState,
} from "./settings.schema";

export {
  ViewModeSchema as AtlasViewModeSchema,
  EgoSettingsSchema as AtlasEgoSettingsSchema,
  TimeWindowSchema as AtlasTimeWindowSchema,
  CommunitySettingsSchema,
  LayoutSettingsSchema,
  ViewOptionsSchema as AtlasViewOptionsSchema,
  AtlasSettingsSchema,
  PanPositionSchema,
  AtlasPageStateSchema,
  validateEgoSettings as validateAtlasEgoSettings,
  validateTimeWindow as validateAtlasTimeWindow,
  validateAtlasSettings,
  VIEW_MODE_OPTIONS as ATLAS_VIEW_MODE_OPTIONS,
  LAYOUT_OPTIONS as ATLAS_LAYOUT_OPTIONS,
  HOP_OPTIONS as ATLAS_HOP_OPTIONS,
  NODE_LIMIT_OPTIONS as ATLAS_NODE_LIMIT_OPTIONS,
} from "./settings.schema";

// For backward compatibility - also export non-namespaced
export type {
  ViewMode,
  EgoSettings,
  TimeWindow,
  ViewOptions,
} from "./settings.schema";
export {
  ViewModeSchema,
  EgoSettingsSchema,
  TimeWindowSchema,
  ViewOptionsSchema,
  VIEW_MODE_OPTIONS,
  LAYOUT_OPTIONS,
  HOP_OPTIONS,
  NODE_LIMIT_OPTIONS,
} from "./settings.schema";
