/**
 * BiographicalAnalysisDialog Component - Rabbit Hole Schema
 *
 * Displays comprehensive biographical analysis including:
 * - Missing biographical data gaps
 * - Research priority recommendations
 * - Search guidance and sources
 * - Completeness metrics
 */

import { useState, useEffect } from "react";

interface BiographicalAnalysisData {
  entityId: string;
  entityName: string;
  entityType: string;
  availableData: {
    bio: boolean;
    birthDate: boolean;
    birthPlace: boolean;
    deathDate: boolean;
    deathPlace: boolean;
    nationality: boolean;
    occupation: boolean;
    politicalParty: boolean;
    education: boolean;
    netWorth: boolean;
    residence: boolean;
    aliases: boolean;
  };
  missingFields: Array<{
    field: string;
    displayName: string;
    priority: "high" | "medium" | "low";
    researchSuggestion: string;
  }>;
  researchPriority: {
    totalGaps: number;
    highPriorityGaps: number;
    completenessScore: number;
    researchDifficulty: "easy" | "medium" | "hard";
  };
  researchGuidance: {
    primarySources: string[];
    searchKeywords: string[];
    expectedDataSources: string[];
    estimatedResearchTime: string;
  };
}

interface BiographicalAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityUid: string;
  entityName: string;
}

export function BiographicalAnalysisDialog({
  isOpen,
  onClose,
  entityUid,
  entityName,
}: BiographicalAnalysisDialogProps) {
  const [analysisData, setAnalysisData] =
    useState<BiographicalAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load biographical analysis when dialog opens
  useEffect(() => {
    if (isOpen && entityUid) {
      loadBiographicalAnalysis();
    }
  }, [isOpen, entityUid]);

  const loadBiographicalAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/research/biographical/${entityUid}`);

      if (!response.ok) {
        throw new Error(
          `Failed to load biographical analysis: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        setAnalysisData(result.data);
      } else {
        throw new Error(result.error || "Failed to load biographical analysis");
      }
    } catch (err) {
      console.error("Biographical analysis error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card/95 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-border">
        {/* Dialog Header */}
        <div className="p-6 border-b border bg-gradient-to-r from-background-secondary to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-3xl mr-3 filter drop-shadow-sm">👤</div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  Biographical Analysis
                </h2>
                <p className="text-sm text-foreground-secondary">
                  Research gaps and completeness analysis for {entityName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-foreground-muted hover:text-foreground-secondary text-xl transition-colors hover:bg-background-muted rounded-full p-2 w-10 h-10 flex items-center justify-center"
              aria-label="Close analysis dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-sm text-foreground-secondary">
                  Loading biographical analysis...
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-error text-lg mb-2">⚠️</div>
                <div className="text-sm text-error mb-4">{error}</div>
                <button
                  onClick={loadBiographicalAnalysis}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          ) : analysisData ? (
            <div className="space-y-6">
              {/* Analysis Overview */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/20 rounded-lg p-4 border border-primary/20">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  Analysis Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(
                        analysisData.researchPriority.completenessScore * 100
                      )}
                      %
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Complete
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {analysisData.researchPriority.totalGaps}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Missing Fields
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-error">
                      {analysisData.researchPriority.highPriorityGaps}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      High Priority
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${
                        analysisData.researchPriority.researchDifficulty ===
                        "easy"
                          ? "text-success"
                          : analysisData.researchPriority.researchDifficulty ===
                              "medium"
                            ? "text-warning"
                            : "text-error"
                      }`}
                    >
                      {analysisData.researchPriority.researchDifficulty.toUpperCase()}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Difficulty
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Fields Analysis */}
              {analysisData.missingFields.length > 0 && (
                <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <span className="mr-2">🔍</span>
                    Missing Biographical Data (
                    {analysisData.missingFields.length})
                  </h3>
                  <div className="space-y-3">
                    {/* Group by priority */}
                    {["high", "medium", "low"].map((priority) => {
                      const fieldsForPriority =
                        analysisData.missingFields.filter(
                          (field) => field.priority === priority
                        );

                      if (fieldsForPriority.length === 0) return null;

                      const priorityColor =
                        priority === "high"
                          ? "error"
                          : priority === "medium"
                            ? "warning"
                            : "success";
                      const priorityEmoji =
                        priority === "high"
                          ? "🔴"
                          : priority === "medium"
                            ? "🟡"
                            : "🟢";

                      return (
                        <div key={priority} className="space-y-2">
                          <h4
                            className={`text-sm font-semibold text-${priorityColor} flex items-center`}
                          >
                            <span className="mr-2">{priorityEmoji}</span>
                            {priority.charAt(0).toUpperCase() +
                              priority.slice(1)}{" "}
                            Priority ({fieldsForPriority.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {fieldsForPriority.map((field, index) => (
                              <div
                                key={index}
                                className={`bg-background rounded-lg p-3 border border-${priorityColor}/20`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-foreground">
                                    {field.displayName}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full bg-${priorityColor}/10 text-${priorityColor}`}
                                  >
                                    {field.priority}
                                  </span>
                                </div>
                                <div className="text-sm text-foreground-secondary">
                                  {field.researchSuggestion}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Research Guidance */}
              <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <span className="mr-2">🎯</span>
                  Research Guidance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-success mb-2">
                      Primary Sources
                    </h4>
                    <div className="space-y-1">
                      {analysisData.researchGuidance.primarySources.map(
                        (source, index) => (
                          <div
                            key={index}
                            className="text-sm text-success flex items-center"
                          >
                            <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                            {source}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-success mb-2">
                      Search Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.researchGuidance.searchKeywords.map(
                        (keyword, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-success/10 text-success rounded-full"
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-success/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-success">
                      <strong>Estimated Research Time:</strong>{" "}
                      {analysisData.researchGuidance.estimatedResearchTime}
                    </span>
                    <span className="text-success">
                      <strong>Research Difficulty:</strong>{" "}
                      {analysisData.researchPriority.researchDifficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Available Data Summary */}
              <div className="bg-background-secondary rounded-lg p-4 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <span className="mr-2">✅</span>
                  Available Data Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(analysisData.availableData).map(
                    ([field, hasData]) => (
                      <div key={field} className="flex items-center">
                        <span
                          className={`w-3 h-3 rounded-full mr-2 ${hasData ? "bg-success" : "bg-error"}`}
                        ></span>
                        <span
                          className={hasData ? "text-success" : "text-error"}
                        >
                          {field
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Dialog Footer */}
        <div className="p-4 border-t border bg-background-secondary flex items-center justify-between">
          <div className="text-xs text-foreground-muted">
            Biographical research analysis • {entityName}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors text-sm"
            >
              Close
            </button>
            {analysisData && (
              <button
                onClick={() => {
                  // Could trigger research report generation here
                  console.log("Generate comprehensive research report");
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center"
              >
                <span className="mr-1">📊</span>
                Generate Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
