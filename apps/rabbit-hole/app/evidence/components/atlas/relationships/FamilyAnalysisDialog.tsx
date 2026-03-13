/**
 * FamilyAnalysisDialog Component - Rabbit Hole Schema
 *
 * Displays comprehensive family network analysis including:
 * - Multi-generational family overview
 * - Marriage patterns and timeline
 * - Political dynasty analysis
 * - Research gap identification
 */

import { useState, useEffect } from "react";

interface FamilyMember {
  uid: string;
  name: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
  politicalRoles?: string[];
  missingData: string[];
}

interface GenerationAnalysis {
  generation: number;
  members: FamilyMember[];
  averageAge?: number;
  politicalInvolvement: number;
}

interface FamilyAnalysisData {
  entity: {
    uid: string;
    name: string;
    type: string;
  };
  analysis: {
    familyOverview: {
      totalFamilyMembers: number;
      generationSpan: number;
      familyTreeDepth: number;
      completenessScore: number;
    };
    generationAnalysis: GenerationAnalysis[];
    marriageAnalysis: {
      totalMarriages: number;
      currentMarriages: number;
      averageDuration?: number;
      longestMarriage?: {
        partner: string;
        duration: string;
        years: number;
      };
      marriageTimeline: Array<{
        year: number;
        event: "marriage" | "divorce";
        partner: string;
      }>;
    };
    researchGaps: {
      missingBirthDates: number;
      missingRelationships: string[];
      researchPriorities: Array<{
        category: "high" | "medium" | "low";
        description: string;
        impact: string;
      }>;
    };
    politicalDynasty: {
      hasMultiGenerationalInvolvement: boolean;
      politicalSpan?: { earliest: number; latest: number };
      familyPoliticalScore: number;
      powerTransitions: Array<{
        from: string;
        to: string;
        positions: string[];
        timeframe: string;
      }>;
    };
  };
  reportGenerated: string;
}

interface FamilyAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityUid: string;
  entityName: string;
}

