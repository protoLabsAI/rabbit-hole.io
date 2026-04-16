/**
 * Bundle Import Dialog - Research Workspace
 *
 * Validates and imports Rabbit Hole bundles into research graph
 * with comprehensive error handling and progress feedback.
 */

"use client";

import type Graph from "graphology";
import React, { useState, useRef, useCallback } from "react";
import * as Y from "yjs";

import type { UserTier } from "@protolabsai/auth/client";
import { validateRabbitHoleBundle } from "@protolabsai/types";
import type { RabbitHoleBundleData } from "@protolabsai/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@protolabsai/ui/atoms";
import { wouldExceedLimit } from "@protolabsai/utils";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";
import { useWorkspaceLimits } from "../hooks/useWorkspaceLimits";
import { importBundle, type ImportResult } from "../lib/bundle-importer";
import { applyForceLayout } from "../lib/layoutAlgorithms";

interface FileValidationResult {
  file: File;
  isValid: boolean;
  data?: RabbitHoleBundleData;
  preview?: ImportPreview;
  error?: string;
}

interface ImportPreview {
  entities: number;
  relationships: number;
  content: number;
  evidence: number;
  files: number;
  sampleEntities: string[];
  sampleRelationships: string[];
  hasPositions?: boolean;
  positionedCount?: number;
  positionedPercentage?: number;
}

interface BundleImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  ydoc: Y.Doc | null;
  userTier: UserTier;
}

