/**
 * Files Management Tab
 *
 * Comprehensive file management interface with:
 * - File listing with metadata and relationships
 * - Processing state monitoring
 * - Cascade deletion with integrity checks
 * - Bulk operations and orphaned file cleanup
 * - Theme-aware styling following whitelabel strategy
 */

"use client";

import { ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@proto/ui/atoms";
import { ProcessingStateBadge } from "@proto/ui/molecules";
import { DataTable } from "@proto/ui/organisms/data-table";

interface FileWithRelationships {
  uid: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mediaType: string;
  contentHash: string;
  canonicalKey?: string;
  processingState: string;
  uploadedAt: string;
  uploadId?: string;
  relationships: Array<{
    id: string;
    type: string;
    targetEntity: {
      uid: string;
      name: string;
      type: string;
    };
    confidence: number;
    label?: string;
  }>;
  evidenceLinks: Array<{
    evidenceUid: string;
    evidenceTitle: string;
    evidenceType: string;
  }>;
  processingInfo?: {
    queuedAt?: string;
    processedAt?: string;
    processingError?: string;
    extractedText?: string;
    thumbnailUrl?: string;
  };
}

interface FileStatistics {
  byProcessingState: Record<string, number>;
  byMediaType: Record<string, number>;
  totalSize: number;
  totalSizeFormatted: string;
}

interface FilesManagementTabProps {
  workspaceId?: string;
}

export function FilesManagementTab({
  workspaceId = "default",
}: FilesManagementTabProps) {
  const [files, setFiles] = useState<FileWithRelationships[]>([]);
  const [statistics, setStatistics] = useState<FileStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [processingStateFilter, setProcessingStateFilter] =
    useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    file?: FileWithRelationships;
    integrityWarnings?: string[];
  }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load files
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Add workspace filter for non-admin users
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }

      if (processingStateFilter && processingStateFilter !== "all") {
        params.set("processingState", processingStateFilter);
      }
      if (mediaTypeFilter && mediaTypeFilter !== "all") {
        params.set("mediaType", mediaTypeFilter);
      }
      params.set("limit", "100");

      const response = await fetch(
        `/api/files/management?${params.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        setFiles(result.data.files);
        setStatistics(result.data.statistics);
      } else {
        setError(result.error || "Failed to load files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, processingStateFilter, mediaTypeFilter]);

  // Load files on mount and filter changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle file deletion
  const handleDeleteFile = async (file: FileWithRelationships) => {
    // Check if file has relationships/evidence - show confirmation
    const hasRelationships =
      file.relationships.length > 0 || file.evidenceLinks.length > 0;

    if (hasRelationships) {
      const warnings: string[] = [];
      if (file.relationships.length > 0) {
        warnings.push(
          `${file.relationships.length} entity relationship${file.relationships.length !== 1 ? "s" : ""}`
        );
      }
      if (file.evidenceLinks.length > 0) {
        warnings.push(
          `${file.evidenceLinks.length} evidence link${file.evidenceLinks.length !== 1 ? "s" : ""}`
        );
      }

      setDeleteDialog({
        isOpen: true,
        file,
        integrityWarnings: warnings,
      });
    } else {
      // Delete immediately if no relationships
      await executeDelete(file.uid, true, true);
    }
  };

  const executeDelete = async (
    fileUid: string,
    cascadeDelete: boolean,
    confirmIntegrityLoss: boolean
  ) => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/files/management", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUid,
          cascadeDelete,
          confirmIntegrityLoss,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Deleted file: ${fileUid}`);
        console.log(
          `Removed ${result.data.removedRelationships} relationships, ${result.data.removedEvidenceLinks} evidence links`
        );

        // Refresh file list
        await loadFiles();
        setDeleteDialog({ isOpen: false });
      } else {
        setError(result.error || "Failed to delete file");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete operation failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = useCallback((mediaType: string) => {
    if (mediaType.startsWith("image/")) return "🖼️";
    if (mediaType.startsWith("video/")) return "🎥";
    if (mediaType.startsWith("audio/")) return "🎵";
    if (mediaType.includes("pdf")) return "📄";
    if (mediaType.includes("word") || mediaType.includes("document"))
      return "📝";
    if (mediaType.includes("spreadsheet") || mediaType.includes("excel"))
      return "📊";
    if (mediaType.includes("presentation") || mediaType.includes("powerpoint"))
      return "📽️";
    if (
      mediaType.startsWith("text/") ||
      mediaType.includes("javascript") ||
      mediaType.includes("json")
    )
      return "📰";
    if (mediaType.includes("zip") || mediaType.includes("archive")) return "🗜️";
    return "📁";
  }, []);

  // Define columns for DataTable
  const columns: ColumnDef<FileWithRelationships>[] = [
    {
      accessorKey: "name",
      header: "File Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">
            {getFileIcon(row.original.mediaType)}
          </span>
          <span className="font-medium text-foreground truncate">
            {row.getValue("name")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "sizeFormatted",
      header: "Size",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("sizeFormatted")}
        </span>
      ),
    },
    {
      accessorKey: "mediaType",
      header: "Type",
      cell: ({ row }) => {
        const mediaType = row.getValue("mediaType") as string;
        const shortType = mediaType.split("/")[1] || mediaType;
        return (
          <Badge variant="outline" className="text-xs">
            {shortType.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "processingState",
      header: "Status",
      cell: ({ row }) => (
        <ProcessingStateBadge
          state={row.getValue("processingState") as any}
          size="sm"
        />
      ),
    },
    {
      accessorKey: "relationships",
      header: "Links",
      cell: ({ row }) => {
        const relCount = row.original.relationships.length;
        const evidCount = row.original.evidenceLinks.length;
        const total = relCount + evidCount;

        if (total === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }

        return (
          <div className="flex items-center gap-1">
            {relCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {relCount} entity
              </Badge>
            )}
            {evidCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {evidCount} evidence
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "uploadedAt",
      header: "Uploaded",
      cell: ({ row }) => {
        const date = new Date(row.getValue("uploadedAt"));
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(row.original.uid);
            }}
            title="Copy UID"
          >
            <Icon name="FileText" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-error hover:text-error"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFile(row.original);
            }}
            title="Delete file"
          >
            <Icon name="Trash2" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>File Management</CardTitle>
              <CardDescription>
                Manage uploaded files, monitor processing states, and maintain
                data integrity
              </CardDescription>
            </div>
            <Button onClick={loadFiles} disabled={isLoading} variant="outline">
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        {/* Statistics */}
        {statistics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold text-foreground">
                  {files.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="text-2xl font-bold text-success">
                  {statistics.byProcessingState.processed || 0}
                </div>
                <div className="text-sm text-success/80">Processed</div>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <div className="text-2xl font-bold text-warning">
                  {statistics.byProcessingState.unprocessed || 0}
                </div>
                <div className="text-sm text-warning/80">Unprocessed</div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <div className="text-2xl font-bold text-primary">
                  {statistics.totalSizeFormatted}
                </div>
                <div className="text-sm text-primary/80">Total Size</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Processing State
              </label>
              <Select
                value={processingStateFilter}
                onValueChange={setProcessingStateFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All processing states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="unprocessed">Unprocessed</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Media Type
              </label>
              <Select
                value={mediaTypeFilter}
                onValueChange={setMediaTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All file types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="text/plain">Text</SelectItem>
                  <SelectItem value="text/markdown">Markdown</SelectItem>
                  <SelectItem value="application/json">JSON</SelectItem>
                  <SelectItem value="text/javascript">JavaScript</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="image/jpeg">Images</SelectItem>
                  <SelectItem value="video/mp4">Video</SelectItem>
                  <SelectItem value="audio/mpeg">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-error">Error:</span>
            <div className="text-error/90">{error}</div>
          </div>
        </div>
      )}

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Files ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              Loading files...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={files}
              searchKey="name"
              searchPlaceholder="Search files by name..."
              emptyMessage="No files found. Try adjusting your filters."
              onRowClick={(file) => {
                console.log("File clicked:", file.uid);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.file && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h4 className="font-medium text-foreground mb-2">
                  File Details
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Name:</span>{" "}
                    {deleteDialog.file.name}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>{" "}
                    {deleteDialog.file.sizeFormatted}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {deleteDialog.file.mediaType}
                  </div>
                  <div>
                    <span className="font-medium">Entity ID:</span>{" "}
                    {deleteDialog.file.uid}
                  </div>
                </div>
              </div>

              {deleteDialog.integrityWarnings &&
                deleteDialog.integrityWarnings.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                    <h4 className="font-medium text-warning mb-2">
                      Data Integrity Impact
                    </h4>
                    <div className="text-sm text-warning/90">
                      <p className="mb-2">
                        Deleting this file will also remove:
                      </p>
                      <ul className="space-y-1">
                        {deleteDialog.integrityWarnings.map(
                          (warning, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{warning}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteDialog.file &&
                executeDelete(
                  deleteDialog.file.uid,
                  true, // cascade delete
                  true // confirm integrity loss
                )
              }
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete File & Relationships"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