export function FamilyAnalysisDialog({
  isOpen,
  onClose,
  entityUid,
  entityName,
}: FamilyAnalysisDialogProps) {
  const [analysisData, setAnalysisData] = useState<FamilyAnalysisData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityUid) {
      loadFamilyAnalysis();
    }
  }, [isOpen, entityUid]);

  const loadFamilyAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/relationship-analysis/family/${entityUid}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAnalysisData(result.data);
        } else {
          setError(result.error || "Failed to load family analysis");
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const getGenerationLabel = (generation: number): string => {
    switch (generation) {
      case -1:
        return "👨‍👧 Parents";
      case 0:
        return "👤 Current Person";
      case 1:
        return "👶 Children";
      default:
        return `Generation ${generation}`;
    }
  };

  const getPriorityColor = (category: string): string => {
    switch (category) {
      case "high":
        return "bg-error/10 text-error border-error/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-info/10 text-info border-info/20";
      default:
        return "bg-background-muted text-foreground-muted border-border";
    }
  };

  const formatCompleteness = (score: number): string => {
    const percentage = Math.round(score * 100);
    if (percentage >= 90) return "🟢 Excellent";
    if (percentage >= 70) return "🟡 Good";
    if (percentage >= 50) return "🟠 Fair";
    return "🔴 Poor";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              <span className="mr-2">👨‍👩‍👧‍👦</span>
              Family Network Analysis
            </h2>
            <p className="text-sm text-foreground-secondary mt-1">
              {entityName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground-secondary text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                <div className="text-sm text-foreground-secondary">
                  Analyzing family network...
                </div>
                <div className="text-xs text-foreground-muted mt-1">
                  This may take a moment
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-error text-xl mr-2">⚠️</span>
                  <div>
                    <div className="font-medium text-error">
                      Analysis Failed
                    </div>
                    <div className="text-sm text-error mt-1">{error}</div>
                  </div>
                </div>
                <button
                  onClick={loadFamilyAnalysis}
                  className="mt-3 px-4 py-2 bg-error/10 text-error rounded hover:bg-error/20 text-sm"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          ) : analysisData ? (
            <div className="p-6 space-y-6">
              {/* Family Overview */}
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <h3 className="text-lg font-medium text-accent mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  Family Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {analysisData.analysis.familyOverview.totalFamilyMembers}
                    </div>
                    <div className="text-xs text-accent">Total Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {analysisData.analysis.familyOverview.generationSpan}
                    </div>
                    <div className="text-xs text-accent">Generations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {Math.round(
                        analysisData.analysis.politicalDynasty
                          .familyPoliticalScore * 100
                      )}
                      %
                    </div>
                    <div className="text-xs text-accent">
                      Political Involvement
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-accent">
                      {formatCompleteness(
                        analysisData.analysis.familyOverview.completenessScore
                      )}
                    </div>
                    <div className="text-xs text-accent">Data Completeness</div>
                  </div>
                </div>
              </div>

              {/* Generation Analysis */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                  <span className="mr-2">🏗️</span>
                  Generation Analysis
                </h3>
                <div className="space-y-4">
                  {analysisData.analysis.generationAnalysis
                    .sort((a, b) => a.generation - b.generation)
                    .map((generation) => (
                      <div
                        key={generation.generation}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground">
                            {getGenerationLabel(generation.generation)} (
                            {generation.members.length})
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-foreground-secondary">
                            {generation.averageAge && (
                              <span>
                                Avg Age: {Math.round(generation.averageAge)}
                              </span>
                            )}
                            <span>
                              Political:{" "}
                              {Math.round(
                                generation.politicalInvolvement * 100
                              )}
                              %
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {generation.members.map((member, index) => (
                            <div
                              key={`${generation.generation}-${member.uid}-${index}`}
                              className="bg-background-secondary rounded p-3"
                            >
                              <div className="font-medium text-foreground flex items-center">
                                {member.name}
                                <span className="ml-1 text-xs">
                                  {member.status === "living" && "🟢"}
                                  {member.status === "deceased" && "🔴"}
                                  {member.status === "unknown" && "⚪"}
                                </span>
                              </div>
                              {member.age && (
                                <div className="text-sm text-foreground-secondary">
                                  Age {member.age}
                                </div>
                              )}
                              {member.politicalRoles &&
                                member.politicalRoles.length > 0 && (
                                  <div className="text-xs text-secondary mt-1">
                                    {member.politicalRoles.join(", ")}
                                  </div>
                                )}
                              {member.missingData.length > 0 && (
                                <div className="text-xs text-warning mt-1">
                                  Missing: {member.missingData.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Marriage Analysis */}
              {analysisData.analysis.marriageAnalysis.totalMarriages > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                    <span className="mr-2">💑</span>
                    Marriage Analysis
                  </h3>
                  <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-accent">
                          {
                            analysisData.analysis.marriageAnalysis
                              .totalMarriages
                          }
                        </div>
                        <div className="text-xs text-accent">
                          Total Marriages
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-accent">
                          {
                            analysisData.analysis.marriageAnalysis
                              .currentMarriages
                          }
                        </div>
                        <div className="text-xs text-accent">Current</div>
                      </div>
                      {analysisData.analysis.marriageAnalysis
                        .averageDuration && (
                        <div className="text-center">
                          <div className="text-xl font-bold text-accent">
                            {Math.round(
                              analysisData.analysis.marriageAnalysis
                                .averageDuration
                            )}
                          </div>
                          <div className="text-xs text-accent">Avg Years</div>
                        </div>
                      )}
                    </div>

                    {/* Marriage Timeline */}
                    {analysisData.analysis.marriageAnalysis.marriageTimeline
                      .length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-accent mb-2">
                          Marriage Timeline
                        </div>
                        <div className="space-y-1">
                          {analysisData.analysis.marriageAnalysis.marriageTimeline.map(
                            (event, index) => (
                              <div key={index} className="text-sm text-accent">
                                <span className="font-medium">
                                  {event.year}
                                </span>
                                : Married {event.partner}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Research Gaps */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                  <span className="mr-2">🔍</span>
                  Research Gaps & Priorities
                </h3>
                <div className="space-y-3">
                  {analysisData.analysis.researchGaps.researchPriorities.map(
                    (priority, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-4 border ${getPriorityColor(priority.category)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium capitalize">
                              {priority.category} Priority
                            </div>
                            <div className="text-sm mt-1">
                              {priority.description}
                            </div>
                            <div className="text-xs mt-2 opacity-75">
                              {priority.impact}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {analysisData.analysis.researchGaps.researchPriorities
                    .length === 0 && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <div className="text-success font-medium">
                        ✅ No Critical Research Gaps
                      </div>
                      <div className="text-sm text-success mt-1">
                        Family data appears complete and well-documented.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Political Dynasty Analysis */}
              {analysisData.analysis.politicalDynasty.familyPoliticalScore >
                0 && (
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                    <span className="mr-2">🏛️</span>
                    Political Dynasty Analysis
                  </h3>
                  <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">
                          Multi-generational involvement:
                        </span>
                        <span className="font-medium text-secondary">
                          {analysisData.analysis.politicalDynasty
                            .hasMultiGenerationalInvolvement
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">
                          Family political score:
                        </span>
                        <span className="font-medium text-secondary">
                          {Math.round(
                            analysisData.analysis.politicalDynasty
                              .familyPoliticalScore * 100
                          )}
                          %
                        </span>
                      </div>

                      {analysisData.analysis.politicalDynasty
                        .hasMultiGenerationalInvolvement && (
                        <div className="bg-secondary/10 rounded p-3 mt-3">
                          <div className="text-sm font-medium text-secondary">
                            Political Dynasty Detected
                          </div>
                          <div className="text-xs text-secondary mt-1">
                            Multiple generations of this family have political
                            involvement, indicating a political dynasty pattern.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-background-secondary">
          <div className="flex items-center justify-between">
            <div className="text-xs text-foreground-muted">
              {analysisData && (
                <>
                  Analysis generated{" "}
                  {new Date(analysisData.reportGenerated).toLocaleString()}
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border-secondary text-foreground-secondary rounded-lg hover:bg-background-secondary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
