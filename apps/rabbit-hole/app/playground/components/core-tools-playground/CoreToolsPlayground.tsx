"use client";

/**
 * Core Tools Playground
 *
 * Interactive playground for testing core @proto/llm-tools
 * - discoverEntitiesTool
 * - enrichEntityTool
 * - extractRelationshipsTool
 * - discoverEventsTool
 */

import { useState, useEffect } from "react";

import { VALID_DOMAINS, ALL_ENTITY_TYPES, EVENT_TYPES } from "@proto/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Typeahead,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

const SAMPLE_TEXT = `Albert Einstein was a theoretical physicist born in Germany in 1879. He developed the theory of relativity and won the Nobel Prize in Physics in 1921. Einstein worked at Princeton University from 1933 until his death in 1955. He collaborated extensively with Niels Bohr on quantum mechanics and was friends with Kurt Gödel, who was also at Princeton.`;

const SAMPLE_ENRICHMENT_TEXT = `Tesla Inc. is an American multinational automotive and clean energy company headquartered in Austin, Texas. Founded in 2003 by Martin Eberhard and Marc Tarpenning, the company is now led by CEO Elon Musk. Tesla specializes in electric vehicles, battery energy storage, solar panels, and related products.`;

interface ModelOption {
  id: string;
  key: string;
  label: string;
  provider: string;
}

interface Entity {
  uid: string;
  name: string;
  type: string;
  confidence: number;
  sourceText?: string;
}

interface DiscoveryResult {
  success: boolean;
  entities: Entity[];
  processingTimeMs?: number;
  metadata?: {
    returned: number;
  };
  error?: string;
}

interface EnrichmentResult {
  success: boolean;
  enrichedData: Record<string, unknown>;
  processingTimeMs?: number;
  metadata?: {
    fieldsExtracted: string[];
  };
  error?: string;
}

interface Relationship {
  uid: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  properties?: Record<string, unknown>;
}

interface RelationshipsResult {
  success: boolean;
  relationships: Relationship[];
  processingTimeMs?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

interface Event {
  uid: string;
  name: string;
  eventType?: string;
  date?: string;
  location?: string;
  significance?: string;
  confidence: number;
  participants?: string[];
  description?: string;
}

interface EventsResult {
  success: boolean;
  events: Event[];
  processingTimeMs?: number;
  metadata?: {
    returned: number;
    totalFound: number;
  };
  error?: string;
}

export function CoreToolsPlayground() {
  const { toast } = useToast();

  // Models state
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Discovery tool state
  const [discoveryText, setDiscoveryText] = useState(SAMPLE_TEXT);
  const [discoveryDomains, setDiscoveryDomains] = useState(
    "social, academic, geographic"
  );
  const [discoveryMaxEntities, setDiscoveryMaxEntities] = useState(25);
  const [discoveryModelId, setDiscoveryModelId] = useState(
    "gemini-2.5-flash-lite"
  );
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<DiscoveryResult | null>(null);

  // Enrichment tool state
  const [enrichmentText, setEnrichmentText] = useState(SAMPLE_ENRICHMENT_TEXT);
  const [enrichmentEntityName, setEnrichmentEntityName] =
    useState("Tesla Inc.");
  const [enrichmentEntityType, setEnrichmentEntityType] =
    useState("Organization");
  const [enrichmentFields, setEnrichmentFields] = useState(
    "founded, headquarters, industry, employees, orgType"
  );
  const [enrichmentModelId, setEnrichmentModelId] = useState(
    "gemini-2.5-flash-lite"
  );
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentResult, setEnrichmentResult] =
    useState<EnrichmentResult | null>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // Relationships tool state
  const [relationshipsText, setRelationshipsText] = useState(SAMPLE_TEXT);
  const [relationshipsModelId, setRelationshipsModelId] = useState(
    "gemini-2.5-flash-lite"
  );
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [relationshipsResult, setRelationshipsResult] =
    useState<RelationshipsResult | null>(null);
  const [relationshipsEntities, setRelationshipsEntities] = useState<Entity[]>(
    []
  );

