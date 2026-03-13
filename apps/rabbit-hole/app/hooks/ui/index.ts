/**
 * UI Hooks - Centralized exports
 *
 * Provides easy access to all UI state management hooks
 */

// Core hook
export { useEntityDialog } from "./useEntityDialog";

// Specialized dialog hooks
export {
  useFamilyAnalysisDialog,
  useBiographicalAnalysisDialog,
  useResearchReportDialog,
  useEntityMergeDialog,
} from "./useSpecializedDialogs";

// File upload dialog hook
export { useFileUploadDialog } from "./useFileUploadDialog";
export { useSharedFileUpload } from "./useSharedFileUpload";

// Research import dialog hook
export { useResearchImportDialog } from "./useResearchImportDialog";

// Overlay and notification hooks
export { useToastManager } from "./useToastManager";

// Dialog history and navigation
export { useDialogHistory } from "./useDialogHistory";

// Conditional dialog rendering
export {
  useConditionalDialog,
  useAuthenticatedDialog,
  useRoleBasedDialog,
  useFeatureGatedDialog,
  DialogConditions,
} from "./useConditionalDialog";

// Pre-configured protected dialogs
export {
  useProtectedFamilyAnalysisDialog,
  useProtectedBiographicalAnalysisDialog,
  useProtectedResearchReportDialog,
  useAdminEntityMergeDialog,
  useModeratorEntityMergeDialog,
  useBetaFamilyAnalysisDialog,
  useExperimentalResearchDialog,
  usePremiumResearchReportDialog,
} from "./useProtectedDialogs";

// Unified store hooks
export { useUIStore } from "../../context/store/useUIStore";
export {
  useUnifiedUI,
  useUIState,
  useUIActions,
} from "../../context/hooks/useUnifiedUI";
