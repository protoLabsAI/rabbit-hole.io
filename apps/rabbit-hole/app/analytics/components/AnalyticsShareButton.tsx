/**
 * Analytics Share Button Component
 *
 * Creates shareable links for analytics views with current configuration.
 * Handles authentication, validation, and provides feedback to users.
 */

"use client";

import React, { useState } from "react";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@proto/ui/atoms";

import type {
  AnalyticsFilters,
  TimeWindow,
} from "../hooks/useAnalyticsPageState";
import type { ChartConfiguration } from "../types/ChartConfiguration";

// ==================== Types ====================

interface AnalyticsShareButtonProps {
  entities: string[];
  chartConfig: ChartConfiguration;
  filters: AnalyticsFilters;
  timeWindow: TimeWindow;
  disabled?: boolean;
  className?: string;
}

interface CreateShareRequest {
  entityUid: string;
  shareType: "analytics";
  entities: string[];
  parameters: {
    entities: string[];
    chartConfig: ChartConfiguration;
    filters: AnalyticsFilters;
    timeWindow: TimeWindow;
  };
  customTitle?: string;
  customDescription?: string;
  expiresInDays?: number;
}

interface ShareResponse {
  success: boolean;
  data?: {
    token: string;
    shareUrl: string;
    expiresAt: string;
    previewUrl: string;
    shareType: string;
    entityCount?: number;
    chartType?: string;
    dataSource?: string;
  };
  error?: string;
}

// ==================== Helper Functions ====================

function formatEntityName(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[1]
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return entityUid;
}

function getChartTypeLabel(chartType: string): string {
  const labels = {
    timeline: "Timeline",
    bar: "Bar Chart",
    line: "Line Chart",
    pie: "Pie Chart",
    scatter: "Scatter Plot",
    network: "Network Graph",
    heatmap: "Heatmap",
  };
  return labels[chartType as keyof typeof labels] || chartType;
}

function getDataSourceLabel(dataSource: string): string {
  const labels = {
    timeline: "Timeline Events",
    speechActs: "Speech Analysis",
    relationships: "Relationships",
    biographical: "Biography",
    activity: "Activity Patterns",
    metrics: "Entity Metrics",
  };
  return labels[dataSource as keyof typeof labels] || dataSource;
}

// ==================== Component ====================

export function AnalyticsShareButton({
  entities,
  chartConfig,
  filters,
  timeWindow,
  disabled = false,
  className = "",
}: AnalyticsShareButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [shareData, setShareData] = useState<ShareResponse["data"] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canShare = entities.length > 0 && !disabled;

  const handleCreateShare = async () => {
    if (!canShare) return;

    setIsCreating(true);
    setError(null);

    try {
      // Generate title and description
      const entityNames = entities.slice(0, 3).map(formatEntityName);
      const entitySummary =
        entities.length > 3
          ? `${entityNames.join(", ")} and ${entities.length - 3} others`
          : entityNames.join(", ");

      const title = `${entities.length > 1 ? "Multi-Entity" : ""} ${getChartTypeLabel(chartConfig.type)} Analysis`;
      const description = `Comparative ${chartConfig.type} analysis of ${entitySummary} using ${getDataSourceLabel(chartConfig.dataSource).toLowerCase()} data`;

      const shareRequest: CreateShareRequest = {
        entityUid: entities[0], // Primary entity for backward compatibility
        shareType: "analytics",
        entities,
        parameters: {
          entities,
          chartConfig,
          filters,
          timeWindow,
        },
        customTitle: title,
        customDescription: description,
        expiresInDays: 30, // Default 30-day expiration
      };

      const response = await fetch("/api/share/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shareRequest),
      });

      const result: ShareResponse = await response.json();

      if (result.success && result.data) {
        setShareData(result.data);
        // Auto-copy to clipboard
        await navigator.clipboard.writeText(result.data.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setError(result.error || "Failed to create share link");
      }
    } catch (err) {
      console.error("Failed to create share link:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create share link"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (shareData?.shareUrl) {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenShare = () => {
    if (shareData?.shareUrl) {
      window.open(shareData.shareUrl, "_blank");
    }
  };

  const handleClose = () => {
    setShareData(null);
    setError(null);
    setCopied(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateShare}
        disabled={!canShare || isCreating}
        className={`flex items-center gap-2 ${className}`}
      >
        <Icon name="share" size={16} />
        {isCreating ? "Creating..." : "Share Analysis"}
      </Button>

      {/* Share Success/Error Modal */}
      <Dialog open={!!shareData || !!error} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {shareData ? (
                <>
                  <Icon name="share" size={20} className="text-green-600" />
                  Share Link Created
                </>
              ) : (
                <>
                  <Icon name="share" size={20} className="text-red-600" />
                  Share Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {shareData
                ? "Your analytics view has been saved and can be shared with others"
                : "There was an error creating your share link"}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {shareData && (
            <div className="space-y-4">
              {/* Share details */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {shareData.entityCount}{" "}
                  {shareData.entityCount === 1 ? "Entity" : "Entities"}
                </Badge>
                <Badge variant="secondary">{shareData.chartType} Chart</Badge>
                <Badge variant="secondary">{shareData.dataSource} Data</Badge>
                <Badge variant="outline">Expires in 30 days</Badge>
              </div>

              {/* Share URL */}
              <div className="flex items-center space-x-2">
                <Input
                  value={shareData.shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="px-3"
                >
                  {copied ? (
                    <Icon name="check" size={16} className="text-green-600" />
                  ) : (
                    <Icon name="copy" size={16} />
                  )}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Done
                </Button>
                <Button
                  onClick={handleOpenShare}
                  className="flex items-center gap-2"
                >
                  <Icon name="external-link" size={16} />
                  Open Share
                </Button>
              </div>

              {copied && (
                <p className="text-sm text-green-600 text-center">
                  ✓ Link copied to clipboard
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
