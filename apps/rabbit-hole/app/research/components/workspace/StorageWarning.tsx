/**
 * Storage Warning Component
 *
 * Display storage quota warnings for free tier users.
 */

"use client";

import {
  Button,
  Progress,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@proto/ui/atoms";
import { formatBytes } from "@proto/utils";

import type { StorageQuotaState } from "../../hooks/useStorageQuota";

interface StorageWarningProps {
  quota: StorageQuotaState;
  onUpgrade?: () => void;
}

export function StorageWarning({ quota, onUpgrade }: StorageWarningProps) {
  if (!quota.ready || (!quota.warning && !quota.critical && !quota.blocked)) {
    return null;
  }

  const variant = quota.blocked
    ? "destructive"
    : quota.critical
      ? "destructive"
      : "default";

  return (
    <Alert variant={variant}>
      <AlertTitle>
        {quota.blocked && "Storage Limit Reached"}
        {quota.critical && !quota.blocked && "Storage Almost Full"}
        {quota.warning && !quota.critical && "Storage Warning"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Browser Storage</span>
            <span className="font-medium">
              {formatBytes(quota.used)} / {formatBytes(quota.total)}
            </span>
          </div>
          <Progress value={quota.percentUsed} className="h-2" />
        </div>

        {quota.blocked && (
          <p className="text-sm">
            Your browser storage is full. Please delete old workspaces or tabs
            to continue, or upgrade to cloud storage.
          </p>
        )}

        {quota.critical && !quota.blocked && (
          <p className="text-sm">
            You&apos;re using {Math.round(quota.percentUsed)}% of your browser
            storage. Consider cleaning up old data or upgrading for cloud
            storage.
          </p>
        )}

        {quota.warning && !quota.critical && (
          <p className="text-sm">
            You&apos;re using {Math.round(quota.percentUsed)}% of your browser
            storage.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          {onUpgrade && (
            <Button size="sm" onClick={onUpgrade}>
              Upgrade for Cloud Storage
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
