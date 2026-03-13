/**
 * Add Entity Form - Interactive form for AI-powered entity research and knowledge graph integration
 *
 * Features:
 * - AI-powered entity research using Universal Entity Research Agent
 * - Preview research results before adding to knowledge graph
 * - Download research JSON without adding to graph
 * - Tabbed interface for AI research vs manual entity/relationship creation
 * - Real-time validation and feedback
 */

"use client";

import React, { useState, useEffect } from "react";

import { UpgradePromptModal } from "@proto/auth/ui";
import { getEntityImage } from "@proto/utils/atlas";

interface ExistingEntity {
  id: string;
  label: string;
  entityType: string;
}

interface EntityResearchResult {
  success: boolean;
  targetEntityName: string;
  detectedEntityType: string;
  entities: any[];
  relationships: any[];
  evidence: any[];
  content?: any[];
  metadata: {
    researchMethod: string;
    confidenceScore: number;
    sourcesConsulted: string[];
    processingTime: number;
    propertiesExtracted: string[];
    relationshipsDiscovered: number;
    dataGaps: string[];
    warnings: string[];
  };
  researchSummary?: {
    entitiesGenerated: number;
    relationshipsDiscovered: number;
    evidenceSourcesUsed: number;
    confidenceScore: number;
    completenessScore: number;
    processingTimeMs: number;
    researchMethod: string;
  };
}

interface ResearchPreview {
  entities: number;
  relationships: number;
  evidence: number;
  confidence: number;
  entityType: string;
  uid: string;
  properties: string[];
  dataGaps: string[];
  processingTime: number;
}

interface AddEntityFormProps {
  isVisible: boolean;
  onClose: () => void;
  onEntityAdded?: (entity: any) => void;
  onRelationshipAdded?: (relationship: any) => void;
  existingEntities?: ExistingEntity[];
}