  // Events tool state
  const [eventsText, setEventsText] = useState(
    "Donald Trump held a campaign rally in Des Moines, Iowa on January 15, 2024, drawing thousands of supporters. He appeared in federal court on January 28, 2024 for a hearing related to classified documents. In March 2024, Trump announced his running mate at a major press conference in Mar-a-Lago."
  );
  const [eventsPrimaryEntity, setEventsPrimaryEntity] = useState(
    "person:donald_trump"
  );
  const [eventsEventTypes, setEventsEventTypes] = useState("");
  const [eventsDateFrom, setEventsDateFrom] = useState("");
  const [eventsDateTo, setEventsDateTo] = useState("");
  const [eventsModelId, setEventsModelId] = useState("gemini-2.5-flash-lite");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsResult, setEventsResult] = useState<EventsResult | null>(null);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/playground/models");
        if (response.ok) {
          const data = await response.json();
          // Flatten models by provider for easier rendering
          const models: ModelOption[] = [];
          const providers = data.modelsByProvider as Record<
            string,
            { label: string; models: { id: string; label: string }[] }
          >;
          Object.entries(providers || {}).forEach(([providerId, provider]) => {
            provider.models.forEach((model) => {
              models.push({
                id: model.id,
                key: `${providerId}-${model.id}`, // Unique key
                label: `${provider.label} - ${model.label}`,
                provider: providerId,
              });
            });
          });
          setAvailableModels(models);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Fetch available fields when entity type changes
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(
          `/api/playground/entity-fields?entityType=${encodeURIComponent(enrichmentEntityType)}`
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableFields(data.fields || []);
        }
      } catch (error) {
        console.error("Failed to fetch entity fields:", error);
        setAvailableFields([]);
      }
    };

    if (enrichmentEntityType) {
      fetchFields();
    }
  }, [enrichmentEntityType]);

  // Handle entity type change - update fields with domain-defined defaults
  const handleEntityTypeChange = async (type: string) => {
    setEnrichmentEntityType(type);

    // Fetch fields for the new type
    try {
      const response = await fetch(
        `/api/playground/entity-fields?entityType=${encodeURIComponent(type)}`
      );
      if (response.ok) {
        const data = await response.json();
        const suggestedFields = data.fields || [];
        if (suggestedFields.length > 0) {
          setEnrichmentFields(suggestedFields.slice(0, 5).join(", "));
        }
        setAvailableFields(suggestedFields);
      }
    } catch (error) {
      console.error("Failed to fetch entity fields:", error);
    }
  };

  // Discovery handler
  const handleDiscovery = async () => {
    if (!discoveryText.trim()) return;

    setDiscoveryLoading(true);
    try {
      const domains = discoveryDomains.split(",").map((d) => d.trim());

      const response = await fetch("/api/playground/discover-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: discoveryText,
          domains,
          maxEntities: discoveryMaxEntities,
          modelId: discoveryModelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      setDiscoveryResult(result);

      if (result.success) {
        toast({
          title: "Discovery Complete",
          description: `Found ${result.entities.length} entities`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Discovery Failed",
          description: result.error || "Unknown error",
        });
      }
    } catch (error: unknown) {
      console.error("Discovery error:", error);
      toast({
        variant: "destructive",
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Enrichment handler
  const handleEnrichment = async () => {
    if (!enrichmentText.trim() || !enrichmentEntityName.trim()) return;

    setEnrichmentLoading(true);
    try {
      const fields = enrichmentFields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      if (fields.length === 0) {
        toast({
          variant: "destructive",
          title: "No Fields Selected",
          description: "Please select at least one field to extract",
        });
        setEnrichmentLoading(false);
        return;
      }

      const response = await fetch("/api/playground/enrich-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: enrichmentEntityName,
          entityType: enrichmentEntityType,
          content: enrichmentText,
          fieldsToExtract: fields,
          modelId: enrichmentModelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      setEnrichmentResult(result);

      if (result.success) {
        toast({
          title: "Enrichment Complete",
          description: `Extracted ${result.metadata.fieldsExtracted.length} fields`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Enrichment Failed",
          description: result.error || "Unknown error",
        });
      }
    } catch (error: unknown) {
      console.error("Enrichment error:", error);
      toast({
        variant: "destructive",
        title: "Enrichment Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setEnrichmentLoading(false);
    }
  };

  // Relationships handler
  const handleRelationships = async () => {
    if (!relationshipsText.trim() || relationshipsEntities.length < 2) {
      toast({
        variant: "destructive",
        title: "Insufficient Data",
        description:
          "Need at least 2 entities. Run discovery first or add entities manually.",
      });
      return;
    }

    setRelationshipsLoading(true);
    try {
      const response = await fetch("/api/playground/extract-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: relationshipsText,
          entities: relationshipsEntities,
          domains: ["social", "academic", "geographic"],
          modelId: relationshipsModelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      setRelationshipsResult(result);

      if (result.success) {
        toast({
          title: "Extraction Complete",
          description: `Found ${result.relationships.length} relationships`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Extraction Failed",
          description: result.error || "Unknown error",
        });
      }
    } catch (error: unknown) {
      console.error("Relationships error:", error);
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRelationshipsLoading(false);
    }
  };

  // Events handler
  const handleEvents = async () => {
    if (!eventsText.trim()) return;

    setEventsLoading(true);
    try {
      const eventTypes = eventsEventTypes
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        content: eventsText,
        primaryEntity: eventsPrimaryEntity || undefined,
        modelId: eventsModelId,
      };

      if (eventTypes.length > 0) {
        payload.eventTypes = eventTypes;
      }
      if (eventsDateFrom && eventsDateTo) {
        payload.dateRange = { from: eventsDateFrom, to: eventsDateTo };
      }

      const response = await fetch("/api/playground/discover-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      setEventsResult(result);

      if (result.success) {
        toast({
          title: "Events Discovered",
          description: `Found ${result.events.length} events`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Discovery Failed",
          description: result.error || "Unknown error",
        });
      }
    } catch (error: unknown) {
      console.error("Events error:", error);
      toast({
        variant: "destructive",
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setEventsLoading(false);
    }
  };

  // Use discovered entities for relationships
  const handleUseDiscoveredEntities = () => {
    if (discoveryResult?.entities) {
      setRelationshipsEntities(discoveryResult.entities);
      setRelationshipsText(discoveryText);
      toast({
        title: "Entities Loaded",
        description: `Loaded ${discoveryResult.entities.length} entities for relationship extraction`,
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Core Tools Playground</h1>
        <p className="text-muted-foreground mt-2">
          Test the four fundamental extraction tools: Entity Discovery, Entity
          Enrichment, Relationship Extraction, and Event Discovery
        </p>
      </div>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discover">🔍 Discover Entities</TabsTrigger>
          <TabsTrigger value="enrich">✨ Enrich Entity</TabsTrigger>
          <TabsTrigger value="relationships">
            🔗 Extract Relationships
          </TabsTrigger>
          <TabsTrigger value="events">📅 Discover Events</TabsTrigger>
        </TabsList>

        {/* DISCOVER TAB */}
        <TabsContent value="discover" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discovery-text">Text Content</Label>
                  <Textarea
                    id="discovery-text"
                    value={discoveryText}
                    onChange={(e) => setDiscoveryText(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Enter text to discover entities..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Domains (click to select)</Label>
                  <Typeahead
                    items={[...VALID_DOMAINS]}
                    value={discoveryDomains}
                    onChange={setDiscoveryDomains}
                    placeholder="Select domains..."
                    mode="multi"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {[...VALID_DOMAINS].join(", ")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discovery-max">Max Entities</Label>
                  <input
                    id="discovery-max"
                    type="number"
                    value={discoveryMaxEntities}
                    onChange={(e) =>
                      setDiscoveryMaxEntities(parseInt(e.target.value) || 25)
                    }
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discovery-model">Model</Label>
                  <select
                    id="discovery-model"
                    value={discoveryModelId}
                    onChange={(e) => setDiscoveryModelId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                    disabled={modelsLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.key} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleDiscovery}
                  disabled={discoveryLoading || !discoveryText.trim()}
                  className="w-full"
                >
                  {discoveryLoading ? "Discovering..." : "Discover Entities"}
                </Button>

                {discoveryResult && (
                  <Button
                    onClick={handleUseDiscoveredEntities}
                    variant="outline"
                    className="w-full"
                  >
                    Use for Relationships →
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <CardTitle>Discovered Entities</CardTitle>
              </CardHeader>
              <CardContent>
                {discoveryLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Discovering entities...
                      </p>
                    </div>
                  </div>
                )}

                {!discoveryLoading && !discoveryResult && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground">
                      Enter text and click Discover Entities
                    </p>
                  </div>
                )}

                {!discoveryLoading && discoveryResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            discoveryResult.success ? "default" : "destructive"
                          }
                        >
                          {discoveryResult.success ? "Success" : "Failed"}
                        </Badge>
                        {discoveryResult.processingTimeMs && (
                          <Badge variant="outline" className="text-xs">
                            ⚡{" "}
                            {(discoveryResult.processingTimeMs / 1000).toFixed(
                              2
                            )}
                            s
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {discoveryResult.metadata?.returned || 0} entities
                      </span>
                    </div>

                    {discoveryResult.entities &&
                      discoveryResult.entities.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {discoveryResult.entities.map((entity: Entity) => (
                            <div
                              key={entity.uid}
                              className="p-3 border border-border rounded-lg bg-background-secondary"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {entity.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {entity.type}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {entity.uid}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {(entity.confidence * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              {entity.sourceText && (
                                <div className="mt-2 text-xs text-muted-foreground italic">
                                  &quot;{entity.sourceText.substring(0, 80)}
                                  ...&quot;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    <div className="pt-4 border-t border-border">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border border-border max-h-32 overflow-y-auto">
                        {JSON.stringify(discoveryResult.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ENRICH TAB */}
        <TabsContent value="enrich" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="enrichment-name">Entity Name</Label>
                  <input
                    id="enrichment-name"
                    type="text"
                    value={enrichmentEntityName}
                    onChange={(e) => setEnrichmentEntityName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="e.g., Tesla Inc."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entity Type (click to select)</Label>
                  <Typeahead
                    items={ALL_ENTITY_TYPES}
                    value={enrichmentEntityType}
                    onChange={handleEntityTypeChange}
                    placeholder="e.g., Organization"
                    mode="single"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrichment-fields">
                    Fields to Extract (comma-separated)
                  </Label>
                  <Typeahead
                    items={availableFields}
                    value={enrichmentFields}
                    onChange={setEnrichmentFields}
                    placeholder="Select fields..."
                    mode="multi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrichment-text">Content</Label>
                  <Textarea
                    id="enrichment-text"
                    value={enrichmentText}
                    onChange={(e) => setEnrichmentText(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Enter text containing information about the entity..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrichment-model">Model</Label>
                  <select
                    id="enrichment-model"
                    value={enrichmentModelId}
                    onChange={(e) => setEnrichmentModelId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                    disabled={modelsLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.key} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleEnrichment}
                  disabled={
                    enrichmentLoading ||
                    !enrichmentText.trim() ||
                    !enrichmentEntityName.trim()
                  }
                  className="w-full"
                >
                  {enrichmentLoading ? "Enriching..." : "Enrich Entity"}
                </Button>
              </CardContent>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <CardTitle>Enriched Data</CardTitle>
              </CardHeader>
              <CardContent>
                {enrichmentLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Enriching entity...
                      </p>
                    </div>
                  </div>
                )}

                {!enrichmentLoading && !enrichmentResult && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground">
                      Configure entity and click Enrich Entity
                    </p>
                  </div>
                )}

                {!enrichmentLoading && enrichmentResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            enrichmentResult.success ? "default" : "destructive"
                          }
                        >
                          {enrichmentResult.success ? "Success" : "Failed"}
                        </Badge>
                        {enrichmentResult.processingTimeMs && (
                          <Badge variant="outline" className="text-xs">
                            ⚡{" "}
                            {(enrichmentResult.processingTimeMs / 1000).toFixed(
                              2
                            )}
                            s
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {enrichmentResult.metadata?.fieldsExtracted?.length ||
                          0}{" "}
                        fields
                      </span>
                    </div>

                    {enrichmentResult.enrichedData &&
                      Object.keys(enrichmentResult.enrichedData).length > 0 && (
                        <div className="space-y-2">
                          {Object.entries(enrichmentResult.enrichedData).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="p-3 border border-border rounded-lg bg-background-secondary"
                              >
                                <div className="text-sm font-medium">{key}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                    <div className="pt-4 border-t border-border">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border border-border max-h-32 overflow-y-auto">
                        {JSON.stringify(enrichmentResult.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RELATIONSHIPS TAB */}
        <TabsContent value="relationships" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="relationships-text">Text Content</Label>
                  <Textarea
                    id="relationships-text"
                    value={relationshipsText}
                    onChange={(e) => setRelationshipsText(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Enter text containing relationships..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entities ({relationshipsEntities.length})</Label>
                  {relationshipsEntities.length === 0 ? (
                    <div className="p-4 border border-border rounded-lg bg-background-secondary text-center">
                      <p className="text-sm text-muted-foreground">
                        No entities loaded. Run Discovery first or add manually.
                      </p>
                      {discoveryResult?.entities && (
                        <Button
                          onClick={handleUseDiscoveredEntities}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          Load from Discovery ({discoveryResult.entities.length}
                          )
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                      {relationshipsEntities.map((entity) => (
                        <div
                          key={entity.uid}
                          className="text-xs px-2 py-1 bg-background-secondary rounded"
                        >
                          {entity.name} ({entity.type})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationships-model">Model</Label>
                  <select
                    id="relationships-model"
                    value={relationshipsModelId}
                    onChange={(e) => setRelationshipsModelId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                    disabled={modelsLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.key} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleRelationships}
                  disabled={
                    relationshipsLoading || relationshipsEntities.length < 2
                  }
                  className="w-full"
                >
                  {relationshipsLoading
                    ? "Extracting..."
                    : "Extract Relationships"}
                </Button>
              </CardContent>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <CardTitle>Extracted Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                {relationshipsLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Extracting relationships...
                      </p>
                    </div>
                  </div>
                )}

                {!relationshipsLoading && !relationshipsResult && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground">
                      Load entities and click Extract Relationships
                    </p>
                  </div>
                )}

                {!relationshipsLoading && relationshipsResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            relationshipsResult.success
                              ? "default"
                              : "destructive"
                          }
                        >
                          {relationshipsResult.success ? "Success" : "Failed"}
                        </Badge>
                        {relationshipsResult.processingTimeMs && (
                          <Badge variant="outline" className="text-xs">
                            ⚡{" "}
                            {(
                              relationshipsResult.processingTimeMs / 1000
                            ).toFixed(2)}
                            s
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {relationshipsResult.relationships?.length || 0}{" "}
                        relationships
                      </span>
                    </div>

                    {relationshipsResult.relationships &&
                      relationshipsResult.relationships.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {relationshipsResult.relationships.map(
                            (rel: Relationship) => {
                              const source = relationshipsEntities.find(
                                (e) => e.uid === rel.source
                              );
                              const target = relationshipsEntities.find(
                                (e) => e.uid === rel.target
                              );

                              return (
                                <div
                                  key={rel.uid}
                                  className="p-3 border border-border rounded-lg bg-background-secondary"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">
                                        {source?.name || rel.source} →{" "}
                                        {target?.name || rel.target}
                                      </div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {rel.type}
                                      </div>
                                      {rel.properties &&
                                        Object.keys(rel.properties).length >
                                          0 && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {JSON.stringify(rel.properties)}
                                          </div>
                                        )}
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {(rel.confidence * 100).toFixed(0)}%
                                    </Badge>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}

                    {relationshipsResult.relationships?.length === 0 && (
                      <div className="p-4 border border-border rounded-lg bg-background-secondary text-center">
                        <p className="text-sm text-muted-foreground">
                          No relationships found in the text
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border border-border max-h-32 overflow-y-auto">
                        {JSON.stringify(relationshipsResult.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="events-text">Text Content</Label>
                  <Textarea
                    id="events-text"
                    value={eventsText}
                    onChange={(e) => setEventsText(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Enter text containing events..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="events-entity">
                    Primary Entity (optional)
                  </Label>
                  <input
                    id="events-entity"
                    type="text"
                    value={eventsPrimaryEntity}
                    onChange={(e) => setEventsPrimaryEntity(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    placeholder="e.g., person:donald_trump"
                  />
                  <p className="text-xs text-muted-foreground">
                    Filter events related to specific entity
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Event Types (optional)</Label>
                  <Typeahead
                    items={[...EVENT_TYPES]}
                    value={eventsEventTypes}
                    onChange={setEventsEventTypes}
                    placeholder="Select event types..."
                    mode="multi"
                  />
                  <p className="text-xs text-muted-foreground">
                    Filter by: rally, conference, legal_proceeding, etc.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="events-date-from">Date From</Label>
                    <input
                      id="events-date-from"
                      type="date"
                      value={eventsDateFrom}
                      onChange={(e) => setEventsDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="events-date-to">Date To</Label>
                    <input
                      id="events-date-to"
                      type="date"
                      value={eventsDateTo}
                      onChange={(e) => setEventsDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="events-model">Model</Label>
                  <select
                    id="events-model"
                    value={eventsModelId}
                    onChange={(e) => setEventsModelId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                    disabled={modelsLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.key} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleEvents}
                  disabled={eventsLoading || !eventsText.trim()}
                  className="w-full"
                >
                  {eventsLoading ? "Discovering..." : "Discover Events"}
                </Button>
              </CardContent>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <CardTitle>Discovered Events</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Discovering events...
                      </p>
                    </div>
                  </div>
                )}

                {!eventsLoading && !eventsResult && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground">
                      Enter text and click Discover Events
                    </p>
                  </div>
                )}

                {!eventsLoading && eventsResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            eventsResult.success ? "default" : "destructive"
                          }
                        >
                          {eventsResult.success ? "Success" : "Failed"}
                        </Badge>
                        {eventsResult.processingTimeMs && (
                          <Badge variant="outline" className="text-xs">
                            ⚡{" "}
                            {(eventsResult.processingTimeMs / 1000).toFixed(2)}s
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {eventsResult.metadata?.returned || 0} events
                      </span>
                    </div>

                    {eventsResult.events && eventsResult.events.length > 0 && (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {eventsResult.events.map((event: Event) => (
                          <div
                            key={event.uid}
                            className="p-3 border border-border rounded-lg bg-background-secondary"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{event.name}</div>
                                <div className="flex gap-2 mt-1">
                                  {event.eventType && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {event.eventType}
                                    </Badge>
                                  )}
                                  {event.significance && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {event.significance}
                                    </Badge>
                                  )}
                                </div>
                                {event.date && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    📅 {event.date}
                                  </div>
                                )}
                                {event.location && (
                                  <div className="text-xs text-muted-foreground">
                                    📍 {event.location}
                                  </div>
                                )}
                                {event.description && (
                                  <div className="text-xs text-muted-foreground mt-1 italic">
                                    {event.description.substring(0, 100)}...
                                  </div>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {(event.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {eventsResult.events?.length === 0 && (
                      <div className="p-4 border border-border rounded-lg bg-background-secondary text-center">
                        <p className="text-sm text-muted-foreground">
                          No events found in the text
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border">
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border border-border max-h-32 overflow-y-auto">
                        {JSON.stringify(eventsResult.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-background-secondary">
        <CardHeader>
          <CardTitle className="text-lg">About Core Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong className="font-semibold">🔍 Discover Entities:</strong>
            <p className="text-muted-foreground">
              Domain-aware entity discovery with confidence scoring,
              deduplication, and source grounding.
            </p>
          </div>
          <div>
            <strong className="font-semibold">✨ Enrich Entity:</strong>
            <p className="text-muted-foreground">
              Extract structured data from content using schema-based or
              example-based extraction. Content-agnostic (works with any text
              source).
            </p>
          </div>
          <div>
            <strong className="font-semibold">🔗 Extract Relationships:</strong>
            <p className="text-muted-foreground">
              Find relationships between entities with focus entity strategy,
              batch processing, and domain-aware relationship types.
            </p>
          </div>
          <div>
            <strong className="font-semibold">📅 Discover Events:</strong>
            <p className="text-muted-foreground">
              Discover events from text with filtering by type, date range,
              significance, and entity participation. Includes deduplication and
              source grounding.
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              These tools are the building blocks for multi-phase extraction
              pipelines and can be composed together.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
