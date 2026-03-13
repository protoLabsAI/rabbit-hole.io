/**
 * File Entity Card
 *
 * Custom card for File entities with upload functionality.
 */

"use client";

import React from "react";

import { Button } from "@proto/ui/atoms";

import { useFileUploadDialog } from "@/hooks/ui/useFileUploadDialog";

import { BaseDomainCard, CardSection, PropertyRow } from "./BaseDomainCard";
import type { DomainCardProps } from "./types";

export const FileCard: React.FC<DomainCardProps> = ({
  node,
  domain,
  size = "standard",
  ...props
}) => {
  const fileUpload = useFileUploadDialog();

  // Check if file has been uploaded (supports both naming conventions)
  const hasFile = Boolean(
    node.properties?.key || node.properties?.canonicalKey
  );

  const formatBytes = (bytes: number | string | undefined): string => {
    if (!bytes) return "N/A";
    const numBytes = typeof bytes === "string" ? parseInt(bytes) : bytes;
    if (isNaN(numBytes)) return "N/A";

    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open file upload dialog with entity context
    fileUpload.open({
      entityUid: node.uid,
      entityName: node.name,
    });
  };

  return (
    <>
      <BaseDomainCard node={node} domain={domain as any} size={size} {...props}>
        {/* File Status */}
        <CardSection title="Status">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {hasFile ? (
                <>
                  {node.properties?.processingState === "completed" &&
                    "✅ File uploaded & processed"}
                  {node.properties?.processingState === "unprocessed" &&
                    "⏳ Processing pending"}
                  {node.properties?.processingState === "processing" &&
                    "⚙️ Processing..."}
                  {node.properties?.processingState === "failed" &&
                    "❌ Processing failed"}
                  {!node.properties?.processingState && "✅ File uploaded"}
                </>
              ) : (
                "⏳ Awaiting upload"
              )}
            </span>
            {!hasFile && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUploadClick}
                className="ml-2"
              >
                Upload File
              </Button>
            )}
          </div>
        </CardSection>

        {/* File Info */}
        {(node.properties?.mime ||
          node.properties?.mediaType ||
          node.properties?.bytes ||
          node.properties?.size ||
          node.properties?.content_hash ||
          node.properties?.contentHash) && (
          <CardSection title="File Info">
            {(node.properties?.mime || node.properties?.mediaType) && (
              <PropertyRow
                label="MIME Type"
                value={node.properties.mime || node.properties.mediaType}
                type="badge"
              />
            )}
            {(node.properties?.bytes || node.properties?.size) && (
              <PropertyRow
                label="Size"
                value={formatBytes(
                  node.properties.bytes || node.properties.size
                )}
                type="text"
              />
            )}
            {(node.properties?.content_hash ||
              node.properties?.contentHash) && (
              <PropertyRow
                label="Hash"
                value={
                  typeof (
                    node.properties.content_hash || node.properties.contentHash
                  ) === "string"
                    ? (
                        node.properties.content_hash ||
                        node.properties.contentHash
                      ).substring(0, 16) + "..."
                    : String(
                        node.properties.content_hash ||
                          node.properties.contentHash
                      )
                }
                type="text"
              />
            )}
          </CardSection>
        )}

        {/* Storage Info */}
        {(node.properties?.bucket ||
          node.properties?.key ||
          node.properties?.canonicalKey) && (
          <CardSection title="Storage">
            {node.properties?.bucket && (
              <PropertyRow
                label="Bucket"
                value={node.properties.bucket}
                type="text"
              />
            )}
            {(node.properties?.key || node.properties?.canonicalKey) && (
              <PropertyRow
                label="Key"
                value={
                  typeof (
                    node.properties.key || node.properties.canonicalKey
                  ) === "string"
                    ? (node.properties.key || node.properties.canonicalKey)
                        .length > 40
                      ? (
                          node.properties.key || node.properties.canonicalKey
                        ).substring(0, 40) + "..."
                      : node.properties.key || node.properties.canonicalKey
                    : String(
                        node.properties.key || node.properties.canonicalKey
                      )
                }
                type="text"
              />
            )}
          </CardSection>
        )}

        {/* Download Link */}
        {hasFile && (node.properties?.key || node.properties?.canonicalKey) && (
          <CardSection>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={async (e) => {
                e.stopPropagation();
                const canonicalKey =
                  node.properties?.key || node.properties?.canonicalKey;
                const filename = node.name;

                try {
                  const response = await fetch("/api/files/sign-get", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ canonicalKey, filename }),
                  });

                  const result = await response.json();

                  if (result.success && result.data?.downloadUrl) {
                    // Trigger download
                    const link = document.createElement("a");
                    link.href = result.data.downloadUrl;
                    link.download = filename || "download";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    console.error("Failed to get download URL:", result.error);
                  }
                } catch (error) {
                  console.error("Download error:", error);
                }
              }}
            >
              Download File
            </Button>
          </CardSection>
        )}
      </BaseDomainCard>
    </>
  );
};

FileCard.displayName = "FileCard";
