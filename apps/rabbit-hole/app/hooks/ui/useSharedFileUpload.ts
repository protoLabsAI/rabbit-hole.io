/**
 * Shared File Upload Hook
 *
 * A lightweight, reusable hook that can be used throughout the UI to trigger file uploads.
 * This provides a consistent interface for opening the file upload dialog from any component.
 */

import { useCallback } from "react";

import { vlog } from "@/lib/verbose-logger";

import { useFileUploadDialog } from "./useFileUploadDialog";

export interface SharedFileUploadActions {
  /**
   * Open the file upload dialog
   */
  openUploadDialog: () => void;

  /**
   * Check if the dialog is currently open
   */
  isDialogOpen: boolean;

  /**
   * Check if there's an upload in progress
   */
  isUploading: boolean;

  /**
   * Check if the last upload was successful
   */
  uploadSuccess: boolean;
}

/**
 * Shared file upload hook that can be used throughout the application
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const fileUpload = useSharedFileUpload();
 *
 *   return (
 *     <button onClick={fileUpload.openUploadDialog}>
 *       Upload File
 *     </button>
 *   );
 * }
 * ```
 */
export function useSharedFileUpload(): SharedFileUploadActions {
  const fileUploadDialog = useFileUploadDialog();

  const openUploadDialog = useCallback(() => {
    vlog.log("🚀 SharedFileUpload: Opening file upload dialog");
    fileUploadDialog.open();
  }, [fileUploadDialog.open]);

  return {
    openUploadDialog,
    isDialogOpen: fileUploadDialog.isOpen,
    isUploading: fileUploadDialog.isUploading,
    uploadSuccess: fileUploadDialog.uploadSuccess,
  };
}
