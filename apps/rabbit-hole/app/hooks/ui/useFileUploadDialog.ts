/**
 * File Upload Dialog Hook
 *
 * Manages state for file upload dialog including file selection,
 * metadata processing, and upload progress.
 */

import { useCallback, useState, useEffect } from "react";

import type { FileProcessingResult } from "@protolabsai/utils/file-processing";

import { vlog } from "@/lib/verbose-logger";

import { useUIStore } from "../../context/store/useUIStore";
import {
  fileUploadService,
  type FileUploadResult,
} from "../../lib/file-upload-service";

import { useDialogHistory } from "./useDialogHistory";

export interface FileUploadDialogState {
  isOpen: boolean;
  selectedFile: File | null;
  isProcessing: boolean;
  metadata: FileProcessingResult | null;
  error: string | null;
  uploadProgress: number;
  isUploading: boolean;
  uploadResult: FileUploadResult | null;
  uploadSuccess: boolean;
}

export interface FileUploadSuccessData {
  entityUid: string;
  storageMetadata: {
    key: string;
    canonicalKey: string;
    mediaType: string;
    size: number;
    bytes: number;
    contentHash: string;
    content_hash: string;
    bucket: string;
    uploadId: string;
    uploadedAt: string;
    processingState:
      | "unprocessed"
      | "queued"
      | "processing"
      | "processed"
      | "failed";
    filename?: string;
    originalFilename?: string;
  };
}

export interface FileUploadDialogActions {
  open: (context?: { entityUid?: string; entityName?: string }) => void;
  close: () => void;
  selectFile: (file: File) => Promise<void>;
  clearFile: () => void;
  retry: () => Promise<void>;
  uploadToStorage: () => Promise<void>;
  onUploadSuccess?: (data: FileUploadSuccessData) => void;
}

export function useFileUploadDialog(): FileUploadDialogState &
  FileUploadDialogActions {
  const dialogState = useUIStore((s) => s.entityDialogs.fileUpload) || {
    isOpen: false,
    entityUid: "",
    entityName: "",
    metadata: {},
  };
  const openEntityDialog = useUIStore((s) => s.openEntityDialog);
  const closeEntityDialog = useUIStore((s) => s.closeEntityDialog);
  const { addToHistory } = useDialogHistory();

  // File processing state (local to this hook)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadata, setMetadata] = useState<FileProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(
    null
  );
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Handle file from event metadata if provided
  useEffect(() => {
    if (dialogState.isOpen && dialogState.metadata?.file && !selectedFile) {
      setSelectedFile(dialogState.metadata.file);
    }
  }, [dialogState.isOpen, dialogState.metadata, selectedFile]);

  const open = useCallback(
    (context?: { entityUid?: string; entityName?: string }) => {
      openEntityDialog(
        "fileUpload",
        context?.entityUid || "",
        context?.entityName || "File Upload",
        {
          entityUid: context?.entityUid,
        }
      );
      setError(null);
      setMetadata(null);
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setUploadResult(null);
      setUploadSuccess(false);

      // Add to dialog history
      addToHistory(
        "fileUpload",
        context?.entityName || "File Upload",
        context?.entityUid || "",
        ""
      );
    },
    [openEntityDialog, addToHistory]
  );

  const close = useCallback(() => {
    closeEntityDialog("fileUpload");
    setSelectedFile(null);
    setMetadata(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadResult(null);
    setUploadSuccess(false);
  }, [closeEntityDialog]);

  const selectFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setMetadata(null);
    setIsProcessing(true);

    try {
      vlog.log(`📎 Processing file metadata: ${file.name}`);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/process-metadata", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to process file metadata");
      }

      setMetadata(result.data);
      vlog.log(`✅ File metadata processed: ${result.data.suggestedEntityId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("File processing error:", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setMetadata(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadResult(null);
    setUploadSuccess(false);
  }, []);

  const retry = useCallback(async () => {
    if (selectedFile) {
      await selectFile(selectedFile);
    }
  }, [selectedFile, selectFile]);

  const uploadToStorage = useCallback(async () => {
    if (
      !selectedFile ||
      !metadata ||
      !metadata.isValid ||
      !metadata.contentHash
    ) {
      setError("Cannot upload: File metadata is invalid or missing");
      return;
    }

    // Get workspace ID from localStorage
    const workspaceId =
      localStorage.getItem("current-workspace-id") || "ws-default";

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      vlog.log(`🚀 Starting file upload: ${selectedFile.name}`);

      const result = await fileUploadService.uploadFile(
        selectedFile,
        metadata,
        workspaceId,
        (progress) => setUploadProgress(progress)
      );

      setUploadResult(result);

      if (result.success) {
        setUploadSuccess(true);
        vlog.log(
          `✅ File uploaded successfully: ${result.data?.fileEntity.uid}`
        );
        vlog.log(`📁 Canonical key: ${result.data?.fileEntity.canonicalKey}`);

        // Add to upload history
        if (metadata) {
          try {
            const historyItem = {
              id: Date.now(),
              filename: metadata.filename,
              entityId: metadata.suggestedEntityId,
              size: metadata.sizeFormatted,
              mediaType: metadata.mediaType,
              uploadedAt: new Date().toISOString(),
              entityLinks: 0, // Will be updated when entity links are created
            };

            const currentHistory = JSON.parse(
              localStorage.getItem("fileUploadHistory") || "[]"
            );
            const newHistory = [historyItem, ...currentHistory].slice(0, 20); // Keep last 20
            localStorage.setItem(
              "fileUploadHistory",
              JSON.stringify(newHistory)
            );
          } catch (error) {
            console.warn("Failed to save upload history:", error);
          }
        }

        // Dispatch file upload success event for canvas integration
        if (metadata && result.data) {
          const entityUid =
            dialogState.metadata?.entityUid || result.data.fileEntity.uid;

          const uploadSuccessData: FileUploadSuccessData = {
            entityUid,
            storageMetadata: {
              key: result.data.fileEntity.canonicalKey,
              canonicalKey: result.data.fileEntity.canonicalKey,
              mediaType: metadata.mediaType,
              size: metadata.size,
              bytes: metadata.size,
              contentHash: metadata.contentHash || "",
              content_hash: metadata.contentHash || "",
              bucket: "evidence-raw",
              uploadId: result.data.uploadId,
              uploadedAt: new Date().toISOString(),
              processingState: result.data.fileEntity.processingState,
              // Include filename for node name update
              filename: metadata.filename,
              originalFilename: metadata.originalFilename,
            },
          };

          vlog.log(`📤 Dispatching file upload success event for ${entityUid}`);
          window.dispatchEvent(
            new CustomEvent("fileUploadSuccess", {
              detail: uploadSuccessData,
            })
          );
        }
      } else {
        setError(result.error || "Upload failed");
        console.error("Upload failed:", result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      console.error("Upload error:", errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, metadata]);

  return {
    // State
    isOpen: dialogState.isOpen,
    selectedFile,
    isProcessing,
    metadata,
    error,
    uploadProgress,
    isUploading,
    uploadResult,
    uploadSuccess,

    // Actions
    open,
    close,
    selectFile,
    clearFile,
    retry,
    uploadToStorage,
  };
}
