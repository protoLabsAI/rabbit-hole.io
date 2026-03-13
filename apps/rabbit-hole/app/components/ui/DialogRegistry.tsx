/**
 * Dialog Registry Component
 *
 * Centralized component that renders all application dialogs.
 * Uses specialized hooks to manage each dialog's state.
 * Eliminates the need for individual dialog state management in components.
 */

"use client";

import React from "react";

// Import dialog components
import { BiographicalAnalysisDialog } from "../../evidence/components/atlas/biographical/BiographicalAnalysisDialog";
import { EntityMergeDialog } from "../../evidence/components/atlas/EntityMergeDialog";
import { FileUploadDialog } from "../../evidence/components/atlas/FileUploadDialog";
import { FamilyAnalysisDialog } from "../../evidence/components/atlas/relationships/FamilyAnalysisDialog";
import { ResearchReportDialog } from "../../evidence/components/atlas/ResearchReportDialog";
import {
  useFamilyAnalysisDialog,
  useBiographicalAnalysisDialog,
  useResearchReportDialog,
  useEntityMergeDialog,
  useFileUploadDialog,
  useToastManager,
} from "../../hooks/ui";
import { MergeToNeo4jDialog } from "../../research/components/dialogs/MergeToNeo4jDialog";
import { useMergeToNeo4jDialog } from "../../research/hooks/useMergeToNeo4jDialog";

import {
  DialogHistoryNavigation,
  useDialogNavigationShortcuts,
} from "./DialogHistoryNavigation";

/**
 * Centralized dialog registry
 *
 * Renders all application dialogs and manages their state through hooks.
 * This replaces the scattered dialog JSX in Atlas page and other components.
 */
export function DialogRegistry() {
  // Get dialog states from hooks
  const familyDialog = useFamilyAnalysisDialog();
  const biographicalDialog = useBiographicalAnalysisDialog();
  const researchDialog = useResearchReportDialog();
  const entityMergeDialog = useEntityMergeDialog();
  const fileUploadDialog = useFileUploadDialog();
  const mergeToNeo4jDialog = useMergeToNeo4jDialog();
  const toast = useToastManager();

  // Enable keyboard shortcuts for dialog navigation
  useDialogNavigationShortcuts();

  return (
    <>
      {/* Dialog History Navigation */}
      <DialogHistoryNavigation
        className="fixed top-4 right-4 z-40 bg-card rounded-lg shadow-lg p-3 border"
        showBreadcrumbs={true}
        maxBreadcrumbs={4}
      />

      {/* Family Analysis Dialog */}
      <FamilyAnalysisDialog
        isOpen={familyDialog.isOpen}
        entityUid={familyDialog.entityUid}
        entityName={familyDialog.entityName}
        onClose={familyDialog.close}
      />

      {/* Biographical Analysis Dialog */}
      <BiographicalAnalysisDialog
        isOpen={biographicalDialog.isOpen}
        entityUid={biographicalDialog.entityUid}
        entityName={biographicalDialog.entityName}
        onClose={biographicalDialog.close}
      />

      {/* Research Report Dialog */}
      <ResearchReportDialog
        isOpen={researchDialog.isOpen}
        entityUid={researchDialog.entityUid}
        entityName={researchDialog.entityName}
        onClose={researchDialog.close}
      />

      {/* Entity Merge Dialog */}
      {entityMergeDialog.sourceEntity && (
        <EntityMergeDialog
          isOpen={entityMergeDialog.isOpen}
          sourceEntity={entityMergeDialog.sourceEntity}
          onClose={entityMergeDialog.close}
          onMergeComplete={(mergedEntity) => {
            entityMergeDialog.close();

            // Show success feedback
            toast.success(
              "Successfully merged entities!",
              `The duplicate entity has been removed and all relationships have been transferred to "${mergedEntity.name}".`
            );

            // TODO: Add graph refresh trigger here when needed
          }}
        />
      )}

      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={fileUploadDialog.isOpen}
        selectedFile={fileUploadDialog.selectedFile}
        isProcessing={fileUploadDialog.isProcessing}
        metadata={fileUploadDialog.metadata}
        error={fileUploadDialog.error}
        uploadProgress={fileUploadDialog.uploadProgress}
        isUploading={fileUploadDialog.isUploading}
        uploadSuccess={fileUploadDialog.uploadSuccess}
        onClose={fileUploadDialog.close}
        onFileSelect={fileUploadDialog.selectFile}
        onClearFile={fileUploadDialog.clearFile}
        onRetry={fileUploadDialog.retry}
        onUploadToStorage={fileUploadDialog.uploadToStorage}
      />

      {/* Merge to Neo4j Dialog */}
      {mergeToNeo4jDialog.bundle && (
        <MergeToNeo4jDialog
          isOpen={mergeToNeo4jDialog.isOpen}
          bundle={mergeToNeo4jDialog.bundle}
          onClose={mergeToNeo4jDialog.close}
        />
      )}
    </>
  );
}
