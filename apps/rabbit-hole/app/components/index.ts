/**
 * Component Exports
 *
 * Centralized exports for app components
 */

// Navigation and Layout
// Note: SiteMap and AppNavBar components removed - were not in use

// Performance Monitoring
export { WebVitalsMonitor } from "./WebVitalsMonitor";

// Hooks (now in @proto/ui package)
export { useToast, toast } from "@proto/ui/hooks";

// UI Components now in @proto/ui package
// import from @proto/ui/atoms, @proto/ui/molecules, @proto/ui/organisms, or @proto/ui/templates
// App-specific UI components:
export { DialogRegistry } from "./ui/DialogRegistry";
export { ThemeSelector } from "./ui/ThemeSelector";
export { ThemedUserButton } from "./ui/ThemedUserButton";
export { FileUploadButton } from "./ui/FileUploadButton";
export { DialogHistoryNavigation } from "./ui/DialogHistoryNavigation";
export { UserStatsPage } from "./ui/UserStatsPage";
