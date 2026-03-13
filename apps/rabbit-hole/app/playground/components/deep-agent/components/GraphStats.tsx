"use client";

import { Icon } from "@proto/icon-system";

export interface GraphStatsProps {
  evidenceCount: number;
  entityCount: number;
  relationshipCount: number;
  confidence?: number;
  completeness?: number;
  isLoading?: boolean;
}

/**
 * Graph Stats Component
 *
 * React 19: memo() removed - React Compiler handles memoization.
 */
export function GraphStats({
  evidenceCount,
  entityCount,
  relationshipCount,
  confidence,
  completeness,
  isLoading,
}: GraphStatsProps) {
  return (
    <div className="absolute top-4 left-4 bg-background/95 border rounded-lg shadow-lg p-3 space-y-2 z-10 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground uppercase">
          Graph Stats
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <div className="animate-spin">
              <Icon name="loader-2" size={12} />
            </div>
            <span>Updating...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div
            className="text-2xl font-bold tabular-nums"
            suppressHydrationWarning
          >
            {evidenceCount}
          </div>
          <div className="text-xs text-muted-foreground">Evidence</div>
        </div>
        <div>
          <div
            className="text-2xl font-bold tabular-nums"
            suppressHydrationWarning
          >
            {entityCount}
          </div>
          <div className="text-xs text-muted-foreground">Entities</div>
        </div>
        <div>
          <div
            className="text-2xl font-bold tabular-nums"
            suppressHydrationWarning
          >
            {relationshipCount}
          </div>
          <div className="text-xs text-muted-foreground">Relations</div>
        </div>
      </div>

      {(confidence !== undefined && confidence > 0) ||
      (completeness !== undefined && completeness > 0) ? (
        <div className="pt-2 border-t grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-lg font-bold tabular-nums">
              {Math.round((confidence || 0) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums">
              {Math.round((completeness || 0) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
