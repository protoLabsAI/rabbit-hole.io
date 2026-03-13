/**
 * Floating Details Panel - Enhanced entity information popup
 *
 * Rich, explorable entity details with tabbed interface
 * as specified in ATLAS_INTERFACE_ENHANCEMENT_HANDOFF.md
 */

"use client";

import React, { useState, useEffect } from "react";

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@proto/ui/atoms";
import { getEntityImage } from "@proto/utils/atlas";

import { EnhancedTimelineTab } from "./EnhancedTimelineTab";
import { FamilyRelationshipsSection } from "./relationships/FamilyRelationshipsSection";

interface EnhancedNodeDetails {
  entity: {
    id: string;
    label: string;
    entityType: string;
    tags: string[];
    dates: {
      // Unified temporal data structure for enhanced timeline
      birth?: string; // Person birth
      death?: string; // Person death
      founded?: string; // Org/Movement/Platform/Country founding
      dissolved?: string; // Org/Movement/Country dissolution
      launched?: string; // Platform launch
      shutdown?: string; // Platform shutdown
      eventDate?: string; // Event single date
      eventEndDate?: string; // Event end date
      independence?: string; // Country independence
      acquired?: string; // Organization acquisition
      rebranded?: string; // Organization rebranding
      // Legacy support
      start?: string;
      end?: string;
    };
    sources: Array<{
      id: string;
      type: string;
      available: boolean;
    }>;
    bio?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string; // Enhanced: death date
    deathPlace?: string; // Enhanced: death place
    nationality?: string;
    occupation?: string;
    politicalParty?: string;
    education?: string[];
    netWorth?: number;
    residence?: string;
    aliases?: string[];
  };
  network: {
    total: number;
    incoming: number;
    outgoing: number;
    by_sentiment: {
      hostile: number;
      supportive: number;
      neutral: number;
    };
    speech_acts: Array<{
      category: string;
      sentiment: string;
      text_excerpt?: string;
      target?: string;
      date?: string;
      intensity?: string;
    }>;
  };
  speech_patterns?: {
    total_incidents: number;
    categories: Array<{
      category: string;
      count: number;
    }>;
    targets: string[];
    timeline: Array<{
      date: string;
      category: string;
      excerpt: string;
      intensity: string;
    }>;
  };
  // Enhanced timeline data
  timeline?: {
    events: Array<{
      id: string;
      timestamp: string;
      eventType: "intrinsic" | "relationship" | "milestone";
      category: string;
      title: string;
      description?: string;
      relationshipType?: string;
      targetEntity?: {
        uid: string;
        name: string;
        type: string;
      };
      entityProperty?: string;
      isPlaceholder?: boolean;
      properties?: Record<string, any>;
      evidence?: Array<{
        uid: string;
        title: string;
        publisher: string;
        url: string;
        reliability: number;
      }>;
      confidence: number;
      importance: "critical" | "major" | "minor";
    }>;
    summary: {
      totalEvents: number;
      dateRange: { earliest: string; latest: string };
      eventCategories: Record<string, number>;
      intrinsicEvents: number;
      relationshipEvents: number;
      placeholderEvents: number;
      intrinsicPlaceholders: number; // Missing birth dates, founding dates, etc.
      temporalPlaceholders: number; // Relationships without dates
    };
  };
}

interface FloatingDetailsPanelProps {
  node: EnhancedNodeDetails;
  onClose: () => void;
  isLoading?: boolean;
  onOpenResearchReport?: (entityUid: string, entityName: string) => void;
  isSignedIn?: boolean;
}

