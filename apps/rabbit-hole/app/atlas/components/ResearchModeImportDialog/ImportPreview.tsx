/**
 * Import Preview Component
 *
 * Displays entity/relationship counts and type breakdown from preview data.
 */

"use client";

import type { ImportValidation } from "./useResearchImportValidation";

interface ImportPreviewProps {
  isLoading: boolean;
  data?: ImportValidation["preview"];
  limits?: ImportValidation["limits"];
  error: string | null;
}

export function ImportPreview({
  isLoading,
  data,
  limits,
  error,
}: ImportPreviewProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Failed to load preview: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted p-4 space-y-2">
        <div className="h-4 w-48 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-4 w-56 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted p-4 space-y-3">
      <h4 className="font-semibold text-sm">Import Preview</h4>

      <div className="space-y-1 text-sm">
        <div>
          <strong>Entities to Import:</strong> {data.entities}
        </div>
        <div>
          <strong>Relationships to Import:</strong> {data.relationships}
        </div>
      </div>

      {Object.keys(data.entityTypeBreakdown).length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Entity Types:</div>
          <div className="text-sm space-y-0.5 ml-4">
            {Object.entries(data.entityTypeBreakdown).map(([type, count]) => (
              <div key={type}>
                • {type}: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {limits && (
        <div className="pt-2 border-t text-sm text-muted-foreground">
          Available after import:{" "}
          {limits.entities.max === -1
            ? "unlimited"
            : `${limits.entities.max - limits.entities.afterImport} entity slots`}
        </div>
      )}
    </div>
  );
}
