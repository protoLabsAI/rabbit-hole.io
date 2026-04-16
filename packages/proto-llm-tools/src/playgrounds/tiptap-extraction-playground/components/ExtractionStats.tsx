"use client";

import { Badge } from "@protolabsai/ui";

import type { ExtractionWorkflowResult } from "../../../hooks/useExtractionWorkflow";

interface ExtractionStatsProps {
  result: ExtractionWorkflowResult;
}

export function ExtractionStats({ result }: ExtractionStatsProps) {
  const entityCount = Object.keys(result.enrichedEntities || {}).length;
  const relationshipCount = (result.relationships || []).length;
  const totalTime = Object.values(result.processingTime || {}).reduce(
    (sum, time) => sum + time,
    0
  );

  const entityTypeBreakdown = result.enrichedEntities
    ? Object.values(result.enrichedEntities).reduce(
        (acc, entity) => {
          const type = entity.type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    : {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Extraction Results</h4>
        <Badge variant="outline">{(totalTime / 1000).toFixed(2)}s</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{entityCount}</div>
          <div className="text-xs text-muted-foreground">Entities</div>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{relationshipCount}</div>
          <div className="text-xs text-muted-foreground">Relationships</div>
        </div>
      </div>

      {Object.keys(entityTypeBreakdown).length > 0 && (
        <div>
          <h5 className="text-xs font-semibold mb-2">Entity Types</h5>
          <div className="flex flex-wrap gap-1">
            {Object.entries(entityTypeBreakdown).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {result.processingTime &&
        Object.keys(result.processingTime).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold mb-2">Processing Time</h5>
            <div className="space-y-1">
              {Object.entries(result.processingTime).map(([phase, time]) => (
                <div key={phase} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {phase}
                  </span>
                  <span className="font-mono">{time}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {result.errorLog && result.errorLog.length > 0 && (
        <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
          <h5 className="text-xs font-semibold text-destructive mb-1">
            Errors
          </h5>
          {result.errorLog.map((error, i) => (
            <p key={i} className="text-xs text-destructive/80">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