export function FloatingDetailsPanel({
  node,
  onClose,
  isLoading = false,
  onOpenResearchReport,
  isSignedIn,
}: FloatingDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
      <Card className="bg-card/95 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300 ease-out">
        {/* Enhanced Header */}
        <CardHeader className="p-4 border-b bg-gradient-to-r from-muted/50 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-3xl mr-3 filter drop-shadow-sm">
                {getEntityImage(node.entity.entityType)}
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">
                  {node.entity.label}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {node.entity.entityType}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
              aria-label="Close details panel"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        {/* Tab Navigation and Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full rounded-none border-b justify-start overflow-x-auto h-auto p-0 bg-muted/30">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <span>📋</span>
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="evidence"
              className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <span>📄</span>
              <span>Evidence</span>
              {node.entity.sources.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {node.entity.sources.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <span>🕸️</span>
              <span>Network</span>
              {node.network.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {node.network.total}
                </Badge>
              )}
            </TabsTrigger>
            {node.speech_patterns &&
              node.speech_patterns.total_incidents > 0 && (
                <TabsTrigger
                  value="speech"
                  className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <span>🎤</span>
                  <span>Speech Acts</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {node.speech_patterns.total_incidents}
                  </Badge>
                </TabsTrigger>
              )}
            <TabsTrigger
              value="timeline"
              className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <span>📅</span>
              <span>Timeline</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-sm text-muted-foreground">
                  Loading detailed information...
                </div>
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="p-4 mt-0">
                  <OverviewTab node={node} isSignedIn={isSignedIn} />
                </TabsContent>
                <TabsContent value="evidence" className="p-4 mt-0">
                  <EvidenceTab
                    evidence={node.entity.sources}
                    entity={node.entity}
                  />
                </TabsContent>
                <TabsContent value="network" className="p-4 mt-0">
                  <NetworkTab
                    network={node.network}
                    entityUid={node.entity.id}
                    entityName={node.entity.label}
                    isSignedIn={isSignedIn}
                  />
                </TabsContent>
                {node.speech_patterns && (
                  <TabsContent value="speech" className="p-4 mt-0">
                    <SpeechActTab patterns={node.speech_patterns} />
                  </TabsContent>
                )}
                <TabsContent value="timeline" className="p-4 mt-0">
                  <EnhancedTimelineTab
                    node={node.entity}
                    timeline={node.timeline}
                    onOpenResearchReport={onOpenResearchReport}
                    isSignedIn={isSignedIn}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </Card>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  node,
  isSignedIn,
}: {
  node: EnhancedNodeDetails;
  isSignedIn?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-muted/50 rounded-lg border">
          <div className="text-2xl font-bold text-info">
            {node.entity.sources.length}
          </div>
          <div className="text-xs text-muted-foreground">Sources</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border">
          <div className="text-2xl font-bold text-success">
            {node.network.total}
          </div>
          <div className="text-xs text-muted-foreground">Connections</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border">
          <div className="text-2xl font-bold text-warning">
            {node.speech_patterns?.total_incidents || 0}
          </div>
          <div className="text-xs text-muted-foreground">Speech Acts</div>
        </div>
      </div>

      {/* Essential Biographical Information */}
      {(node.entity.bio ||
        node.entity.birthDate ||
        node.entity.dates?.birth ||
        node.entity.deathDate ||
        node.entity.dates?.death ||
        node.entity.nationality ||
        node.entity.occupation ||
        node.entity.politicalParty ||
        node.entity.residence ||
        node.entity.birthPlace ||
        node.entity.deathPlace) && (
        <div className="bg-muted/30 rounded-lg p-4 border">
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <span className="mr-2">👤</span>
            Basic Information
          </h4>

          <div className="space-y-3">
            {node.entity.bio && (
              <div>
                <div className="text-sm leading-relaxed">{node.entity.bio}</div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {(node.entity.birthDate || node.entity.dates?.birth) && (
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    Born:
                  </span>
                  <span className="text-sm text-right">
                    {(() => {
                      const birthDate =
                        node.entity.birthDate || node.entity.dates?.birth;
                      if (!birthDate) return "Unknown";
                      try {
                        return new Date(birthDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      } catch {
                        return birthDate; // Return raw value if parsing fails
                      }
                    })()}
                    {node.entity.birthPlace && (
                      <div className="text-xs text-muted-foreground">
                        {node.entity.birthPlace}
                      </div>
                    )}
                  </span>
                </div>
              )}

              {(node.entity.deathDate || node.entity.dates?.death) && (
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    Died:
                  </span>
                  <span className="text-sm text-right">
                    {(() => {
                      const deathDate =
                        node.entity.deathDate || node.entity.dates?.death;
                      if (!deathDate) return "Unknown";
                      try {
                        return new Date(deathDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      } catch {
                        return deathDate; // Return raw value if parsing fails
                      }
                    })()}
                    {node.entity.deathPlace && (
                      <div className="text-xs text-muted-foreground">
                        {node.entity.deathPlace}
                      </div>
                    )}
                  </span>
                </div>
              )}

              {node.entity.nationality && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Nationality:
                  </span>
                  <span className="text-sm text-foreground">
                    {node.entity.nationality}
                  </span>
                </div>
              )}

              {node.entity.occupation && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Occupation:
                  </span>
                  <span className="text-sm text-foreground">
                    {node.entity.occupation}
                  </span>
                </div>
              )}

              {node.entity.politicalParty && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Political Party:
                  </span>
                  <span className="text-sm text-foreground">
                    {node.entity.politicalParty}
                  </span>
                </div>
              )}

              {node.entity.residence && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Residence:
                  </span>
                  <span className="text-sm text-foreground">
                    {node.entity.residence}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aliases */}
      {node.entity.aliases && node.entity.aliases.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            🏷️ Also Known As
          </h4>
          <div className="flex flex-wrap gap-2">
            {node.entity.aliases.map((alias, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-info/10 text-info rounded-full border border-info/20"
              >
                {alias}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Entity Tags */}
      {node.entity.tags && node.entity.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            🔖 Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {node.entity.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-success/10 text-success rounded-full border border-success/20"
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Research Gaps - Transparency Over Perfection */}
      {(() => {
        const missingFields: string[] = [];
        if (!node.entity.bio) missingFields.push("Biography");
        if (!node.entity.birthDate && !node.entity.dates?.birth)
          missingFields.push("Birth Date");
        if (!node.entity.birthPlace) missingFields.push("Birth Place");
        if (!node.entity.nationality) missingFields.push("Nationality");
        if (!node.entity.occupation) missingFields.push("Occupation");
        if (node.entity.entityType === "person" && !node.entity.politicalParty)
          missingFields.push("Political Affiliation");

        return missingFields.length > 0 ? (
          <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-warning flex items-center">
                <span className="mr-2">🔍</span>
                Research Opportunities ({missingFields.length})
              </h4>
              {isSignedIn && (
                <button
                  onClick={() => {
                    // Emit global event for biographical analysis
                    window.dispatchEvent(
                      new CustomEvent("openBiographicalAnalysis", {
                        detail: {
                          entityUid: node.entity.id,
                          entityName: node.entity.label,
                        },
                      })
                    );
                  }}
                  className="px-3 py-1.5 text-xs bg-warning/20 text-warning rounded-lg hover:bg-warning/30 transition-colors flex items-center space-x-1"
                  title="Open comprehensive biographical research analysis"
                >
                  <span>👤</span>
                  <span>Analyze Bio</span>
                </button>
              )}
            </div>
            <div className="text-xs text-warning space-y-1">
              <div className="mb-2 text-warning">
                Missing biographical data - research needed:
              </div>
              <div className="grid grid-cols-2 gap-1">
                {missingFields.map((field, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-warning mr-1">•</span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Show analysis button even when no gaps for complete entities
          isSignedIn && (
            <div className="bg-success/10 rounded-lg p-3 border border-success/20">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-success flex items-center">
                  <span className="mr-2">✅</span>
                  Biographical Analysis Available
                </h4>
                <button
                  onClick={() => {
                    // Emit global event for biographical analysis
                    window.dispatchEvent(
                      new CustomEvent("openBiographicalAnalysis", {
                        detail: {
                          entityUid: node.entity.id,
                          entityName: node.entity.label,
                        },
                      })
                    );
                  }}
                  className="px-3 py-1.5 text-xs bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors flex items-center space-x-1"
                  title="Open comprehensive biographical research analysis"
                >
                  <span>👤</span>
                  <span>View Analysis</span>
                </button>
              </div>
              <div className="text-xs text-success/90 mt-2">
                Biographical data appears complete - view detailed analysis for
                research verification
              </div>
            </div>
          )
        );
      })()}
    </div>
  );
}

// Evidence Tab Component
function EvidenceTab({
  evidence,
  entity,
}: {
  evidence: Array<{ id: string; type: string; available: boolean }>;
  entity: EnhancedNodeDetails["entity"];
}) {
  const [loadedEvidence, setLoadedEvidence] = useState<Record<string, any>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  const loadEvidenceDetails = async (evidenceId: string) => {
    if (loadedEvidence[evidenceId] || loadingStates[evidenceId]) {
      return; // Already loaded or loading
    }

    setLoadingStates((prev) => ({ ...prev, [evidenceId]: true }));

    try {
      const response = await fetch(`/api/evidence-v2/${evidenceId}`);
      const result = await response.json();

      if (result.success) {
        setLoadedEvidence((prev) => ({
          ...prev,
          [evidenceId]: result.data,
        }));
      } else {
        console.warn(`Failed to load evidence ${evidenceId}:`, result.error);
      }
    } catch (error) {
      console.error(`Error loading evidence ${evidenceId}:`, error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [evidenceId]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Evidence sources supporting claims about <strong>{entity.label}</strong>
      </div>

      {evidence.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {evidence.map((source, index) => {
            const details = loadedEvidence[source.id];
            const isLoading = loadingStates[source.id];

            return (
              <div
                key={index}
                className="bg-muted/30 rounded-lg border border hover:border-border transition-colors"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="text-sm">
                          {source.type === "speech_act" ? "🎤" : "📄"}
                        </span>
                        <span className="ml-2 font-medium text-sm text-foreground">
                          {details?.title || source.id}
                        </span>
                        <span
                          className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            source.available
                              ? "bg-success/10 text-success"
                              : "bg-error/10 text-error"
                          }`}
                        >
                          {source.available ? "Available" : "Missing"}
                        </span>
                      </div>

                      {details ? (
                        <>
                          <div className="text-xs text-muted-foreground mb-2">
                            <span className="font-medium">
                              {details.publisher}
                            </span>
                            {details.date && <span> • {details.date}</span>}
                            {details.reliability && (
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                  details.reliability > 0.8
                                    ? "bg-success/10 text-success"
                                    : details.reliability > 0.6
                                      ? "bg-warning/10 text-warning"
                                      : "bg-error/10 text-error"
                                }`}
                              >
                                {Math.round(details.reliability * 100)}%
                                reliable
                              </span>
                            )}
                          </div>

                          {details.quote && (
                            <div className="text-xs text-foreground/90 bg-card p-2 rounded border-l-2 border-info/20 italic mb-2">
                              &ldquo;{details.quote}&rdquo;
                            </div>
                          )}

                          {details.notes && (
                            <div className="text-xs text-muted-foreground mb-2">
                              <strong>Notes:</strong> {details.notes}
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <a
                              href={details.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-info hover:text-info/90 text-xs font-medium"
                            >
                              View Source →
                            </a>
                            {details.archived && (
                              <span className="text-xs text-success">
                                📦 Archived
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground/80 mb-2">
                            {source.type === "speech_act"
                              ? "Speech Act Evidence"
                              : "Investigation Source"}
                          </div>
                          <button
                            onClick={() => loadEvidenceDetails(source.id)}
                            disabled={isLoading}
                            className="text-info hover:text-info/90 text-xs font-medium disabled:opacity-50"
                          >
                            {isLoading ? "Loading..." : "Load Details →"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground/80">
          <div className="text-2xl mb-2">📄</div>
          <div className="text-sm">No evidence sources available</div>
        </div>
      )}
    </div>
  );
}

// Network Tab Component
function NetworkTab({
  network,
  entityUid,
  entityName,
  isSignedIn,
}: {
  network: EnhancedNodeDetails["network"];
  entityUid: string;
  entityName: string;
  isSignedIn?: boolean;
}) {
  const [familyData, setFamilyData] = useState<any>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);

  // Load family relationships when tab opens
  useEffect(() => {
    const loadFamilyRelationships = async () => {
      setIsLoadingFamily(true);
      try {
        const response = await fetch(
          `/api/entity-relationships/${entityUid}?categories=family&includeAges=true`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.categories?.family) {
            setFamilyData(result.data.categories.family);
          } else {
            setFamilyData(null);
          }
        } else {
          console.error(
            "Failed to load family relationships:",
            response.statusText
          );
          setFamilyData(null);
        }
      } catch (error) {
        console.error("Failed to load family connections:", error);
        setFamilyData(null);
      } finally {
        setIsLoadingFamily(false);
      }
    };

    loadFamilyRelationships();
  }, [entityUid]);

  return (
    <div className="space-y-4">
      {/* Connection Summary - 3-column layout for relationship categories */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-info/10 rounded-lg border border-info/20">
          <div className="text-xl font-bold text-info">{network.total}</div>
          <div className="text-xs text-info">Total</div>
        </div>
        <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="text-xl font-bold text-accent">
            {familyData?.summary?.totalFamilyMembers || 0}
          </div>
          <div className="text-xs text-accent">Family</div>
        </div>
        <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="text-xl font-bold text-success">0</div>
          <div className="text-xs text-success">Business</div>
        </div>
      </div>

      {/* Family Relationships */}
      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
          <span className="mr-2">👨‍👩‍👧‍👦</span>
          Family Relationships
        </h4>

        <FamilyRelationshipsSection
          data={familyData}
          isLoading={isLoadingFamily}
          onAnalyze={
            isSignedIn
              ? () => {
                  // Emit global event for family analysis
                  window.dispatchEvent(
                    new CustomEvent("openFamilyAnalysis", {
                      detail: { entityUid, entityName },
                    })
                  );
                }
              : undefined
          }
          onAnalyzeRelationship={
            isSignedIn
              ? (memberUid, relationshipType) => {
                  // Emit global event for relationship analysis
                  window.dispatchEvent(
                    new CustomEvent("analyzeRelationship", {
                      detail: {
                        sourceEntityUid: entityUid,
                        sourceEntityName: entityName,
                        targetEntityUid: memberUid,
                        relationshipType,
                      },
                    })
                  );
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

// Speech Act Tab Component
function SpeechActTab({
  patterns,
}: {
  patterns: EnhancedNodeDetails["speech_patterns"];
}) {
  if (!patterns) return null;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-error/10 rounded-lg border border-error/20">
          <div className="text-xl font-bold text-error">
            {patterns.total_incidents}
          </div>
          <div className="text-xs text-error">Total Incidents</div>
        </div>
        <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
          <div className="text-xl font-bold text-warning">
            {patterns.categories.length}
          </div>
          <div className="text-xs text-warning">Categories</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          📊 Categories
        </h4>
        <div className="space-y-2">
          {patterns.categories.map((cat, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted/30 rounded"
            >
              <span className="text-sm text-foreground">
                {cat.category.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-medium text-error">
                {cat.count} incident{cat.count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {patterns.timeline.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            📅 Timeline
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {patterns.timeline.map((item, index) => (
              <div key={index} className="border-l-4 border-red-400 pl-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground/80">
                    {item.date}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      item.intensity === "extreme"
                        ? "bg-error/10 text-error"
                        : item.intensity === "high"
                          ? "bg-warning/10 text-warning"
                          : "bg-warning/10 text-warning"
                    }`}
                  >
                    {item.intensity}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {item.category.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  &ldquo;{item.excerpt}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targets */}
      {patterns.targets.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            🎯 Targets
          </h4>
          <div className="flex flex-wrap gap-2">
            {patterns.targets.slice(0, 10).map((target, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-error/10 text-error rounded-full"
              >
                {target}
              </span>
            ))}
            {patterns.targets.length > 10 && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                +{patterns.targets.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Timeline Tab Component with filtering and placeholders
function TimelineTab({
  node,
  timeline,
  onOpenResearchReport,
  isSignedIn,
}: {
  node: EnhancedNodeDetails["entity"];
  timeline?: EnhancedNodeDetails["timeline"];
  onOpenResearchReport?: (entityUid: string, entityName: string) => void;
  isSignedIn?: boolean;
}) {
  const [filters, setFilters] = useState({
    categories: [] as string[],
    importance: [] as string[],
    showPlaceholders: true,
  });

  const [biographicalAnalysis, setBiographicalAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Load biographical analysis when tab opens and user is signed in
  useEffect(() => {
    if (isSignedIn) {
      const loadBiographicalAnalysis = async () => {
        setIsLoadingAnalysis(true);
        try {
          const response = await fetch(`/api/research/biographical/${node.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setBiographicalAnalysis(result.data);
            }
          }
        } catch (error) {
          console.warn("Failed to load biographical analysis:", error);
        } finally {
          setIsLoadingAnalysis(false);
        }
      };

      loadBiographicalAnalysis();
    }
  }, [node.id, isSignedIn]);

  const filteredEvents =
    timeline?.events?.filter((event) => {
      // Apply category filters
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(event.category)
      ) {
        return false;
      }

      // Apply importance filters
      if (
        filters.importance.length > 0 &&
        !filters.importance.includes(event.importance)
      ) {
        return false;
      }

      // Apply placeholder filter
      if (!filters.showPlaceholders && event.isPlaceholder) {
        return false;
      }

      return true;
    }) || [];

  return (
    <div className="space-y-4">
      {timeline ? (
        <>
          {/* Timeline Header with Analyze Button */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              📅 Timeline ({timeline.summary?.totalEvents || 0} events)
            </h4>
            {onOpenResearchReport &&
              timeline.summary?.placeholderEvents > 0 &&
              isSignedIn && (
                <button
                  onClick={() => onOpenResearchReport(node.id, node.label)}
                  className="px-3 py-1.5 text-xs bg-info/20 text-info rounded-lg hover:bg-info/30 transition-colors flex items-center space-x-1"
                  title="Generate comprehensive research analysis"
                >
                  <span>📊</span>
                  <span>Analyze</span>
                  <span className="bg-info/30 text-info px-1.5 py-0.5 rounded text-xs font-medium">
                    {timeline.summary?.placeholderEvents || 0}
                  </span>
                </button>
              )}
            {onOpenResearchReport &&
              timeline.summary?.placeholderEvents > 0 &&
              !isSignedIn && (
                <div className="px-3 py-1.5 text-xs bg-muted text-muted-foreground/80 rounded-lg flex items-center space-x-1">
                  <span>🔒</span>
                  <span>Sign in to analyze</span>
                </div>
              )}
          </div>

          {/* Timeline Filters */}
          <div className="bg-muted/30 rounded-lg p-3">
            <h5 className="text-sm font-semibold text-foreground mb-2">
              Timeline Filters
            </h5>

            {/* Category Filter */}
            {timeline.summary?.eventCategories &&
              Object.keys(timeline.summary?.eventCategories || {}).length >
                1 && (
                <div className="mb-2">
                  <label className="text-xs text-foreground/90 mb-1 block">
                    Event Categories
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(timeline.summary?.eventCategories || {}).map(
                      (category) => (
                        <button
                          key={category}
                          className={`px-2 py-1 text-xs rounded ${
                            filters.categories.includes(category)
                              ? "bg-info/10 text-info"
                              : "bg-muted text-muted-foreground"
                          }`}
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              categories: prev.categories.includes(category)
                                ? prev.categories.filter((c) => c !== category)
                                : [...prev.categories, category],
                            }));
                          }}
                        >
                          {category.replace(/_/g, " ")} (
                          {timeline.summary?.eventCategories?.[category] || 0})
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Importance Filter */}
            <div className="mb-2">
              <label className="text-xs text-foreground/90 mb-1 block">
                Importance
              </label>
              <div className="flex gap-1">
                {["critical", "major", "minor"].map((importance) => (
                  <button
                    key={importance}
                    className={`px-2 py-1 text-xs rounded ${
                      filters.importance.includes(importance)
                        ? "bg-error/10 text-error"
                        : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        importance: prev.importance.includes(importance)
                          ? prev.importance.filter((i) => i !== importance)
                          : [...prev.importance, importance],
                      }));
                    }}
                  >
                    {importance}
                  </button>
                ))}
              </div>
            </div>

            {/* Placeholder Toggle */}
            {timeline.summary?.placeholderEvents > 0 && (
              <div className="space-y-1">
                <label className="flex items-center text-xs text-foreground/90">
                  <input
                    type="checkbox"
                    checked={filters.showPlaceholders}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        showPlaceholders: e.target.checked,
                      }))
                    }
                    className="rounded border-border text-info mr-2"
                  />
                  Show missing dates ({timeline.summary?.placeholderEvents} need
                  research)
                </label>
                <div className="text-xs text-muted-foreground ml-4">
                  • {timeline.summary?.intrinsicPlaceholders} entity dates
                  (birth, founding, etc.)
                  <br />• {timeline.summary?.temporalPlaceholders} relationship
                  dates (when events occurred)
                </div>
              </div>
            )}
          </div>

          {/* Timeline Events */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => (
                <div
                  key={event.id || index}
                  className={`border-l-4 pl-4 py-2 rounded-lg shadow-sm ${
                    event.isPlaceholder
                      ? event.eventType === "intrinsic"
                        ? "border-warning/20 bg-warning/5" // Intrinsic placeholders (birth, founding dates)
                        : "border-orange-200 bg-orange-50" // Temporal placeholders (relationship dates)
                      : event.eventType === "intrinsic"
                        ? "border-purple-200 bg-purple-50"
                        : "border-info/20 bg-card"
                  }`}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          event.isPlaceholder
                            ? event.eventType === "intrinsic"
                              ? "bg-warning" // Intrinsic placeholders (yellow)
                              : "bg-orange-500" // Temporal placeholders (orange)
                            : event.eventType === "intrinsic"
                              ? "bg-purple-500" // Intrinsic events (purple)
                              : event.eventType === "relationship"
                                ? "bg-info" // Relationship events (blue)
                                : "bg-success" // Milestone events (green)
                        }`}
                      />
                      <div
                        className={`text-sm font-medium ${
                          event.isPlaceholder
                            ? event.eventType === "intrinsic"
                              ? "text-yellow-800" // Intrinsic placeholders (yellow)
                              : "text-orange-800" // Temporal placeholders (orange)
                            : "text-foreground"
                        }`}
                      >
                        {event.title}
                        {event.isPlaceholder && " ⚠️"}
                      </div>
                      <div
                        className={`px-2 py-0.5 text-xs rounded ${
                          event.importance === "critical"
                            ? "bg-error/10 text-error"
                            : event.importance === "major"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.importance}
                      </div>
                    </div>
                    <div
                      className={`text-xs ${
                        event.isPlaceholder
                          ? event.eventType === "intrinsic"
                            ? "text-warning" // Intrinsic placeholders
                            : "text-orange-600" // Temporal placeholders
                          : "text-muted-foreground/80"
                      }`}
                    >
                      {event.isPlaceholder
                        ? "Unknown"
                        : new Date(event.timestamp).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                    </div>
                  </div>

                  {/* Event Details */}
                  {event.description && (
                    <div
                      className={`text-sm mb-2 ${
                        event.isPlaceholder
                          ? event.eventType === "intrinsic"
                            ? "text-yellow-700" // Intrinsic placeholders
                            : "text-orange-700" // Temporal placeholders
                          : "text-foreground/90"
                      }`}
                    >
                      {event.description}
                    </div>
                  )}

                  {/* Relationship Target */}
                  {event.targetEntity && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">
                        {event.relationshipType?.replace(/_/g, " ")}
                      </span>
                      {" → "}
                      <span>{event.targetEntity.name}</span>
                      <span className="text-muted-foreground/60">
                        {" "}
                        ({event.targetEntity.type})
                      </span>
                    </div>
                  )}

                  {/* Evidence & Confidence */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border">
                    <div className="flex items-center space-x-2">
                      {event.evidence && event.evidence.length > 0 && (
                        <div className="text-xs text-muted-foreground/80">
                          📄 {event.evidence.length} source
                          {event.evidence.length > 1 ? "s" : ""}
                        </div>
                      )}
                      <div
                        className={`text-xs ${
                          event.isPlaceholder
                            ? event.eventType === "intrinsic"
                              ? "text-warning" // Intrinsic placeholders
                              : "text-orange-600" // Temporal placeholders
                            : "text-muted-foreground/80"
                        }`}
                      >
                        Confidence: {Math.round(event.confidence * 100)}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      {event.category.replace(/_/g, " ")}
                    </div>
                  </div>

                  {/* Research Need Indicator */}
                  {event.isPlaceholder && (
                    <div
                      className={`mt-2 pt-2 ${
                        event.eventType === "intrinsic"
                          ? "border-t border-yellow-200"
                          : "border-t border-orange-200"
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${
                          event.eventType === "intrinsic"
                            ? "text-yellow-700" // Intrinsic research needs
                            : "text-orange-700" // Temporal research needs
                        }`}
                      >
                        🔍{" "}
                        {event.eventType === "intrinsic"
                          ? `Research needed for ${event.entityProperty?.replace(/([A-Z])/g, " $1").toLowerCase()}`
                          : `Date needed for this ${event.relationshipType?.toLowerCase().replace(/_/g, " ")} relationship`}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground/80">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm">No timeline events found</div>
                <div className="text-xs">
                  {filters.categories.length > 0 ||
                  filters.importance.length > 0
                    ? "Try adjusting your filters"
                    : "No temporal data available for this entity"}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Summary */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-foreground/90">
                  Total Events:
                </span>
                <span className="text-muted-foreground ml-1">
                  {timeline.summary?.totalEvents}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground/90">
                  Date Range:
                </span>
                <span className="text-muted-foreground ml-1">
                  {timeline.summary?.dateRange?.earliest
                    ? `${new Date(timeline.summary.dateRange.earliest).getFullYear()} - ${new Date(timeline.summary.dateRange.latest).getFullYear()}`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground/90">
                  Intrinsic:
                </span>
                <span className="text-muted-foreground ml-1">
                  {timeline.summary?.intrinsicEvents}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground/90">
                  Relationships:
                </span>
                <span className="text-muted-foreground ml-1">
                  {timeline.summary?.relationshipEvents}
                </span>
              </div>
              {timeline.summary?.placeholderEvents > 0 && (
                <>
                  <div>
                    <span className="font-medium text-yellow-700">
                      Entity Dates:
                    </span>
                    <span className="text-warning ml-1">
                      {timeline.summary?.intrinsicPlaceholders}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-orange-700">
                      Relationship Dates:
                    </span>
                    <span className="text-orange-600 ml-1">
                      {timeline.summary?.temporalPlaceholders}
                    </span>
                  </div>
                  <div className="text-xs text-warning col-span-2">
                    Missing temporal data requiring research
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Comprehensive Research Analysis - Timeline + Biographical Gaps */}
          {isSignedIn ? (
            isLoadingAnalysis ? (
              <div className="bg-muted/30 rounded-lg p-4 border border">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm text-muted-foreground">
                    Loading comprehensive analysis...
                  </span>
                </div>
              </div>
            ) : biographicalAnalysis ? (
              (() => {
                const totalTimelineGaps =
                  timeline?.summary?.placeholderEvents || 0;
                const totalBioGaps =
                  biographicalAnalysis.researchPriority.totalGaps;
                const totalGaps = totalTimelineGaps + totalBioGaps;

                return totalGaps > 0 ? (
                  <div className="bg-gradient-to-r from-warning/10 to-warning/20 rounded-lg p-4 border border-warning/20">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-warning flex items-center">
                        <span className="mr-2">🔍</span>
                        Comprehensive Research Analysis
                      </h4>
                      {onOpenResearchReport && (
                        <button
                          onClick={() =>
                            onOpenResearchReport(node.id, node.label)
                          }
                          className="px-3 py-1.5 text-xs bg-warning/20 text-warning rounded-lg hover:bg-warning/30 transition-colors flex items-center space-x-1"
                          title="Generate comprehensive biographical + timeline research report"
                        >
                          <span>📊</span>
                          <span>Full Analysis</span>
                          <span className="bg-warning/30 text-warning px-1.5 py-0.5 rounded text-xs font-medium">
                            {totalGaps}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Timeline Research Gaps */}
                      {totalTimelineGaps > 0 && timeline && (
                        <div className="bg-card rounded-lg p-3 border border-amber-200">
                          <h5 className="text-sm font-semibold text-amber-900 mb-2 flex items-center">
                            <span className="mr-1">📅</span>
                            Timeline Gaps ({totalTimelineGaps})
                          </h5>
                          <div className="text-xs space-y-1">
                            {timeline.summary?.intrinsicPlaceholders > 0 && (
                              <div className="flex items-center text-yellow-700">
                                <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                                <span>
                                  {timeline.summary?.intrinsicPlaceholders}{" "}
                                  entity dates (birth, founding, etc.)
                                </span>
                              </div>
                            )}
                            {timeline.summary?.temporalPlaceholders > 0 && (
                              <div className="flex items-center text-orange-700">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                <span>
                                  {timeline.summary?.temporalPlaceholders}{" "}
                                  relationship dates (when events occurred)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Biographical Research Gaps */}
                      {totalBioGaps > 0 && (
                        <div className="bg-card rounded-lg p-3 border border-amber-200">
                          <h5 className="text-sm font-semibold text-amber-900 mb-2 flex items-center">
                            <span className="mr-1">👤</span>
                            Biographical Gaps ({totalBioGaps})
                          </h5>
                          <div className="text-xs space-y-1">
                            {biographicalAnalysis.missingFields.map(
                              (field: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center text-warning">
                                    <span
                                      className={`w-2 h-2 rounded-full mr-2 ${
                                        field.priority === "high"
                                          ? "bg-error"
                                          : field.priority === "medium"
                                            ? "bg-warning"
                                            : "bg-warning"
                                      }`}
                                    ></span>
                                    <span>{field.displayName}</span>
                                  </div>
                                  <span
                                    className={`text-xs px-1 py-0.5 rounded ${
                                      field.priority === "high"
                                        ? "bg-error/10 text-error"
                                        : field.priority === "medium"
                                          ? "bg-warning/10 text-warning"
                                          : "bg-warning/10 text-warning"
                                    }`}
                                  >
                                    {field.priority}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Research Priority Summary */}
                    <div className="mt-3 pt-3 border-t border-warning/20">
                      <div className="text-xs text-warning space-y-1">
                        <div>
                          <strong>Research Priority:</strong> {totalGaps} total
                          gaps •{" "}
                          {Math.round(
                            biographicalAnalysis.researchPriority
                              .completenessScore * 100
                          )}
                          % complete •{" "}
                          {
                            biographicalAnalysis.researchPriority
                              .researchDifficulty
                          }{" "}
                          difficulty
                        </div>
                        <div>
                          <strong>Est. Time:</strong>{" "}
                          {
                            biographicalAnalysis.researchGuidance
                              .estimatedResearchTime
                          }
                        </div>
                        {totalTimelineGaps > 0 && totalBioGaps > 0 && (
                          <div>
                            Biographical data will enhance timeline context and
                            vice versa
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Complete data indicator
                  <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                    <h4 className="text-sm font-semibold text-success flex items-center mb-2">
                      <span className="mr-2">✅</span>
                      Research Status: Complete
                    </h4>
                    <div className="text-xs text-success/90">
                      {Math.round(
                        biographicalAnalysis.researchPriority
                          .completenessScore * 100
                      )}
                      % biographical completeness - no critical research gaps
                      identified
                    </div>
                  </div>
                );
              })()
            ) : null
          ) : (
            <div className="bg-muted/30 rounded-lg p-4 border border">
              <div className="flex items-center">
                <span className="text-muted-foreground/60 mr-2">🔒</span>
                <span className="text-sm text-muted-foreground">
                  Sign in to view comprehensive research analysis
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground/80">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-sm">No timeline data available</div>
          <div className="text-xs">
            Loading timeline information for {node.label}...
          </div>
        </div>
      )}
    </div>
  );
}
