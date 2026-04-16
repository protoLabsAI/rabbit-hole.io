/**
 * Export Workflow
 *
 * Validate → Preview → Approve → Merge → Success/Error
 */

"use client";

import type Graph from "graphology";
import React, { useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@protolabsai/ui/atoms";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";
import { useMergeResearch } from "../hooks/queries";
import { exportBundle, downloadBundle } from "../lib/bundle-exporter";
import {
  validateBundle,
  generateBundleSummary,
  type ValidationResult,
} from "../lib/bundle-validator";

interface ExportWorkflowProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  sessionId: string;
  sessionName?: string;
  userId?: string;
  onMergeComplete?: (idMapping: Record<string, string>) => void;
}

type WorkflowStep =
  | "idle"
  | "validating"
  | "preview"
  | "merging"
  | "success"
  | "error";

export function ExportWorkflow({
  graph,
  sessionId,
  sessionName,
  userId,
  onMergeComplete,
}: ExportWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>("idle");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [mergeResult, setMergeResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // React Query mutation
  const mergeResearch = useMergeResearch();

  const handleExport = () => {
    setStep("validating");
    setError(null);

    // Export bundle
    const bundle = exportBundle(graph, { sessionId, sessionName, userId });

    // Validate
    const result = validateBundle(bundle);
    setValidation(result);

    if (!result.valid) {
      setStep("error");
      setError("Bundle validation failed. Please fix errors before merging.");
      return;
    }

    // Generate summary
    const summaryText = generateBundleSummary(bundle);
    setSummary(summaryText);

    setStep("preview");
  };

  const handleMerge = async () => {
    if (!validation) return;

    setStep("merging");
    setError(null);

    try {
      const bundle = exportBundle(graph, { sessionId, sessionName, userId });
      const result = await mergeResearch.mutateAsync(bundle);

      if (result.data) {
        setMergeResult({
          success: true,
          results: result.data.results,
          idMapping: result.data.idMapping,
        });
        setStep("success");
        onMergeComplete?.(result.data.idMapping);
      } else {
        setError(result.error || "Merge failed");
        setStep("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
      setStep("error");
    }
  };

  const handleDownload = () => {
    const bundle = exportBundle(graph, { sessionId, sessionName, userId });
    downloadBundle(bundle);
  };

  const handleClose = () => {
    setStep("idle");
    setValidation(null);
    setSummary("");
    setMergeResult(null);
    setError(null);
  };

  return (
    <>
      <Button onClick={handleExport} variant="default" size="lg">
        Export & Merge to Neo4j
      </Button>

      {/* Preview Dialog */}
      <Dialog open={step === "preview"} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Bundle Before Merge</DialogTitle>
            <DialogDescription>
              Review your research graph before merging to Neo4j
            </DialogDescription>
          </DialogHeader>

          {validation && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-accent/50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {validation.stats.entities}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Entities
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {validation.stats.relationships}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Relationships
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {validation.stats.uniqueTypes}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Entity Types
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border rounded-lg p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {summary}
                </pre>
              </div>

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="border border-warning rounded-lg p-4">
                  <div className="font-semibold text-sm mb-2">
                    ⚠️ Warnings ({validation.warnings.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {validation.warnings.map((warning, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        • {warning.field}: {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleMerge}
                  variant="default"
                  className="flex-1"
                >
                  Approve & Merge
                </Button>
                <Button onClick={handleDownload} variant="outline">
                  Download JSON
                </Button>
                <Button onClick={handleClose} variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merging Dialog */}
      <Dialog open={step === "merging"} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merging to Neo4j...</DialogTitle>
            <DialogDescription>
              Please wait while your research is saved
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={step === "success"} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>✅ Merge Successful!</DialogTitle>
            <DialogDescription>
              Your research has been saved to Neo4j
            </DialogDescription>
          </DialogHeader>

          {mergeResult && (
            <div className="space-y-4">
              <div className="bg-success/10 border border-success rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {mergeResult.results.totalCreated}
                    </div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {mergeResult.results.totalUpdated}
                    </div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {mergeResult.results.totalSkipped}
                    </div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>
              </div>

              {Object.keys(mergeResult.idMapping).length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="font-semibold text-sm mb-2">
                    ID Mappings ({Object.keys(mergeResult.idMapping).length})
                  </div>
                  <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                    {Object.entries(mergeResult.idMapping).map(
                      ([temp, real]) => (
                        <div key={temp}>
                          {String(temp)} → {String(real)}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleClose}
                variant="default"
                className="w-full"
              >
                Continue Researching
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={step === "error"} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>❌ Merge Failed</DialogTitle>
            <DialogDescription>
              There was an error merging your research
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {validation && validation.errors.length > 0 && (
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="font-semibold text-sm mb-2">Errors:</div>
              <div className="space-y-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="text-xs text-destructive">
                    • {err.field}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleClose} variant="default" className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
