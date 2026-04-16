"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@protolabsai/ui/atoms";

import type { MergeResults } from "../../actions/research-merge";
import { useMergeResearch } from "../../hooks/queries/useResearchMerge";
import type { ResearchBundle } from "../../lib/bundle-validator";

interface MergeToNeo4jDialogProps {
  isOpen: boolean;
  bundle: ResearchBundle;
  onClose: () => void;
}

interface PreviewStats {
  entities: {
    total: number;
    create: number;
    update: number;
    byType: Record<string, number>;
  };
  relationships: {
    total: number;
    create: number;
    update: number;
  };
}

function analyzeBundle(bundle: ResearchBundle): PreviewStats {
  const stats: PreviewStats = {
    entities: {
      total: bundle.entities.length,
      create: 0,
      update: 0,
      byType: {},
    },
    relationships: {
      total: bundle.relationships.length,
      create: 0,
      update: 0,
    },
  };

  // Count entity types
  bundle.entities.forEach((entity) => {
    const type = entity.type;
    stats.entities.byType[type] = (stats.entities.byType[type] || 0) + 1;
  });

  // Note: We can't accurately predict create vs update without checking Neo4j.
  // The server-side MERGE operation will determine this during execution.
  // The preview just shows totals.

  return stats;
}

export function MergeToNeo4jDialog({
  isOpen,
  bundle,
  onClose,
}: MergeToNeo4jDialogProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<MergeResults | null>(null);
  const router = useRouter();
  const mergeMutation = useMergeResearch();
  const stats = analyzeBundle(bundle);

  const handleMerge = async () => {
    try {
      const result = await mergeMutation.mutateAsync(bundle);

      // Check if result has data (success) or error
      if (result && "data" in result && result.data) {
        setMergeSuccess(result.data.results);
        // Keep dialog open so user can see results
      }
    } catch (error) {
      console.error("❌ Merge error:", error);
      // Error is already displayed via mergeMutation.error
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden border">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Merge to Neo4j Knowledge Graph</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Review changes before merging local research into the global graph
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Warning Banner */}
          {!mergeSuccess && (
            <div className="rounded-lg border border-warning bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-warning text-xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-warning">
                    Global Knowledge Graph Modification
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will merge data into the production Neo4j database.
                    Existing entities will be updated, new entities will be
                    created.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Stats */}
          <div className="rounded-lg border bg-muted p-4 space-y-3">
            <h4 className="font-semibold text-sm">Merge Preview</h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Entities */}
              <div>
                <div className="text-sm font-medium">Entities</div>
                <div className="text-2xl font-bold">{stats.entities.total}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Will create or update
                </div>
              </div>

              {/* Relationships */}
              <div>
                <div className="text-sm font-medium">Relationships</div>
                <div className="text-2xl font-bold">
                  {stats.relationships.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Will create or update
                </div>
              </div>
            </div>

            {/* Entity Type Breakdown */}
            {Object.keys(stats.entities.byType).length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <div className="text-sm font-medium">Entity Types:</div>
                <div className="text-sm space-y-0.5 ml-4">
                  {Object.entries(stats.entities.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type}>
                        • {type}: {count}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Show Details Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide" : "Show"} Detailed Changes
          </Button>

          {/* Detailed View (Optional) */}
          {showDetails && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Entities to Merge</h4>
              <div className="max-h-64 overflow-y-auto border rounded p-2 text-xs font-mono">
                {bundle.entities.map((entity) => (
                  <div key={entity.uid} className="py-1">
                    <span
                      className={
                        entity.uid.startsWith("temp-")
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      {entity.uid.startsWith("temp-") ? "CREATE" : "UPDATE"}
                    </span>
                    {" → "}
                    <span className="text-foreground">
                      {entity.type}: {entity.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Display */}
          {mergeSuccess && (
            <div className="rounded-lg border border-success bg-success/10 p-4">
              <h4 className="font-semibold text-success text-lg mb-3">
                ✅ Merge Successful!
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">
                      Entities
                    </div>
                    <div className="text-2xl font-bold">
                      {mergeSuccess.entities.created +
                        mergeSuccess.entities.updated}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-success">
                        {mergeSuccess.entities.created} new
                      </span>
                      {" · "}
                      <span className="text-warning">
                        {mergeSuccess.entities.updated} updated
                      </span>
                      {mergeSuccess.entities.skipped > 0 &&
                        ` · ${mergeSuccess.entities.skipped} skipped`}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">
                      Relationships
                    </div>
                    <div className="text-2xl font-bold">
                      {mergeSuccess.relationships.created +
                        mergeSuccess.relationships.updated}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-success">
                        {mergeSuccess.relationships.created} new
                      </span>
                      {" · "}
                      <span className="text-warning">
                        {mergeSuccess.relationships.updated} updated
                      </span>
                      {mergeSuccess.relationships.skipped > 0 &&
                        ` · ${mergeSuccess.relationships.skipped} skipped`}
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Button
                    onClick={() => router.push("/atlas")}
                    className="w-full"
                  >
                    View in Atlas →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {mergeMutation.isError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <h4 className="font-semibold text-destructive">Merge Failed</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {mergeMutation.error instanceof Error
                  ? mergeMutation.error.message
                  : "Unknown error occurred"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {mergeMutation.isPending && "Merging data to Neo4j..."}
            {mergeSuccess && "✅ Merge complete!"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mergeMutation.isPending}
            >
              {mergeSuccess ? "Close" : "Cancel"}
            </Button>
            {!mergeSuccess && (
              <Button
                variant="default"
                onClick={handleMerge}
                disabled={mergeMutation.isPending}
              >
                {mergeMutation.isPending ? "Merging..." : "Merge to Neo4j"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
