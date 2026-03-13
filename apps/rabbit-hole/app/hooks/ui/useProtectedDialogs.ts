/**
 * Protected Dialog Hooks
 *
 * Pre-configured dialog hooks with common access control patterns.
 * Built on top of the conditional dialog system.
 */

import {
  useAuthenticatedDialog,
  useFeatureGatedDialog,
  useRoleBasedDialog,
} from "./useConditionalDialog";
import {
  useBiographicalAnalysisDialog,
  useEntityMergeDialog,
  useFamilyAnalysisDialog,
  useResearchReportDialog,
} from "./useSpecializedDialogs";

/**
 * Authentication-protected specialized dialog hooks
 * Users must be signed in to access these features
 */

export function useProtectedFamilyAnalysisDialog() {
  return useAuthenticatedDialog(
    useFamilyAnalysisDialog,
    "Sign in to analyze family relationships and connections"
  );
}

export function useProtectedBiographicalAnalysisDialog() {
  return useAuthenticatedDialog(
    useBiographicalAnalysisDialog,
    "Sign in to access detailed biographical analysis"
  );
}

export function useProtectedResearchReportDialog() {
  return useAuthenticatedDialog(
    useResearchReportDialog,
    "Sign in to generate comprehensive research reports"
  );
}

/**
 * Role-protected dialogs for advanced features
 * Requires specific user roles/permissions
 */

export function useAdminEntityMergeDialog() {
  return useRoleBasedDialog(
    useEntityMergeDialog,
    "admin",
    "Entity merging requires administrator privileges"
  );
}

export function useModeratorEntityMergeDialog() {
  return useRoleBasedDialog(
    useEntityMergeDialog,
    "moderator",
    "Entity merging requires moderator or administrator privileges"
  );
}

/**
 * Feature-flag protected dialogs
 * For beta features or experimental functionality
 */

export function useBetaFamilyAnalysisDialog() {
  return useFeatureGatedDialog(
    useFamilyAnalysisDialog,
    "advanced_family_analysis",
    "Advanced family analysis is currently in beta"
  );
}

export function useExperimentalResearchDialog() {
  return useFeatureGatedDialog(
    useResearchReportDialog,
    "ai_research_v2",
    "The new AI research system is currently experimental"
  );
}

/**
 * Premium/Pro feature dialogs
 * For subscription-gated features
 */

export function usePremiumResearchReportDialog() {
  return useRoleBasedDialog(
    useResearchReportDialog,
    "premium",
    "Detailed research reports are available to premium subscribers"
  );
}

/**
 * Usage examples and patterns
 */

/*
// Basic usage - replace standard hooks with protected versions
const familyDialog = useProtectedFamilyAnalysisDialog();
const mergeDialog = useAdminEntityMergeDialog();

// The API remains the same
familyDialog.open("person:trump", "Donald Trump");
// If user not signed in → shows "Sign in to analyze family relationships" toast

mergeDialog.open(entityObject);  
// If user not admin → shows "Entity merging requires administrator privileges" toast

// Check access status
if (familyDialog.isEnabled && !familyDialog.isChecking) {
  // Safe to show UI controls
}

// Manual access check
const hasAccess = await familyDialog.checkAccess();
if (hasAccess) {
  // Proceed with action
}
*/
