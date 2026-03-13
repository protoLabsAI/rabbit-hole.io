/**
 * Atlas Settings Panel - Barrel Exports
 */

export { AtlasSettingsPanel } from "./AtlasSettingsPanel";
export { useAtlasSettings } from "./useAtlasSettings";
export { useAtlasPreferences } from "./useAtlasPreferences";
export type { AtlasPreferences } from "./useAtlasPreferences";
export {
  atlasSettingsSchema,
  egoSettingsSchema,
  timeWindowSchema,
  communitySettingsSchema,
  layoutSettingsSchema,
  viewOptionsSchema,
  type AtlasSettings,
  type EgoSettings,
  type TimeWindow,
  type CommunitySettings as CommunitySettingsType,
  type LayoutSettings as LayoutSettingsType,
  type ViewOptions,
} from "./AtlasSettingsSchemas";

// Individual components (for testing or custom usage)
export { SettingsHeader } from "./SettingsHeader";
export { ViewModeSettings } from "./ViewModeSettings";
export { EgoNetworkSettings } from "./EgoNetworkSettings";
export { CommunitySettings } from "./CommunitySettings";
export { TimeSliceSettings } from "./TimeSliceSettings";
export { LayoutSettings } from "./LayoutSettings";
export { ViewOptionsSettings } from "./ViewOptionsSettings";
export { EdgeOptimizationStatus } from "./EdgeOptimizationStatus";
export { PreferencesSettings } from "./PreferencesSettings";

// Performance optimization components
export {
  LazySettingsSection,
  LazyEgoNetworkSettings,
  LazyCommunitySettings,
  LazyTimeSliceSettings,
} from "./LazySettingsComponents";
export {
  OptimizedViewModeSettings,
  StaticSettingsSection,
  useOptimizedSettingsState,
  useDebouncedSettingsUpdate,
} from "./OptimizedSettingsComponents";
export {
  usePerformanceMonitor,
  atlasSettingsPerformanceMonitor,
  withPerformanceMonitoring,
} from "./PerformanceMonitor";

// Validation components
export {
  ValidationMessage,
  FieldValidation,
  RangeValidation,
  DateRangeValidation,
} from "./ValidationFeedback";
