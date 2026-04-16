/**
 * Bulk Import Panel - Rabbit Hole Schema Bundle Ingestion
 *
 * Allows uploading JSON files with evidence, entities, content, and relationships
 * using the unified Rabbit Hole schema format via /api/ingest-bundle
 */

"use client";

import React, { useState, useRef } from "react";

import { validateRabbitHoleBundle } from "@protolabsai/types";

interface BulkImportPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onImportComplete?: (result: any) => void;
}

interface ImportPreview {
  entities: number;
  relationships: number;
  content: number;
  evidence: number;
  files: number;
  sample_entities: string[];
  sample_relationships: string[];
  fileCount: number;
  totalSizeKB: number;
}

interface FileValidationResult {
  file: File;
  isValid: boolean;
  data?: any;
  preview?: ImportPreview;
  error?: string;
}

export function BulkImportPanel({
  isVisible,
  onClose,
  onImportComplete,
}: BulkImportPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validatedFiles, setValidatedFiles] = useState<FileValidationResult[]>(
    []
  );
  const [aggregatedPreview, setAggregatedPreview] =
    useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importScope, setImportScope] = useState<"tenant" | "public">("tenant");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clerk removed — all users are admin in local mode
  const organization = { id: "local-org", name: "Local Org" } as any;
  const isAdmin = true;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setSelectedFiles(files);
    setError(null);
    setImportResults([]);
    setValidatedFiles([]);
    setAggregatedPreview(null);

    console.log(`🔍 Validating ${files.length} file(s)...`);

    try {
      const validationResults: FileValidationResult[] = [];
      let totalEntities = 0;
      let totalRelationships = 0;
      let totalContent = 0;
      let totalEvidence = 0;
      let totalFiles = 0;
      const allSampleEntities: string[] = [];
      const allSampleRelationships: string[] = [];
      let totalSizeKB = 0;

      for (const file of files) {
        totalSizeKB += Math.round(file.size / 1024);

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

          // Generate preview for this file
          const filePreview = {
            entities: data.entities?.length || 0,
            relationships: data.relationships?.length || 0,
            content: data.content?.length || 0,
            evidence: data.evidence?.length || 0,
            files: data.files?.length || 0,
            sample_entities: (data.entities || [])
              .slice(0, 5)
              .map((e: any) => e.name || e.uid),
            sample_relationships: (data.relationships || [])
              .slice(0, 5)
              .map((r: any) => r.type || r.uid),
            fileCount: 1,
            totalSizeKB: Math.round(file.size / 1024),
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
          filePreview.sample_entities.forEach((entity: any) => {
            if (
              !allSampleEntities.includes(entity) &&
              allSampleEntities.length < 10
            ) {
              allSampleEntities.push(entity);
            }
          });

          filePreview.sample_relationships.forEach((rel: any) => {
            if (
              !allSampleRelationships.includes(rel) &&
              allSampleRelationships.length < 10
            ) {
              allSampleRelationships.push(rel);
            }
          });
        } catch (fileErr) {
          validationResults.push({
            file,
            isValid: false,
            error: `Invalid JSON file: ${fileErr}`,
          });
        }
      }

      setValidatedFiles(validationResults);

      // Check if any files are invalid
      const invalidFiles = validationResults.filter(
        (result) => !result.isValid
      );
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles
          .map((result) => `${result.file.name}: ${result.error}`)
          .join("\n\n");
        setError(
          `${invalidFiles.length} file(s) failed validation:\n\n${errorMessages}`
        );
      }

      // Set aggregated preview only if we have valid files
      const validFiles = validationResults.filter((result) => result.isValid);
      if (validFiles.length > 0) {
        const aggregated: ImportPreview = {
          entities: totalEntities,
          relationships: totalRelationships,
          content: totalContent,
          evidence: totalEvidence,
          files: totalFiles,
          sample_entities: allSampleEntities,
          sample_relationships: allSampleRelationships,
          fileCount: validFiles.length,
          totalSizeKB,
        };

        setAggregatedPreview(aggregated);
        console.log(
          `✅ ${validFiles.length}/${files.length} files validated successfully`
        );
      }
    } catch (err) {
      setError(`File processing error: ${err}`);
      setSelectedFiles([]);
    }
  };

  const handleImport = async () => {
    const validFiles = validatedFiles.filter((result) => result.isValid);
    if (validFiles.length === 0) {
      console.warn("⚠️ No valid files selected for import");
      return;
    }

    console.log(`🚀 Starting batch import of ${validFiles.length} file(s)...`);
    setIsProcessing(true);
    setError(null);
    setImportResults([]);
    setCurrentFileIndex(0);

    const results: any[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const fileResult = validFiles[i];
        setCurrentFileIndex(i);
        setProcessingStatus(
          `Importing ${fileResult.file.name}... (${i + 1}/${validFiles.length})`
        );

        console.log(
          `📦 Importing file ${i + 1}/${validFiles.length}: ${fileResult.file.name}`
        );

        try {
          // Use new merge strategy format with default "keep_local"
          const requestBody = {
            data: fileResult.data,
            scope: importScope,
            mergeOptions: {
              strategy: "keep_local", // Default: preserve existing entities
              preserveTimestamps: true,
              conflictResolution: "local",
            },
          };

          const response = await fetch("/api/ingest-bundle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          const result = await response.json();
          console.log(`🔍 Import response for ${fileResult.file.name}:`, {
            responseOk: response.ok,
            status: response.status,
            resultSuccess: result.success,
            hasData: !!result.data,
            error: result.error,
          });

          if (response.ok && result.success) {
            console.log(
              `✅ File ${fileResult.file.name} imported successfully`,
              result.data
            );
            results.push({
              fileName: fileResult.file.name,
              success: true,
              data: result.data,
              preview: fileResult.preview,
            });
          } else {
            const errorMsg =
              result.error || result.data?.error || "Unknown error";
            console.error(
              `❌ File ${fileResult.file.name} import failed:`,
              errorMsg,
              { fullResult: result }
            );
            results.push({
              fileName: fileResult.file.name,
              success: false,
              error: errorMsg,
              preview: fileResult.preview,
            });
          }
        } catch (fileErr) {
          console.error(`❌ Error importing ${fileResult.file.name}:`, fileErr);
          results.push({
            fileName: fileResult.file.name,
            success: false,
            error: `Import error: ${fileErr}`,
            preview: fileResult.preview,
          });
        }

        // Small delay between imports to avoid overwhelming the server
        if (i < validFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setImportResults(results);

      // Check overall success
      const successfulImports = results.filter((r) => r.success);
      const failedImports = results.filter((r) => !r.success);

      if (successfulImports.length > 0) {
        console.log(
          `✅ Batch import completed: ${successfulImports.length} successful, ${failedImports.length} failed`
        );

        // Aggregate results for callback
        const aggregatedResult = {
          summary: {
            entitiesCreated: successfulImports.reduce(
              (sum, r) => sum + (r.data?.summary?.entitiesCreated || 0),
              0
            ),
            relationshipsCreated: successfulImports.reduce(
              (sum, r) => sum + (r.data?.summary?.relationshipsCreated || 0),
              0
            ),
            contentCreated: successfulImports.reduce(
              (sum, r) => sum + (r.data?.summary?.contentCreated || 0),
              0
            ),
            evidenceCreated: successfulImports.reduce(
              (sum, r) => sum + (r.data?.summary?.evidenceCreated || 0),
              0
            ),
            filesCreated: successfulImports.reduce(
              (sum, r) => sum + (r.data?.summary?.filesCreated || 0),
              0
            ),
          },
          filesProcessed: {
            successful: successfulImports.length,
            failed: failedImports.length,
            total: results.length,
          },
        };

        console.log(
          "🔍 Calling onImportComplete callback with:",
          aggregatedResult
        );
        onImportComplete?.(aggregatedResult);
        console.log("✅ onImportComplete callback executed");

        // Clear form after successful batch import
        setTimeout(() => {
          console.log("🧹 Clearing batch import form state...");
          setSelectedFiles([]);
          setValidatedFiles([]);
          setAggregatedPreview(null);
          setImportResults([]);
        }, 8000);
      }

      if (failedImports.length > 0) {
        const errorMessages = failedImports
          .map((r) => `${r.fileName}: ${r.error}`)
          .join("\n");
        setError(
          `${failedImports.length} file(s) failed to import:\n\n${errorMessages}`
        );
      }
    } catch (err) {
      setError(`Batch import error: ${err}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      setCurrentFileIndex(0);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setValidatedFiles([]);
    setAggregatedPreview(null);
    setImportResults([]);
    setError(null);
    setProcessingStatus("");
    setCurrentFileIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Bulk Import Knowledge Graph Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload multiple JSON files with entities, relationships, speech
                acts, and evidence for batch import
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              📁 Select JSON Files (Multiple selection supported)
            </label>
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                multiple
                onChange={handleFileSelect}
                className="flex-1 text-sm text-foreground-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {selectedFiles.length > 0 && (
                <button
                  onClick={resetForm}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Selected Files ({selectedFiles.length}):
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {validatedFiles.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span
                        className={`flex-1 ${result.isValid ? "text-foreground-secondary" : "text-error"}`}
                      >
                        {result.file.name} (
                        {Math.round(result.file.size / 1024)}KB)
                      </span>
                      <span className="ml-2">
                        {result.isValid ? "✅" : "❌"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-start">
                <span className="text-error text-xl mr-3 mt-1">❌</span>
                <div className="flex-1">
                  <h4 className="text-error font-medium">Import Error</h4>
                  <pre className="text-error text-sm mt-2 whitespace-pre-wrap font-mono bg-error/10 p-3 rounded border overflow-x-auto">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Scope Selector (Admin Only) */}
          {isAdmin &&
            selectedFiles.length > 0 &&
            importResults.length === 0 && (
              <div className="mb-6 p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
                <h3 className="text-sm font-semibold text-warning mb-3">
                  ⚠️ Import Scope (Admin Only)
                </h3>

                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      value="tenant"
                      checked={importScope === "tenant"}
                      onChange={() => setImportScope("tenant")}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        🔒 My Organization (Private)
                      </div>
                      <div className="text-sm text-gray-600">
                        Only members of your organization can see this data.
                        Counts toward your quota limits.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      value="public"
                      checked={importScope === "public"}
                      onChange={() => setImportScope("public")}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        🌐 Public Database (Visible to All)
                      </div>
                      <div className="text-sm text-gray-600">
                        Example/seed data accessible to all users. Does NOT
                        count toward quotas.
                      </div>
                    </div>
                  </label>
                </div>

                {importScope === "public" && (
                  <div className="mt-3 p-3 bg-warning/20 border border-warning/30 rounded text-sm text-warning">
                    <strong>⚠️ Warning:</strong> Public data is read-only for
                    regular users and visible across all organizations. Use for
                    examples and seed data only.
                  </div>
                )}
              </div>
            )}

          {/* Preview */}
          {aggregatedPreview && importResults.length === 0 && (
            <div className="mb-6 p-4 bg-info/10 border border-info/20 rounded-lg">
              <h3 className="text-info font-medium mb-3">📊 Import Preview</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-primary">
                    {aggregatedPreview.entities}
                  </div>
                  <div className="text-xs text-primary">Entities</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-success">
                    {aggregatedPreview.relationships}
                  </div>
                  <div className="text-xs text-success">Relationships</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-accent">
                    {aggregatedPreview.content}
                  </div>
                  <div className="text-xs text-accent">Content</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-secondary">
                    {aggregatedPreview.files}
                  </div>
                  <div className="text-xs text-secondary">Files</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-amber-600">
                    {aggregatedPreview.evidence}
                  </div>
                  <div className="text-xs text-amber-700">Evidence</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-orange-600">
                    {aggregatedPreview.fileCount}
                  </div>
                  <div className="text-xs text-orange-700">Files Selected</div>
                </div>
              </div>

              {aggregatedPreview.sample_entities.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-info mb-1">
                    Sample Entities:
                  </h4>
                  <div className="text-sm text-info">
                    {aggregatedPreview.sample_entities.join(", ")}
                    {aggregatedPreview.entities > 10 &&
                      ` + ${aggregatedPreview.entities - 10} more`}
                  </div>
                </div>
              )}

              {aggregatedPreview.sample_relationships.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-info mb-1">
                    Sample Relationships:
                  </h4>
                  <div className="text-sm text-info">
                    {aggregatedPreview.sample_relationships.join(", ")}
                    {aggregatedPreview.relationships > 10 &&
                      ` + ${aggregatedPreview.relationships - 10} more`}
                  </div>
                </div>
              )}

              <div className="mb-4 p-3 bg-info/20 rounded-lg text-sm text-info">
                <strong>📁 Batch Import:</strong> Processing{" "}
                {aggregatedPreview.fileCount} files (
                {aggregatedPreview.totalSizeKB}KB total)
              </div>

              <div className="bg-info/20 p-3 rounded-lg text-sm text-info">
                <strong>💡 Merge Strategy:</strong> Existing entities will be
                updated with new data. Duplicate relationships will be updated,
                not duplicated.
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults.length > 0 && (
            <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center mb-3">
                <span className="text-success text-xl mr-2">✅</span>
                <h3 className="text-success font-medium">
                  Batch Import Complete!
                </h3>
              </div>

              {/* File-by-File Results */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-success mb-2">
                  File Results:
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {importResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                        result.success ? "bg-success/20" : "bg-error/20"
                      }`}
                    >
                      <span
                        className={
                          result.success ? "text-success" : "text-error"
                        }
                      >
                        {result.fileName}
                      </span>
                      <span className="ml-2">
                        {result.success ? "✅" : "❌"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aggregated Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-primary">
                    {importResults
                      .filter((r) => r.success)
                      .reduce(
                        (sum, r) =>
                          sum + (r.data?.summary?.entitiesCreated || 0),
                        0
                      )}
                  </div>
                  <div className="text-xs text-primary">Total Entities</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-success">
                    {importResults
                      .filter((r) => r.success)
                      .reduce(
                        (sum, r) =>
                          sum + (r.data?.summary?.relationshipsCreated || 0),
                        0
                      )}
                  </div>
                  <div className="text-xs text-success">
                    Total Relationships
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-accent">
                    {importResults
                      .filter((r) => r.success)
                      .reduce(
                        (sum, r) =>
                          sum + (r.data?.summary?.contentCreated || 0),
                        0
                      )}
                  </div>
                  <div className="text-xs text-accent">Content</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-secondary">
                    {importResults
                      .filter((r) => r.success)
                      .reduce(
                        (sum, r) => sum + (r.data?.summary?.filesCreated || 0),
                        0
                      )}
                  </div>
                  <div className="text-xs text-secondary">Files</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-amber-600">
                    {importResults
                      .filter((r) => r.success)
                      .reduce(
                        (sum, r) =>
                          sum + (r.data?.summary?.evidenceCreated || 0),
                        0
                      )}
                  </div>
                  <div className="text-xs text-amber-700">Evidence</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-orange-600">
                    {importResults.filter((r) => r.success).length}/
                    {importResults.length}
                  </div>
                  <div className="text-xs text-orange-700">
                    Files Successful
                  </div>
                </div>
              </div>

              <div className="text-success text-sm mt-3">
                Batch import completed with graceful merging. Refresh the Atlas
                to see all changes from the imported files.
              </div>
            </div>
          )}

          {/* JSON Format Guide */}
          {selectedFiles.length === 0 && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 mb-3">
                📋 Rabbit Hole Schema Format
              </h3>
              <div className="text-sm text-gray-700 mb-3">
                Upload JSON files using the evidence-based bundle format.
                Client-side validation ensures proper structure before upload.
              </div>
              <pre className="text-xs text-slate-500 bg-white p-3 rounded border overflow-x-auto">
                {`{
  "evidence": [
    {
      "uid": "evidence:wapo_2024_election",
      "kind": "major_media",
      "title": "Election Misinformation Analysis",
      "publisher": "Washington Post",
      "date": "2024-11-15",
      "url": "https://washingtonpost.com/election-misinfo",
      "reliability": 0.9
    }
  ],
  "content": [
    {
      "uid": "content:truth_social_election_post",
      "content_type": "post",
      "platform_uid": "platform:truth_social",
      "author_uid": "person:donald_trump",
      "published_at": "2024-11-10T14:30:00Z",
      "text_excerpt": "The election was rigged..."
    }
  ],
  "entities": [
    {
      "uid": "person:donald_trump",
      "type": "Person",
      "name": "Donald J. Trump",
      "aliases": ["DJT", "Trump"],
      "tags": ["politician", "president_45"]
    }
  ],
  "relationships": [
    {
      "uid": "rel:trump_election_speech",
      "type": "SPEECH_ACT",
      "source": "person:donald_trump",
      "target": "content:truth_social_election_post",
      "at": "2024-11-10T14:30:00Z",
      "properties": {
        "category": "election_denial",
        "sentiment": "hostile",
        "intensity": "high",
        "confidence": 0.95,
        "evidence_uids": ["evidence:wapo_2024_election"]
      }
    }
  ]
}`}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📁 Choose Files
              </button>

              {validatedFiles.filter((f) => f.isValid).length > 0 &&
                importResults.length === 0 && (
                  <button
                    onClick={handleImport}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing
                      ? "⏳ Processing..."
                      : `🚀 Import ${validatedFiles.filter((f) => f.isValid).length} File${validatedFiles.filter((f) => f.isValid).length > 1 ? "s" : ""}`}
                  </button>
                )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="mt-4 p-4 bg-info/10 border border-info/20 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                <div className="flex-1">
                  <div className="text-info font-medium">
                    Processing Batch Import...
                  </div>
                  <div className="text-info text-sm">{processingStatus}</div>
                  {aggregatedPreview && (
                    <div className="text-info text-xs mt-1">
                      Total to import: {aggregatedPreview.entities} entities,{" "}
                      {aggregatedPreview.relationships} relationships,
                      {aggregatedPreview.content} content items,{" "}
                      {aggregatedPreview.evidence} evidence entries
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {validatedFiles.length > 1 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm text-info mb-1">
                    <span>Progress</span>
                    <span>
                      {currentFileIndex + 1} /{" "}
                      {validatedFiles.filter((f) => f.isValid).length}
                    </span>
                  </div>
                  <div className="w-full bg-primary/20 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentFileIndex + 1) / validatedFiles.filter((f) => f.isValid).length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              <strong>Selected:</strong> {selectedFiles.length} file
              {selectedFiles.length > 1 ? "s" : ""}(
              {Math.round(
                selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024
              )}
              KB total)
              {validatedFiles.filter((f) => !f.isValid).length > 0 && (
                <span className="text-error ml-2">
                  ({validatedFiles.filter((f) => !f.isValid).length} invalid)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
