/**
 * Bundle Preview Card
 *
 * Generative UI component showing final extraction bundle status.
 */

import React from "react";

import { Icon } from "@proto/icon-system";
import { Badge, Button } from "@proto/ui/atoms";

interface BundlePreviewProps {
  entityCount: number;
  relationshipCount: number;
  isValid: boolean;
  validationErrors?: string[];
  onDownload?: () => void;
  onViewGraph?: () => void;
}

export function BundlePreview({
  entityCount,
  relationshipCount,
  isValid,
  validationErrors = [],
  onDownload,
  onViewGraph,
}: BundlePreviewProps) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="package" size={16} className="text-violet-600" />
        <span className="text-sm font-medium">Extraction Complete</span>
        {isValid ? (
          <Badge
            variant="outline"
            className="text-xs border-green-500 text-green-700"
          >
            ✓ Valid
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs border-red-500 text-red-700"
          >
            ✗ Invalid
          </Badge>
        )}
      </div>

      {/* Bundle stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex flex-col items-center justify-center bg-muted/50 p-2 rounded">
          <div className="text-2xl font-bold">{entityCount}</div>
          <div className="text-xs text-muted-foreground">Entities</div>
        </div>
        <div className="flex flex-col items-center justify-center bg-muted/50 p-2 rounded">
          <div className="text-2xl font-bold">{relationshipCount}</div>
          <div className="text-xs text-muted-foreground">Relationships</div>
        </div>
      </div>

      {/* Validation errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="font-medium text-red-700 mb-1">
            Validation Issues:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-red-600">
            {validationErrors.slice(0, 3).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          {validationErrors.length > 3 && (
            <div className="text-red-500 mt-1">
              +{validationErrors.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onViewGraph && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewGraph}
            className="flex-1"
          >
            <Icon name="eye" size={14} className="mr-1" />
            View Graph
          </Button>
        )}
        {onDownload && (
          <Button size="sm" onClick={onDownload} className="flex-1">
            <Icon name="download" size={14} className="mr-1" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
