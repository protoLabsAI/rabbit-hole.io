/**
 * File Upload Dialog Component
 *
 * Provides file upload interface with drag & drop, metadata display,
 * and integration with the file processing pipeline.
 */

import React, { useCallback, useRef, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@protolabsai/ui/atoms";
import { ProcessingStateInfo } from "@protolabsai/ui/molecules";
import { EntitySearch, type SearchableEntity } from "@protolabsai/ui/organisms";
import { getAllowedFileExtensions } from "@protolabsai/utils";
import type { FileProcessingResult } from "@protolabsai/utils";

interface FileUploadDialogProps {
  isOpen: boolean;
  selectedFile: File | null;
  isProcessing: boolean;
  metadata: FileProcessingResult | null;
  error: string | null;
  uploadProgress: number;
  isUploading: boolean;
  uploadSuccess: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => Promise<void>;
  onClearFile: () => void;
  onRetry: () => Promise<void>;
  onUploadToStorage: () => Promise<void>;
}

export function FileUploadDialog({
  isOpen,
  selectedFile,
  isProcessing,
  metadata,
  error,
  uploadProgress,
  isUploading,
  uploadSuccess,
  onClose,
  onFileSelect,
  onClearFile,
  onRetry,
  onUploadToStorage,
}: FileUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size intelligently
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Entity linking state
  const [linkedEntities, setLinkedEntities] = useState<
    Array<{
      entity: SearchableEntity;
      relationshipType: string;
    }>
  >([]);
  const [isLinkingEntities, setIsLinkingEntities] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);

  // Upload history state
  const [showHistory, setShowHistory] = useState(false);
  const [uploadHistory] = useState(() => {
    // Get upload history from localStorage
    try {
      const stored = localStorage.getItem("fileUploadHistory");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Add successful upload to history
  const addToHistory = useCallback(
    (metadata: FileProcessingResult, entityLinks: number = 0) => {
      const historyItem = {
        id: Date.now(),
        filename: metadata.filename,
        entityId: metadata.suggestedEntityId,
        size: metadata.sizeFormatted,
        mediaType: metadata.mediaType,
        uploadedAt: new Date().toISOString(),
        entityLinks,
      };

      try {
        const currentHistory = JSON.parse(
          localStorage.getItem("fileUploadHistory") || "[]"
        );
        const newHistory = [historyItem, ...currentHistory].slice(0, 20); // Keep last 20
        localStorage.setItem("fileUploadHistory", JSON.stringify(newHistory));
      } catch (error) {
        console.warn("Failed to save upload history:", error);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleCloseDialog = () => {
    onClearFile();
    setLinkedEntities([]);
    setIsLinkingEntities(false);
    setLinkingError(null);
    onClose();
  };

  const handleAddLinkedEntity = (
    entity: SearchableEntity,
    relationshipType: string = "REFERENCES"
  ) => {
    // Check if entity is already linked
    if (linkedEntities.find((le) => le.entity.uid === entity.uid)) {
      return;
    }

    setLinkedEntities((prev) => [...prev, { entity, relationshipType }]);
    setLinkingError(null);
  };

  const handleRemoveLinkedEntity = (entityUid: string) => {
    setLinkedEntities((prev) =>
      prev.filter((le) => le.entity.uid !== entityUid)
    );
  };

  const handleUpdateRelationshipType = (entityUid: string, newType: string) => {
    setLinkedEntities((prev) =>
      prev.map((le) =>
        le.entity.uid === entityUid ? { ...le, relationshipType: newType } : le
      )
    );
  };

  const handleCreateEntityLinks = async () => {
    if (!metadata?.suggestedEntityId || linkedEntities.length === 0) {
      return;
    }

    setIsLinkingEntities(true);
    setLinkingError(null);

    try {
      const relationships = linkedEntities.map((le) => ({
        fileUid: metadata.suggestedEntityId,
        entityUid: le.entity.uid,
        relationshipType: le.relationshipType,
        confidence: 0.9, // High confidence for user-created links
      }));

      const response = await fetch("/api/files/link-entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ relationships }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(
          `✅ Created ${result.data.relationshipsCreated} entity links`
        );
        // Add to history if we have metadata
        if (metadata) {
          addToHistory(metadata, result.data.relationshipsCreated);
        }
        // Keep entities linked for display but disable further linking
      } else {
        throw new Error(result.error || "Failed to create entity links");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setLinkingError(errorMessage);
      console.error("Entity linking error:", errorMessage);
    } finally {
      setIsLinkingEntities(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span>📎</span>
              Upload File
            </DialogTitle>
            {uploadHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-foreground-muted hover:text-foreground-secondary"
              >
                {showHistory ? "📁 Hide History" : "📂 History"}
              </Button>
            )}
          </div>
          <DialogDescription>
            Upload a file to extract metadata and generate entity information.
            Supports 30+ file types: documents (PDF, Word), code (JS, TS, CSS),
            text (MD, TXT, JSON), images, audio, video, and archives.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload History */}
          {showHistory && uploadHistory.length > 0 && (
            <div className="border rounded-lg p-4 bg-background-secondary">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <span>📂</span>
                Recent Uploads
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadHistory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-white border rounded text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">📄</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                          <span>{item.size}</span>
                          <span>•</span>
                          <span>
                            {new Date(item.uploadedAt).toLocaleDateString()}
                          </span>
                          {item.entityLinks > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                {item.entityLinks} link
                                {item.entityLinks !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-foreground-muted font-mono">
                      {item.entityId?.split(":")[1]?.substring(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
              {uploadHistory.length >= 20 && (
                <p className="text-xs text-foreground-muted mt-2 text-center">
                  Showing last 20 uploads
                </p>
              )}
            </div>
          )}

          {/* File Selection Area */}
          {!selectedFile && (
            <div
              className="border-2 border-dashed border rounded-lg p-8 text-center hover:border-secondary transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleSelectFileClick}
            >
              <div className="space-y-4">
                <div className="text-4xl">📁</div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drop a file here or click to select
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Maximum file size: 100 MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept={getAllowedFileExtensions().join(",")}
          />

          {/* Selected File Info */}
          {selectedFile && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {selectedFile.name}
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      {formatFileSize(selectedFile.size)} •{" "}
                      {selectedFile.type || "Unknown type"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFile}
                  disabled={isProcessing}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {(isProcessing || isUploading) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin text-lg">⚙️</div>
                <span className="text-sm text-foreground-secondary">
                  {isProcessing && "Processing file metadata..."}
                  {isUploading && "Uploading file to storage..."}
                </span>
              </div>
              <div className="w-full bg-background-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {isUploading && (
                <div className="text-xs text-foreground-muted text-center">
                  {uploadProgress}% complete
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="border border-error/20 rounded-lg p-4 bg-error/10">
              <div className="flex items-start gap-2">
                <span className="text-error">❌</span>
                <div className="flex-1">
                  <h4 className="font-medium text-error">Processing Failed</h4>
                  <p className="text-sm text-error mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={!selectedFile || isUploading}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Upload Success State */}
          {uploadSuccess && (
            <div className="border rounded-lg p-4 bg-success/10 border-success/20">
              <h4 className="font-medium text-success mb-3 flex items-center gap-2">
                <span>🎉</span>
                File Uploaded Successfully!
              </h4>
              <div className="text-sm text-success space-y-3">
                <p>
                  Your file has been uploaded to secure storage and added to the
                  knowledge graph.
                </p>

                <div className="bg-white rounded p-3 border">
                  <p className="font-medium mb-2 text-foreground">
                    Entity Details:
                  </p>
                  <div className="space-y-2">
                    <p className="text-foreground-secondary">
                      <span className="font-medium">Entity ID:</span>{" "}
                      <span className="font-mono text-xs bg-background-muted px-2 py-1 rounded">
                        {metadata?.suggestedEntityId}
                      </span>
                    </p>

                    <div>
                      <p className="font-medium text-foreground-secondary mb-2">
                        Processing Status:
                      </p>
                      <ProcessingStateInfo
                        state="unprocessed"
                        queuedAt={undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Entity Linking Section - shown after successful upload */}
          {uploadSuccess && metadata && (
            <div className="border rounded-lg p-4 bg-info/10">
              <h4 className="font-medium text-info mb-3 flex items-center gap-2">
                <span>🔗</span>
                Link to Entities (Optional)
              </h4>

              <div className="space-y-4">
                <p className="text-sm text-info">
                  Connect this file to existing entities in your knowledge graph
                  to show relationships.
                </p>

                {/* Entity Search */}
                <EntitySearch
                  placeholder="Search for entities to link..."
                  onEntitySelect={(entity) => handleAddLinkedEntity(entity)}
                  className="w-full"
                />

                {/* Linked Entities Display */}
                {linkedEntities.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-info text-sm">
                      Linked Entities:
                    </p>
                    {linkedEntities.map((linkedEntity) => (
                      <div
                        key={linkedEntity.entity.uid}
                        className="flex items-center justify-between p-2 bg-white border rounded"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">
                            {linkedEntity.entity.type === "Person"
                              ? "👤"
                              : "🏢"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {linkedEntity.entity.name}
                            </p>
                            <p className="text-xs text-foreground-muted">
                              {linkedEntity.entity.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={linkedEntity.relationshipType}
                            onChange={(e) =>
                              handleUpdateRelationshipType(
                                linkedEntity.entity.uid,
                                e.target.value
                              )
                            }
                            className="text-xs p-1 border rounded"
                          >
                            <option value="REFERENCES">References</option>
                            <option value="DOCUMENTS">Documents</option>
                            <option value="EVIDENCES">Evidences</option>
                            <option value="SUPPORTS">Supports</option>
                            <option value="AUTHORED_BY">Authored By</option>
                            <option value="PUBLISHED_BY">Published By</option>
                            <option value="MENTIONS">Mentions</option>
                            <option value="CONTAINS">Contains</option>
                          </select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveLinkedEntity(linkedEntity.entity.uid)
                            }
                            className="h-6 w-6 p-0 text-error hover:text-error/80"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Linking Actions */}
                {linkedEntities.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm text-foreground-secondary">
                      {linkedEntities.length} entit
                      {linkedEntities.length === 1 ? "y" : "ies"} to link
                    </div>
                    <Button
                      onClick={handleCreateEntityLinks}
                      disabled={isLinkingEntities}
                      size="sm"
                    >
                      {isLinkingEntities ? "Linking..." : "Create Links"}
                    </Button>
                  </div>
                )}

                {/* Linking Error */}
                {linkingError && (
                  <div className="p-2 bg-error/10 border border-error/20 rounded text-sm">
                    <p className="text-error">
                      <span className="font-medium">Error:</span> {linkingError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata Results */}
          {metadata && !uploadSuccess && (
            <div className="border rounded-lg p-4 bg-success/10">
              <h4 className="font-medium text-success mb-3 flex items-center gap-2">
                <span>✅</span>
                File Processed Successfully
              </h4>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Filename:
                    </span>
                    <p className="text-foreground">{metadata.filename}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Size:
                    </span>
                    <p className="text-foreground">{metadata.sizeFormatted}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Type:
                    </span>
                    <p className="text-foreground">{metadata.mediaType}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Valid:
                    </span>
                    <p className="text-foreground">
                      {metadata.isValid ? "✅ Yes" : "❌ No"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-foreground-secondary">
                    Suggested Entity ID:
                  </span>
                  <p className="font-mono text-sm bg-white rounded px-2 py-1 border mt-1">
                    {metadata.suggestedEntityId}
                  </p>
                </div>

                {metadata.contentHash && (
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Content Hash:
                    </span>
                    <p className="font-mono text-xs bg-white rounded px-2 py-1 border mt-1 break-all">
                      {metadata.contentHash}
                    </p>
                  </div>
                )}

                {metadata.lastModified && (
                  <div>
                    <span className="font-medium text-foreground-secondary">
                      Last Modified:
                    </span>
                    <p className="text-foreground text-sm">
                      {metadata.lastModified.toLocaleString()}
                    </p>
                  </div>
                )}

                {metadata.validationErrors.length > 0 && (
                  <div>
                    <span className="font-medium text-error">
                      Validation Issues:
                    </span>
                    <ul className="text-sm text-error mt-1 space-y-1">
                      {metadata.validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div className="text-sm text-foreground-muted">
              {uploadSuccess &&
                "Upload complete! File added to knowledge graph"}
              {!uploadSuccess &&
                metadata?.isValid &&
                !isUploading &&
                "Ready to proceed with upload"}
              {!uploadSuccess &&
                !metadata?.isValid &&
                metadata &&
                "Please resolve issues before uploading"}
              {isUploading && "Upload in progress..."}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isUploading}
              >
                {uploadSuccess ? "Done" : "Close"}
              </Button>
              {metadata?.isValid && !uploadSuccess && (
                <Button
                  onClick={onUploadToStorage}
                  disabled={isUploading || !metadata.contentHash}
                >
                  {isUploading ? "Uploading..." : "Upload to Storage"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