export function AddEntityForm({
  isVisible,
  onClose,
  onEntityAdded,
  onRelationshipAdded,
  existingEntities = [],
}: AddEntityFormProps) {
  const [activeTab, setActiveTab] = useState<
    "ai-research" | "entity" | "relationship"
  >("ai-research");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    limitType: string;
    currentValue: number;
    maxValue: number;
    tier: string;
  }>({
    isOpen: false,
    limitType: "",
    currentValue: 0,
    maxValue: 0,
    tier: "",
  });

  // AI Research state
  const [researchForm, setResearchForm] = useState({
    targetEntityName: "",
    entityType: "", // Auto-detect if empty
    researchDepth: "detailed",
    focusAreas: ["biographical", "business", "relationships"],
    customData: "",
  });
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] =
    useState<EntityResearchResult | null>(null);
  const [researchPreview, setResearchPreview] =
    useState<ResearchPreview | null>(null);

  // Entity form state
  const [entityForm, setEntityForm] = useState({
    label: "",
    entityType: "person",
    id: "",
    tags: "manual_entry",
    aka: "",
  });

  // Relationship form state
  const [relationshipForm, setRelationshipForm] = useState({
    source: "",
    target: "",
    label: "",
    type: "generic",
    confidence: "0.8",
    notes: "",
    since: "",
  });

  // Auto-generate ID when label changes
  useEffect(() => {
    if (entityForm.label && !entityForm.id.includes("_manual_")) {
      // Use Neo4j v2.0 schema: entityType:normalized_name format
      const normalizedName = entityForm.label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      const generatedId = `${entityForm.entityType}:${normalizedName}`;
      setEntityForm((prev) => ({ ...prev, id: generatedId }));
    }
  }, [entityForm.label, entityForm.entityType]);

  // AI Entity Research handler
  const handleEntityResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResearching(true);
    setFeedback(null);
    setResearchResult(null);
    setResearchPreview(null);

    try {
      console.log(
        `🔬 Starting AI research for: ${researchForm.targetEntityName}`
      );

      const researchPayload = {
        targetEntityName: researchForm.targetEntityName,
        ...(researchForm.entityType && { entityType: researchForm.entityType }),
        researchDepth: researchForm.researchDepth,
        focusAreas: researchForm.focusAreas,
        ...(researchForm.customData && {
          rawData: [
            {
              content: researchForm.customData,
              source: "User Provided",
              sourceType: "user_provided",
              reliability: 0.8,
            },
          ],
        }),
      };

      const response = await fetch("/api/research/entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(researchPayload),
      });

      const result = (await response.json()) as EntityResearchResult;

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error("Entity research failed");
      }

      console.log(`✅ Research completed for: ${result.targetEntityName}`);
      setResearchResult(result);

      // Generate preview data
      const preview: ResearchPreview = {
        entities: result.entities.length,
        relationships: result.relationships.length,
        evidence: result.evidence.length,
        confidence: Math.round(result.metadata.confidenceScore * 100),
        entityType: result.detectedEntityType,
        uid: result.entities[0]?.uid || "unknown",
        properties: result.metadata.propertiesExtracted,
        dataGaps: result.metadata.dataGaps,
        processingTime: result.metadata.processingTime,
      };

      setResearchPreview(preview);
      setFeedback({
        type: "success",
        message: `Research completed! Found ${preview.entities} entity with ${preview.confidence}% confidence`,
      });
    } catch (error) {
      console.error("❌ Entity research failed:", error);
      setFeedback({ type: "error", message: `Research failed: ${error}` });
    } finally {
      setIsResearching(false);
    }
  };

  // Add researched entity to knowledge graph
  const handleAddResearchedEntity = async () => {
    if (!researchResult) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      console.log("📦 Adding researched entity to knowledge graph...");

      const response = await fetch("/api/ingest-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: researchResult.entities,
          relationships: researchResult.relationships,
          evidence: researchResult.evidence,
          content: researchResult.content || [],
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFeedback({
          type: "success",
          message: `Successfully added ${researchResult.targetEntityName} to knowledge graph!`,
        });
        onEntityAdded?.(researchResult.entities[0]);

        // Reset research state
        setTimeout(() => {
          setResearchResult(null);
          setResearchPreview(null);
          setResearchForm({
            targetEntityName: "",
            entityType: "",
            researchDepth: "detailed",
            focusAreas: ["biographical", "business", "relationships"],
            customData: "",
          });
        }, 2000);
      } else {
        throw new Error(
          result.error || "Failed to add entity to knowledge graph"
        );
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: `Failed to add to graph: ${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download research JSON
  const handleDownloadJSON = () => {
    if (!researchResult) return;

    const dataStr = JSON.stringify(researchResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${researchResult.targetEntityName.replace(/\s+/g, "_")}_research.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedback({
      type: "success",
      message: "Research data downloaded successfully!",
    });
  };

  const handleEntitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/atlas-crud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add-entity",
          data: {
            ...entityForm,
            tags: entityForm.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag),
            aka: entityForm.aka
              ? entityForm.aka
                  .split(",")
                  .map((alias) => alias.trim())
                  .filter((alias) => alias)
              : [],
          },
        }),
      });

      const result = await response.json();

      // Handle tier limit errors (402 Payment Required)
      if (response.status === 402) {
        setUpgradeModal({
          isOpen: true,
          limitType: result.limitType || "entities",
          currentValue: result.currentValue || 0,
          maxValue: result.maxValue || 0,
          tier: result.tier || "free",
        });
        setFeedback({
          type: "error",
          message: result.error || "Tier limit reached",
        });
        return;
      }

      if (result.success) {
        setFeedback({
          type: "success",
          message: result.data.message || "Entity created successfully!",
        });
        onEntityAdded?.(result.data.entity);

        // Reset form
        setEntityForm({
          label: "",
          entityType: "person",
          id: "",
          tags: "manual_entry",
          aka: "",
        });
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to create entity",
        });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Network error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelationshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/atlas-crud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add-relationship",
          data: {
            ...relationshipForm,
            confidence: parseFloat(relationshipForm.confidence),
            since: relationshipForm.since || undefined,
            notes: relationshipForm.notes || undefined,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedback({
          type: "success",
          message: result.data.message || "Relationship created successfully!",
        });
        onRelationshipAdded?.(result.data.relationship);

        // Reset form
        setRelationshipForm({
          source: "",
          target: "",
          label: "",
          type: "generic",
          confidence: "0.8",
          notes: "",
          since: "",
        });
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to create relationship",
        });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Network error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border bg-gradient-to-r from-primary/10 to-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                AI Entity Research & Knowledge Graph
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                Research entities with AI or manually add entities and
                relationships
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-foreground-muted hover:text-foreground text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border bg-background-secondary">
          <button
            onClick={() => setActiveTab("ai-research")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "ai-research"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            🤖 AI Research
          </button>
          <button
            onClick={() => setActiveTab("entity")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "entity"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            👤 Manual Entity
          </button>
          <button
            onClick={() => setActiveTab("relationship")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "relationship"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            🔗 Relationship
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                feedback.type === "success"
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-error/10 text-error border border-error/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* AI Research Tab */}
          {activeTab === "ai-research" && (
            <div className="space-y-6">
              {/* Research Form */}
              {!researchResult && (
                <form onSubmit={handleEntityResearch} className="space-y-4">
                  <div className="bg-info/10 p-4 rounded-lg border border-info/20">
                    <h3 className="text-info font-medium mb-2">
                      🤖 AI-Powered Entity Research
                    </h3>
                    <p className="text-info text-sm">
                      Enter an entity name and let our AI research it
                      automatically from Wikipedia and other sources. Works for
                      People, Organizations, Platforms, Movements, and Events.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Entity Name to Research *
                    </label>
                    <input
                      type="text"
                      required
                      value={researchForm.targetEntityName}
                      onChange={(e) =>
                        setResearchForm((prev) => ({
                          ...prev,
                          targetEntityName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="e.g., QAnon, Tesla Inc., Twitter, January 6 Capitol Attack"
                    />
                    <div className="text-xs text-foreground-muted mt-1">
                      AI will automatically detect entity type and fetch data
                      from Wikipedia
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Entity Type (Optional)
                    </label>
                    <select
                      value={researchForm.entityType}
                      onChange={(e) =>
                        setResearchForm((prev) => ({
                          ...prev,
                          entityType: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">🎯 Auto-detect from content</option>
                      <option value="Person">👤 Person</option>
                      <option value="Organization">🏢 Organization</option>
                      <option value="Platform">💻 Platform</option>
                      <option value="Movement">🌊 Movement</option>
                      <option value="Event">📅 Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Research Depth
                    </label>
                    <select
                      value={researchForm.researchDepth}
                      onChange={(e) =>
                        setResearchForm((prev) => ({
                          ...prev,
                          researchDepth: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="basic">📝 Basic</option>
                      <option value="detailed">📊 Detailed</option>
                      <option value="comprehensive">🔍 Comprehensive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Additional Data (Optional)
                    </label>
                    <textarea
                      value={researchForm.customData}
                      onChange={(e) =>
                        setResearchForm((prev) => ({
                          ...prev,
                          customData: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      rows={3}
                      placeholder="Provide additional context or data about this entity (optional - AI will also fetch Wikipedia data)"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResearching}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isResearching
                      ? "🔬 Researching..."
                      : "🚀 Start AI Research"}
                  </button>
                </form>
              )}

              {/* Research Results Preview */}
              {researchPreview && researchResult && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-success font-medium">
                      ✅ Research Complete
                    </h3>
                    <div className="text-sm text-success">
                      {researchPreview.confidence}% confidence
                    </div>
                  </div>

                  {/* Research Summary Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-primary">
                        {researchPreview.entities}
                      </div>
                      <div className="text-xs text-primary">Entities</div>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-success">
                        {researchPreview.relationships}
                      </div>
                      <div className="text-xs text-success">Relationships</div>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-accent">
                        {researchPreview.evidence}
                      </div>
                      <div className="text-xs text-accent">Evidence</div>
                    </div>
                  </div>

                  {/* Entity Details */}
                  <div className="bg-background p-4 rounded-lg border mb-4">
                    <h4 className="font-medium text-foreground mb-2">
                      🎯 Discovered Entity
                    </h4>
                    <div className="text-sm text-foreground-secondary space-y-1">
                      <div>
                        <strong>Name:</strong> {researchResult.targetEntityName}
                      </div>
                      <div>
                        <strong>Type:</strong> {researchPreview.entityType}
                      </div>
                      <div>
                        <strong>UID:</strong>{" "}
                        <code className="bg-background-muted px-1 rounded">
                          {researchPreview.uid}
                        </code>
                      </div>
                      <div>
                        <strong>Properties:</strong>{" "}
                        {researchPreview.properties.join(", ")}
                      </div>
                      {researchPreview.dataGaps.length > 0 && (
                        <div>
                          <strong>Data Gaps:</strong>{" "}
                          <span className="text-warning">
                            {researchPreview.dataGaps.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Research Metadata */}
                  <div className="bg-background-secondary p-3 rounded-lg text-xs text-foreground-muted mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Processing Time:</strong>{" "}
                        {Math.round(researchPreview.processingTime)}ms
                      </div>
                      <div>
                        <strong>Sources:</strong>{" "}
                        {researchResult.metadata.sourcesConsulted.join(", ")}
                      </div>
                      <div>
                        <strong>Method:</strong>{" "}
                        {researchResult.metadata.researchMethod}
                      </div>
                      <div>
                        <strong>Model:</strong> AI Extraction (Gemini)
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddResearchedEntity}
                      disabled={isSubmitting}
                      className="flex-1 bg-success text-foreground-inverse py-2 px-4 rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting
                        ? "📦 Adding to Graph..."
                        : "✅ Add to Knowledge Graph"}
                    </button>
                    <button
                      onClick={handleDownloadJSON}
                      className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      📥 Download JSON
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setResearchResult(null);
                      setResearchPreview(null);
                      setResearchForm({
                        targetEntityName: "",
                        entityType: "",
                        researchDepth: "detailed",
                        focusAreas: [
                          "biographical",
                          "business",
                          "relationships",
                        ],
                        customData: "",
                      });
                    }}
                    className="w-full mt-3 text-sm text-foreground-muted hover:text-foreground py-1"
                  >
                    🔄 Research Another Entity
                  </button>
                </div>
              )}

              {/* Research Processing */}
              {isResearching && (
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                    <div>
                      <div className="text-info font-medium">
                        🔬 AI Research in Progress...
                      </div>
                      <div className="text-info text-sm">
                        Fetching data from Wikipedia and analyzing with AI
                        extraction
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entity Form */}
          {activeTab === "entity" && (
            <form onSubmit={handleEntitySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={entityForm.label}
                  onChange={(e) =>
                    setEntityForm((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., John Doe, Apple Inc., QAnon Movement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Entity Type *
                </label>
                <select
                  required
                  value={entityForm.entityType}
                  onChange={(e) =>
                    setEntityForm((prev) => ({
                      ...prev,
                      entityType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="person">👤 Person</option>
                  <option value="organization">🏢 Organization</option>
                  <option value="platform">💻 Platform</option>
                  <option value="movement">🌊 Movement</option>
                  <option value="event">📅 Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Entity ID
                </label>
                <input
                  type="text"
                  value={entityForm.id}
                  onChange={(e) =>
                    setEntityForm((prev) => ({ ...prev, id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Auto-generated from name"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Leave blank to auto-generate from entity name
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Aliases (Also Known As)
                </label>
                <input
                  type="text"
                  value={entityForm.aka}
                  onChange={(e) =>
                    setEntityForm((prev) => ({ ...prev, aka: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., John Smith, JS (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={entityForm.tags}
                  onChange={(e) =>
                    setEntityForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., manual_entry, verified, investigation"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Creating Entity..." : "Create Entity"}
              </button>
            </form>
          )}

          {/* Relationship Form */}
          {activeTab === "relationship" && (
            <form onSubmit={handleRelationshipSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Source Entity *
                </label>
                <select
                  required
                  value={relationshipForm.source}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({
                      ...prev,
                      source: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select source entity...</option>
                  {existingEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {getEntityImage(entity.entityType)} {entity.label} (
                      {entity.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Relationship Label *
                </label>
                <input
                  type="text"
                  required
                  value={relationshipForm.label}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., works for, founded, said on, amplifies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Target Entity *
                </label>
                <select
                  required
                  value={relationshipForm.target}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({
                      ...prev,
                      target: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select target entity...</option>
                  {existingEntities
                    .filter((entity) => entity.id !== relationshipForm.source)
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {getEntityImage(entity.entityType)} {entity.label} (
                        {entity.id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Relationship Type
                </label>
                <select
                  value={relationshipForm.type}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="generic">Generic</option>
                  <option value="employment">Employment</option>
                  <option value="ownership">Ownership</option>
                  <option value="partnership">Partnership</option>
                  <option value="platforming">Platforming</option>
                  <option value="funding">Funding</option>
                  <option value="endorsement">Endorsement</option>
                  <option value="speech_act">Speech Act</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Confidence (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={relationshipForm.confidence}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        confidence: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Since (Date)
                  </label>
                  <input
                    type="date"
                    value={relationshipForm.since}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        since: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Notes
                </label>
                <textarea
                  value={relationshipForm.notes}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional context or details about this relationship..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting
                  ? "Creating Relationship..."
                  : "Create Relationship"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        limitType={upgradeModal.limitType}
        currentValue={upgradeModal.currentValue}
        maxValue={upgradeModal.maxValue}
        tier={upgradeModal.tier}
      />
    </div>
  );
}