export function BundleImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  graph,
  ydoc,
  userTier,
}: BundleImportDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validatedFiles, setValidatedFiles] = useState<FileValidationResult[]>(
    []
  );
  const [aggregatedPreview, setAggregatedPreview] =
    useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<
    "merge" | "replace" | "overwrite"
  >("merge");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useExportedPositions, setUseExportedPositions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side tier limits from Yjs workspace
  const workspaceLimits = useWorkspaceLimits(ydoc, userTier);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      setSelectedFiles(files);
      setError(null);
      setImportResult(null);
      setValidatedFiles([]);
      setAggregatedPreview(null);

      try {
        const validationResults: FileValidationResult[] = [];
        let totalEntities = 0;
        let totalRelationships = 0;
        let totalContent = 0;
        let totalEvidence = 0;
        let totalFiles = 0;
        const allSampleEntities: string[] = [];
        const allSampleRelationships: string[] = [];

        for (const file of files) {
          try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate with Rabbit Hole schema
            const validation = validateRabbitHoleBundle(data);

            if (!validation.isValid) {
              validationResults.push({
                file,
                isValid: false,
                error: validation.errors.map((e) => e.message).join("; "),
              });
              continue;
            }

            // Calculate position statistics
            const allItems = [
              ...(data.entities || []),
              ...(data.content || []),
              ...(data.evidence || []),
              ...(data.files || []),
            ];
            const positionedItems = allItems.filter(
              (item: any) =>
                item.canvas_x !== undefined && item.canvas_y !== undefined
            );

            // Generate preview
            const filePreview: ImportPreview = {
              entities: data.entities?.length || 0,
              relationships: data.relationships?.length || 0,
              content: data.content?.length || 0,
              evidence: data.evidence?.length || 0,
              files: data.files?.length || 0,
              sampleEntities: (data.entities || [])
                .slice(0, 5)
                .map((e: any) => e.name || e.uid),
              sampleRelationships: (data.relationships || [])
                .slice(0, 5)
                .map((r: any) => r.type || r.uid),
              hasPositions: positionedItems.length > 0,
              positionedCount: positionedItems.length,
              positionedPercentage:
                allItems.length > 0
                  ? Math.round((positionedItems.length / allItems.length) * 100)
                  : 0,
            };

            validationResults.push({
              file,
              isValid: true,
              data,
              preview: filePreview,
            });

            // Aggregate totals
            totalEntities += filePreview.entities;
            totalRelationships += filePreview.relationships;
            totalContent += filePreview.content;
            totalEvidence += filePreview.evidence;
            totalFiles += filePreview.files;

            // Sample entities/relationships (avoid duplicates)
            filePreview.sampleEntities.forEach((entity) => {
              if (
                !allSampleEntities.includes(entity) &&
                allSampleEntities.length < 10
              ) {
                allSampleEntities.push(entity);
              }
            });

            filePreview.sampleRelationships.forEach((rel) => {
              if (
                !allSampleRelationships.includes(rel) &&
                allSampleRelationships.length < 10
              ) {
                allSampleRelationships.push(rel);
              }
            });
          } catch (err) {
            validationResults.push({
              file,
              isValid: false,
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to parse JSON file",
            });
          }
        }

        setValidatedFiles(validationResults);

        if (
          totalEntities > 0 ||
          totalRelationships > 0 ||
          totalContent > 0 ||
          totalEvidence > 0
        ) {
          setAggregatedPreview({
            entities: totalEntities,
            relationships: totalRelationships,
            content: totalContent,
            evidence: totalEvidence,
            files: totalFiles,
            sampleEntities: allSampleEntities,
            sampleRelationships: allSampleRelationships,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to validate files"
        );
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    const validFiles = validatedFiles.filter((v) => v.isValid && v.data);
    if (validFiles.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setError(null);

    try {
      // Client-side tier limit validation
      if (
        !workspaceLimits.ready ||
        !workspaceLimits.usage ||
        !workspaceLimits.limits
      ) {
        setError("Workspace limits not ready. Please try again.");
        setIsImporting(false);
        return;
      }

      // Calculate total incoming entities/relationships
      const totalIncoming = validFiles.reduce(
        (acc, file) => {
          const bundle = file.data;
          if (!bundle) return acc;

          const entities =
            (bundle.entities?.length || 0) +
            (bundle.content?.length || 0) +
            (bundle.evidence?.length || 0) +
            (bundle.files?.length || 0);

          const relationships = bundle.relationships?.length || 0;

          return {
            entities: acc.entities + entities,
            relationships: acc.relationships + relationships,
          };
        },
        { entities: 0, relationships: 0 }
      );

      // Check if would exceed limits
      const limitCheck = wouldExceedLimit(
        workspaceLimits.usage,
        totalIncoming.entities,
        totalIncoming.relationships,
        {
          maxEntities: workspaceLimits.limits.maxEntities,
          maxRelationships: workspaceLimits.limits.maxRelationships,
        }
      );

      if (limitCheck.entities) {
        setError(
          `Import would exceed entity limit by ${limitCheck.entityOverflow} entities. ` +
            `Current: ${workspaceLimits.usage.totalEntities}, ` +
            `Incoming: ${totalIncoming.entities}, ` +
            `Limit: ${workspaceLimits.limits.maxEntities}. ` +
            `Upgrade to ${userTier === "free" ? "BASIC" : "a higher"} tier for more capacity.`
        );
        setIsImporting(false);
        return;
      }

      if (limitCheck.relationships) {
        setError(
          `Import would exceed relationship limit by ${limitCheck.relationshipOverflow} relationships. ` +
            `Current: ${workspaceLimits.usage.totalRelationships}, ` +
            `Incoming: ${totalIncoming.relationships}, ` +
            `Limit: ${workspaceLimits.limits.maxRelationships}.`
        );
        setIsImporting(false);
        return;
      }

      setImportProgress(10);

      // Limits validated - proceed with import
      const results: ImportResult[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const { data } = validFiles[i];
        if (!data) continue;

        const result = await importBundle(graph, data, {
          mode: importMode,
          applyLayout: false, // Use force layout instead of random
          skipEnforcement: true, // Already enforced client-side
          useExportedPositions,
          onProgress: (loaded, total) => {
            const fileProgress = 10 + (i / validFiles.length) * 80;
            const currentProgress = (loaded / total) * (80 / validFiles.length);
            setImportProgress(fileProgress + currentProgress);
          },
        });

        results.push(result);
      }

      // Aggregate results
      const aggregated: ImportResult = {
        entitiesAdded: results.reduce((sum, r) => sum + r.entitiesAdded, 0),
        entitiesSkipped: results.reduce((sum, r) => sum + r.entitiesSkipped, 0),
        contentAdded: results.reduce((sum, r) => sum + r.contentAdded, 0),
        contentSkipped: results.reduce((sum, r) => sum + r.contentSkipped, 0),
        evidenceAdded: results.reduce((sum, r) => sum + r.evidenceAdded, 0),
        evidenceSkipped: results.reduce((sum, r) => sum + r.evidenceSkipped, 0),
        filesAdded: results.reduce((sum, r) => sum + r.filesAdded, 0),
        filesSkipped: results.reduce((sum, r) => sum + r.filesSkipped, 0),
        relationshipsAdded: results.reduce(
          (sum, r) => sum + r.relationshipsAdded,
          0
        ),
        relationshipsSkipped: results.reduce(
          (sum, r) => sum + r.relationshipsSkipped,
          0
        ),
        errors: results.flatMap((r) => r.errors),
        warnings: results.flatMap((r) => r.warnings),
      };

      // Apply force layout once after all imports if any entities were added
      if (aggregated.entitiesAdded > 0) {
        applyForceLayout(graph, {
          strength: -800,
          distance: 250,
          collisionRadius: 120,
        });
      }

      setImportResult(aggregated);
      setImportProgress(100);

      // Call completion callback
      if (onImportComplete) {
        onImportComplete(aggregated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [
    validatedFiles,
    graph,
    importMode,
    onImportComplete,
    workspaceLimits,
    userTier,
    useExportedPositions,
  ]);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setSelectedFiles([]);
      setValidatedFiles([]);
      setAggregatedPreview(null);
      setImportResult(null);
      setError(null);
      setImportProgress(0);
      onOpenChange(false);
    }
  }, [isImporting, onOpenChange]);

  const hasValidFiles = validatedFiles.some((v) => v.isValid);
  const hasErrors = validatedFiles.some((v) => !v.isValid);

  // Calculate if would exceed limits (for preview UI)
  const totalIncomingEntities = aggregatedPreview
    ? aggregatedPreview.entities +
      aggregatedPreview.content +
      aggregatedPreview.evidence +
      aggregatedPreview.files
    : 0;

  const totalIncomingRelationships = aggregatedPreview
    ? aggregatedPreview.relationships
    : 0;

  const limitPreview =
    workspaceLimits.ready && workspaceLimits.usage && workspaceLimits.limits
      ? wouldExceedLimit(
          workspaceLimits.usage,
          totalIncomingEntities,
          totalIncomingRelationships,
          {
            maxEntities: workspaceLimits.limits.maxEntities,
            maxRelationships: workspaceLimits.limits.maxRelationships,
          }
        )
      : null;

  const wouldExceedEntityLimit = limitPreview?.entities || false;
  const wouldExceedRelationshipLimit = limitPreview?.relationships || false;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Import Research Bundle</DialogTitle>
          <DialogDescription>
            Import entities and relationships from Rabbit Hole JSON bundles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          {!importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Files</CardTitle>
                <CardDescription>
                  Choose one or more bundle JSON files to import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isImporting}
                >
                  Choose Files
                </Button>

                {/* File List */}
                {validatedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      Selected Files ({validatedFiles.length}):
                    </div>
                    <div className="space-y-1">
                      {validatedFiles.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm p-2 rounded bg-muted"
                        >
                          <span className="flex-1 truncate">
                            {result.file.name}
                          </span>
                          {result.isValid ? (
                            <Badge variant="default" className="ml-2">
                              ✓ Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="ml-2">
                              ✗ Invalid
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {hasErrors && !importResult && (
            <Alert variant="destructive">
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  {validatedFiles
                    .filter((v) => !v.isValid)
                    .map((result, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium">{result.file.name}:</div>
                        <pre className="mt-1 p-2 bg-destructive/10 rounded text-xs overflow-x-auto">
                          {result.error}
                        </pre>
                      </div>
                    ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {aggregatedPreview && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Entities</TableCell>
                      <TableCell>{aggregatedPreview.entities}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        Relationships
                      </TableCell>
                      <TableCell>{aggregatedPreview.relationships}</TableCell>
                    </TableRow>
                    {aggregatedPreview.content > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Content</TableCell>
                        <TableCell>{aggregatedPreview.content}</TableCell>
                      </TableRow>
                    )}
                    {aggregatedPreview.evidence > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Evidence</TableCell>
                        <TableCell>{aggregatedPreview.evidence}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {aggregatedPreview.sampleEntities.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Sample Entities:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aggregatedPreview.sampleEntities.map((entity, i) => (
                        <Badge key={i} variant="secondary">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {aggregatedPreview.hasPositions && (
                  <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 text-sm text-success">
                      <span className="font-medium">✓ Layout Preserved</span>
                      <span className="text-muted-foreground">
                        {aggregatedPreview.positionedCount} /{" "}
                        {totalIncomingEntities} entities positioned (
                        {aggregatedPreview.positionedPercentage}%)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="w-full space-y-4">
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2 block">
                      Import Mode
                    </div>
                    <Select
                      value={importMode}
                      onValueChange={(v: any) => setImportMode(v)}
                    >
                      <SelectTrigger aria-label="Import Mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">
                          Merge (Add new, skip duplicates)
                        </SelectItem>
                        <SelectItem value="replace">
                          Replace (Clear graph first)
                        </SelectItem>
                        <SelectItem value="overwrite">
                          Overwrite (Update duplicates)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {aggregatedPreview.hasPositions && (
                    <label className="flex items-center gap-2 p-2 hover:bg-accent/50 cursor-pointer rounded">
                      <input
                        type="checkbox"
                        checked={useExportedPositions}
                        onChange={(e) =>
                          setUseExportedPositions(e.target.checked)
                        }
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">
                        Use exported positions (preserve layout)
                      </span>
                    </label>
                  )}
                </div>
              </CardFooter>
            </Card>
          )}

          {/* Workspace Limit Check */}
          {aggregatedPreview &&
            workspaceLimits.ready &&
            workspaceLimits.usage &&
            workspaceLimits.limits &&
            !importResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Workspace Limit Check
                  </CardTitle>
                  <CardDescription>
                    Import impact on your {userTier} tier workspace limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Entity Limit */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Entities</span>
                      <span
                        className={
                          wouldExceedEntityLimit
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {workspaceLimits.usage.totalEntities +
                          totalIncomingEntities}{" "}
                        /{" "}
                        {workspaceLimits.limits.maxEntities === -1
                          ? "Unlimited"
                          : workspaceLimits.limits.maxEntities}
                      </span>
                    </div>
                    <Progress
                      value={
                        workspaceLimits.limits.maxEntities === -1
                          ? 0
                          : ((workspaceLimits.usage.totalEntities +
                              totalIncomingEntities) /
                              workspaceLimits.limits.maxEntities) *
                            100
                      }
                      className={wouldExceedEntityLimit ? "bg-destructive" : ""}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Current: {workspaceLimits.usage.totalEntities}, Adding: +
                      {totalIncomingEntities}
                    </div>
                  </div>

                  {/* Relationship Limit */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Relationships</span>
                      <span
                        className={
                          wouldExceedRelationshipLimit
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {workspaceLimits.usage.totalRelationships +
                          totalIncomingRelationships}{" "}
                        /{" "}
                        {workspaceLimits.limits.maxRelationships === -1
                          ? "Unlimited"
                          : workspaceLimits.limits.maxRelationships}
                      </span>
                    </div>
                    <Progress
                      value={
                        workspaceLimits.limits.maxRelationships === -1
                          ? 0
                          : ((workspaceLimits.usage.totalRelationships +
                              totalIncomingRelationships) /
                              workspaceLimits.limits.maxRelationships) *
                            100
                      }
                      className={
                        wouldExceedRelationshipLimit ? "bg-destructive" : ""
                      }
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Current: {workspaceLimits.usage.totalRelationships},
                      Adding: +{totalIncomingRelationships}
                    </div>
                  </div>

                  {/* Warning if would exceed */}
                  {(wouldExceedEntityLimit || wouldExceedRelationshipLimit) && (
                    <Alert variant="destructive">
                      <AlertTitle>
                        Import Would Exceed {userTier} Tier Limit
                      </AlertTitle>
                      <AlertDescription>
                        {wouldExceedEntityLimit && limitPreview && (
                          <p className="mb-2">
                            This import would exceed your entity limit by{" "}
                            {limitPreview.entityOverflow} entities.
                          </p>
                        )}
                        {wouldExceedRelationshipLimit && limitPreview && (
                          <p className="mb-2">
                            This import would exceed your relationship limit by{" "}
                            {limitPreview.relationshipOverflow} relationships.
                          </p>
                        )}
                        <Button asChild variant="link" className="p-0 h-auto">
                          <a
                            href="/pricing"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Upgrade Now →
                          </a>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Import Progress */}
          {isImporting && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importing...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={importProgress} className="w-full" />
                <div className="text-sm text-muted-foreground mt-2 text-center">
                  {Math.round(importProgress)}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-success">
                  ✓ Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Skipped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Entities</TableCell>
                      <TableCell className="text-success">
                        {importResult.entitiesAdded}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {importResult.entitiesSkipped}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Relationships</TableCell>
                      <TableCell className="text-success">
                        {importResult.relationshipsAdded}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {importResult.relationshipsSkipped}
                      </TableCell>
                    </TableRow>
                    {(importResult.contentAdded > 0 ||
                      importResult.contentSkipped > 0) && (
                      <TableRow>
                        <TableCell>Content</TableCell>
                        <TableCell className="text-success">
                          {importResult.contentAdded}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {importResult.contentSkipped}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Warnings */}
                {importResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTitle>
                      Warnings ({importResult.warnings.length})
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.warnings.slice(0, 5).map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                        {importResult.warnings.length > 5 && (
                          <li>
                            ... and {importResult.warnings.length - 5} more
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>
                      Errors ({importResult.errors.length})
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* General Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription>
                <pre className="text-sm mt-2 p-2 bg-destructive/10 rounded overflow-x-auto">
                  {error}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {importResult ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !hasValidFiles ||
                  isImporting ||
                  wouldExceedEntityLimit === true ||
                  wouldExceedRelationshipLimit === true
                }
              >
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
