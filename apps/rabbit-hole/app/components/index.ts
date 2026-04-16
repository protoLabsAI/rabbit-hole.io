/**
 * Component Exports
 *
 * Centralized exports for app components
 */

// Navigation and Layout
// Note: SiteMap and AppNavBar components removed - were not in use

// Performance Monitoring
export { WebVitalsMonitor } from "./WebVitalsMonitor";

// Hooks (now in @protolabsai/ui package)
export { useToast, toast } from "@protolabsai/ui/hooks";

// UI Components now in @protolabsai/ui package
// import from @protolabsai/ui/atoms, @protolabsai/ui/molecules, @protolabsai/ui/organisms, or @protolabsai/ui/templates
// App-specific UI components:
export { DialogRegistry } from "./ui/DialogRegistry";
export { ThemeSelector } from "./ui/ThemeSelector";
export { ThemedUserButton } from "./ui/ThemedUserButton";
export { FileUploadButton } from "./ui/FileUploadButton";
export { DialogHistoryNavigation } from "./ui/DialogHistoryNavigation";
export { UserStatsPage } from "./ui/UserStatsPage";
