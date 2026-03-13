/**
 * Organisms - Complex UI Systems
 *
 * Feature-complete components with significant state and business logic.
 */

// AI Chat System
export * from "./ai-chat";

// Dialog System
export * from "./dialog-system";
export * from "./dialog-stack";
export * from "./multi-step-dialog";

// Feature Gating
export * from "./feature-gating";

// Utilities
export * from "./diff-view";
export * from "./entity-search";
// export * from "./file-upload-button"; // App-specific: depends on useSharedFileUpload
// export * from "./theme-selector"; // App-specific: depends on app ThemeProvider
// export * from "./themed-user-button"; // App-specific: depends on app ThemeProvider + Clerk
// export * from "./user-stats-page"; // App-specific: depends on app hooks

// Domain Entity Type Selector
export { DomainEntityTypeSelector } from "./DomainEntityTypeSelector";
export type { DomainEntityTypeSelectorProps } from "./DomainEntityTypeSelector";
export * from "./DomainEntityTypeSelector.helpers";
export * from "./DomainEntityTypeSelector.presets";
