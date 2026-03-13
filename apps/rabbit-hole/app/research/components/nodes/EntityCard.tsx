/**
 * Entity Card Node
 *
 * Custom React Flow node with contextual zoom display:
 * - Skeleton view (zoom < 0.5): Icon + abbreviated name only
 * - Minimal view (zoom 0.5-1.0): Icon + name + optional type/tags
 * - Expanded view (zoom > 1.0 + manually expanded): Full details with tabs
 */

/**
 * Zoom threshold constants for display mode switching
 *
 * SKELETON_ZOOM_THRESHOLD: Zoom level below which only skeleton (icon) is shown
 * - Empirically chosen at 0.5x zoom where text becomes hard to read
 * - Balances performance (fewer DOM elements) vs readability
 * - At <50% zoom, user is viewing graph structure, not reading details
 */
export const SKELETON_ZOOM_THRESHOLD = 0.5;

import { Handle, Position, NodeProps, useStore } from "@xyflow/react";
import type Graph from "graphology";
import React, { useState, useMemo, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { domainRegistry, getEnrichmentFieldsForEntity } from "@proto/types";
import { Badge, Button } from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";
import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { upsertEdge } from "@/graph-visualizer/model/graph";
import { useFileUploadDialog } from "@/hooks/ui/useFileUploadDialog";

import { useEntityRelationships } from "../../hooks/useEntityRelationships";
import { useEntityTimeline } from "../../hooks/useEntityTimeline";
import { getValidRelationshipsForDomain } from "../../lib/relationship-utils";
import { useConfirmDialog } from "../ConfirmDialog";

import { AddRelationshipRow } from "./AddRelationshipRow";
import { RelationshipRow } from "./RelationshipRow";
import { ResearchNeeded } from "./ResearchNeeded";

interface EntityData {
  uid: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  properties?: Record<string, any>;
  tags?: string[];
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  showTypeInMinimal?: boolean; // Show entity type in minimal card (default: false)
  showTagsInMinimal?: boolean; // Show tags in minimal card (default: false)
  // Graph context for relationship management
  graph?: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onGraphChange?: () => void;
  availableEntities?: Array<{ uid: string; name: string; type: string }>;
  graphVersion?: number; // Version counter to trigger relationship re-query
  readOnly?: boolean; // View-only mode (no edits)
  [key: string]: any; // Allow additional properties
}

interface EntityCardProps extends NodeProps {
  data: EntityData;
}

// Humanize field names for display
function humanizeFieldName(field: string): string {
  const labels: Record<string, string> = {
    birthDate: "Birth Date",
    deathDate: "Death Date",
    birthPlace: "Birth Place",
    deathPlace: "Death Place",
    deathCause: "Death Cause",
    ceo: "CEO",
    founded: "Founded",
    orgType: "Organization Type",
    headquarters: "Headquarters",
    industry: "Industry",
    employees: "Employees",
    revenue: "Revenue",
    netWorth: "Net Worth",
    spouse: "Spouse",
    children: "Children",
    parents: "Parents",
    residence: "Residence",
    bankruptcyDate: "Bankruptcy Date",
    dissolved: "Dissolved",
  };

  return labels[field] || field.replace(/([A-Z])/g, " $1").trim();
}

function EntityCardComponent({ data, selected }: EntityCardProps) {
  const { confirm: confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<
    "overview" | "properties" | "relationships" | "timeline"
  >("overview");
  const [showMissingFields, setShowMissingFields] = useState(false);
  const { toast } = useToast();
  const fileUpload = useFileUploadDialog();
  const color = data.color || getEntityColor(data.type || "Unknown");
  const icon = data.icon || getEntityImage(data.type || "Unknown");
  const isExpanded = data.isExpanded || false;

  // Check if this is a File entity and whether file has been uploaded
  const isFileEntity = data.type === "File";
  const hasFile = Boolean(
    data.properties?.key || data.properties?.canonicalKey
  );

  // Get current zoom level for contextual display
  const zoom = useStore((state) => state.transform[2]);

  // Determine display mode based on zoom
  // Zoom thresholds balance performance (fewer DOM elements at far zoom) vs. readability
  // SKELETON_ZOOM_THRESHOLD: Below this, show minimal skeleton (icon only) for performance
  // Empirically, 0.5 zoom is where text becomes hard to read and detail is unnecessary
  const displayMode = useMemo(() => {
    if (isExpanded) return "expanded";
    if (zoom < SKELETON_ZOOM_THRESHOLD) return "skeleton";
    return "minimal";
  }, [zoom, isExpanded]);

  // Query relationships for this entity
  const { relationships } = useEntityRelationships(data.graph, data.uid);

  // Query timeline for this entity
  const {
    events: timelineEvents,
    summary: timelineSummary,
    hasTimeline,
  } = useEntityTimeline(data.graph, data.uid, data.graphVersion);

  // Group relationships by type
  const groupedRelationships = useMemo(() => {
    const groups = new Map<
      string,
      Array<{
        edgeId: string;
        direction: "incoming" | "outgoing";
        targetUid: string;
        targetName: string;
        targetType: string;
        confidence?: number;
      }>
    >();

    relationships.forEach((rel) => {
      if (!groups.has(rel.type)) {
        groups.set(rel.type, []);
      }
      groups.get(rel.type)!.push({
        edgeId: rel.edgeId,
        direction: rel.direction,
        targetUid: rel.targetUid,
        targetName: rel.targetName,
        targetType: rel.targetType,
        confidence: rel.confidence,
      });
    });

    // Sort groups by type name
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, rels]) => ({
        type,
        relationships: rels,
      }));
  }, [relationships]);

  // Track expanded relationship type groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Get valid relationship types for this entity's domain
  const validRelationshipTypes = useMemo(
    () => getValidRelationshipsForDomain(data.type),
    [data.type]
  );

  // Get domain from entity type
  const domain = domainRegistry.getDomainFromEntityType(data.type) || "unknown";

  // Get domain config and card configuration
  const domainConfig = useMemo(() => {
    const domainName = domainRegistry.getDomainFromEntityType(data.type);
    return domainName ? domainRegistry.getDomainConfig(domainName) : null;
  }, [data.type]);

  // Get configured fields from domain card config (for Overview tab)
  const configuredFields = useMemo(() => {
    if (!domainConfig?.ui?.card?.fields) return [];

    // Filter fields appropriate for detailed view
    return domainConfig.ui.card.fields
      .filter((field) => {
        // Check if field should be visible at detailed size
        if (field.sizes && !field.sizes.includes("detailed")) {
          return false;
        }
        // Check conditional visibility
        if (
          field.visible &&
          !field.visible({
            uid: data.uid,
            name: data.name,
            type: data.type,
            properties: data.properties,
          })
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((field) => field.property);
  }, [domainConfig, data.uid, data.name, data.type, data.properties]);

  // Get enrichable fields for this entity
  const enrichableFields = useMemo(() => {
    const domainName = domainRegistry.getDomainFromEntityType(data.type);
    return getEnrichmentFieldsForEntity(data.type, domainName || "unknown");
  }, [data.type]);

  // Split Overview fields (from domain config) into filled and missing
  const overviewFields = useMemo(() => {
    const filled: string[] = [];
    const missing: string[] = [];

    configuredFields.forEach((field) => {
      const value = data.properties?.[field];
      const hasValue = value !== undefined && value !== null && value !== "";

      if (hasValue) {
        filled.push(field);
      } else {
        missing.push(field);
      }
    });

    return { filledFields: filled, missingFields: missing };
  }, [configuredFields, data.properties]);

  // Split Properties fields (from schema) into filled and missing
  const propertiesFields = useMemo(() => {
    const filled: string[] = [];
    const missing: string[] = [];

    enrichableFields.forEach((field) => {
      const value = data.properties?.[field];
      const hasValue = value !== undefined && value !== null && value !== "";

      if (hasValue) {
        filled.push(field);
      } else {
        missing.push(field);
      }
    });

    return { filledFields: filled, missingFields: missing };
  }, [enrichableFields, data.properties]);

  // Relationship mutation handlers
  const handleAddRelationship = useCallback(
    async (type: string, targetUid: string) => {
      if (!data.graph || !data.onGraphChange) return;

      const edgeId = `rel:${data.uid.split(":")[1]}_${type.toLowerCase()}_${targetUid.split(":")[1]}`;

      try {
        upsertEdge(data.graph, edgeId, data.uid, targetUid, {
          type,
          confidence: 0.8,
          properties: {
            createdAt: new Date().toISOString(),
            createdBy: "user",
          },
        });

        data.onGraphChange();

        toast({
          title: "Relationship Added",
          description: `${type.replace(/_/g, " ")} relationship created`,
        });
      } catch (error) {
        toast({
          title: "Failed to Add Relationship",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [data.graph, data.uid, data.onGraphChange, toast]
  );

  const handleDeleteRelationship = useCallback(
    async (edgeId: string) => {
      if (!data.graph || !data.onGraphChange) return;

      const confirmed = await confirmDialog({
        title: "Delete relationship?",
        description: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      });

      if (confirmed) {
        try {
          data.graph.dropEdge(edgeId);
          data.onGraphChange();

          toast({
            title: "Relationship Deleted",
            description: "Relationship removed from graph",
          });
        } catch (error) {
          toast({
            title: "Failed to Delete",
            description:
              error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        }
      }
    },
    [data.graph, data.onGraphChange, toast, confirmDialog]
  );

  const handleCreateNewEntity = useCallback(() => {
    toast({
      title: "Create Entity",
      description: "Right-click on canvas to create a new entity",
      variant: "default",
    });
  }, [toast]);

  // Handle file upload for File entities
  const handleFileUpload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fileUpload.open({
        entityUid: data.uid,
        entityName: data.name,
      });
    },
    [fileUpload, data.uid, data.name]
  );

  // Format file size for display
  const formatBytes = useCallback(
    (bytes: number | string | undefined): string => {
      if (!bytes) return "N/A";
      const numBytes = typeof bytes === "string" ? parseInt(bytes) : bytes;
      if (isNaN(numBytes)) return "N/A";

      if (numBytes < 1024) return `${numBytes} B`;
      if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
      return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
    },
    []
  );

  return (
    <div className="relative">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-muted-foreground !z-10"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-muted-foreground !z-10"
      />

      {!isExpanded ? (
        /* Compact Card - Fixed size, content scales with zoom */
        <div
          className="shadow-lg transition-shadow duration-300 hover:shadow-xl"
          style={{
            backgroundColor: color,
            border: `2px solid ${color}`,
            filter: selected ? "brightness(1.3) saturate(1.2)" : "none",
            padding: "8px 12px",
            width: "150px",
            height: "auto",
            minHeight: "48px",
            borderRadius: "var(--radius)",
          }}
        >
          {displayMode === "skeleton" ? (
            /* Skeleton: Entity-colored loading placeholder */
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded animate-pulse opacity-40"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 space-y-1">
                <div
                  className="h-3 rounded animate-pulse opacity-40"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="h-2 rounded animate-pulse w-3/4 opacity-40"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          ) : (
            /* Minimal: Full content */
            <>
              {/* Icon & Name */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span
                    className="text-white font-semibold text-sm truncate"
                    title={data.name || undefined}
                  >
                    {data.name}
                  </span>
                  {/* Optional Type */}
                  {data.showTypeInMinimal && (
                    <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                      {data.type}
                    </span>
                  )}
                </div>
              </div>

              {/* Optional Tags */}
              {data.showTagsInMinimal && data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.tags.slice(0, 2).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/20 text-white px-2 py-0.5"
                      style={{ borderRadius: "calc(var(--radius) * 0.75)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // Detailed Card - Draggable by header
        <div
          className="shadow-2xl bg-card border-2 animate-in fade-in zoom-in-95 duration-300"
          style={{
            borderColor: color,
            width: "400px",
            borderRadius: "var(--radius)",
          }}
        >
          {/* Header with close button - Drag handle */}
          <div
            className="flex items-center justify-between p-3 cursor-move"
            style={{
              backgroundColor: color,
              borderTopLeftRadius: "var(--radius)",
              borderTopRightRadius: "var(--radius)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate">
                  {data.name}
                </span>
                <span className="text-xs text-white/70">{data.type}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpanded?.();
              }}
              className="text-white/80 hover:text-white text-lg font-bold nodrag cursor-pointer flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Tabs - No drag */}
          <div className="flex border-b border-border nodrag">
            <button
              onClick={() => setActiveTab("overview")}
              title="Overview"
              className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                activeTab === "overview"
                  ? "border-b-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                borderBottomColor:
                  activeTab === "overview" ? color : "transparent",
              }}
            >
              <Icon name="info" size={16} />
            </button>
            <button
              onClick={() => setActiveTab("properties")}
              title="Properties"
              className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                activeTab === "properties"
                  ? "border-b-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                borderBottomColor:
                  activeTab === "properties" ? color : "transparent",
              }}
            >
              <Icon name="tag" size={16} />
            </button>
            <button
              onClick={() => setActiveTab("relationships")}
              title="Relations"
              className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                activeTab === "relationships"
                  ? "border-b-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                borderBottomColor:
                  activeTab === "relationships" ? color : "transparent",
              }}
            >
              <Icon name="network" size={16} />
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              title="Timeline"
              className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                activeTab === "timeline"
                  ? "border-b-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                borderBottomColor:
                  activeTab === "timeline" ? color : "transparent",
              }}
            >
              <Icon name="calendar" size={16} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 min-h-[200px]">
            {activeTab === "overview" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                {/* Entity header info */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {data.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{data.type}</span>
                    <span className="text-muted-foreground">•</span>
                    <span
                      className="capitalize"
                      style={{ color: color, opacity: 0.9 }}
                    >
                      {domain}
                    </span>
                  </div>
                </div>

                {/* File Upload Section - Only for File entities */}
                {isFileEntity && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      File Status
                    </h5>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {hasFile ? (
                          <>
                            {data.properties?.processingState === "completed" &&
                              "✅ File uploaded & processed"}
                            {data.properties?.processingState ===
                              "unprocessed" && "⏳ Processing pending"}
                            {data.properties?.processingState ===
                              "processing" && "⚙️ Processing..."}
                            {data.properties?.processingState === "failed" &&
                              "❌ Processing failed"}
                            {!data.properties?.processingState &&
                              "✅ File uploaded"}
                          </>
                        ) : (
                          "⏳ Awaiting upload"
                        )}
                      </span>
                      {!hasFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleFileUpload}
                          className="ml-2 nodrag"
                        >
                          Upload File
                        </Button>
                      )}
                    </div>

                    {/* File Info - Show if file uploaded */}
                    {hasFile && (
                      <div className="mt-3 space-y-1 text-xs">
                        {(data.properties?.mime ||
                          data.properties?.mediaType) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              MIME Type:
                            </span>
                            <span className="text-foreground">
                              {data.properties.mime ||
                                data.properties.mediaType}
                            </span>
                          </div>
                        )}
                        {(data.properties?.bytes || data.properties?.size) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Size:</span>
                            <span className="text-foreground">
                              {formatBytes(
                                data.properties.bytes || data.properties.size
                              )}
                            </span>
                          </div>
                        )}
                        {data.properties?.bucket && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Bucket:
                            </span>
                            <span className="text-foreground font-mono text-xs">
                              {data.properties.bucket}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Properties display - Filled fields first (from domain config) */}
                {overviewFields.filledFields.length > 0 && (
                  <div className="space-y-2">
                    {overviewFields.filledFields.map((field) => {
                      const value = data.properties?.[field];
                      return (
                        <div
                          key={field}
                          className="flex justify-between items-start py-1"
                        >
                          <span className="text-xs text-muted-foreground font-medium capitalize">
                            {field.replace(/_/g, " ")}:
                          </span>
                          <span className="text-xs text-foreground ml-2 flex-1 text-right">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Missing fields - Collapsible section (from domain config) */}
                {overviewFields.missingFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowMissingFields(!showMissingFields)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors nodrag"
                    >
                      <span className="uppercase tracking-wide">
                        Missing Fields ({overviewFields.missingFields.length})
                      </span>
                      <Icon
                        name={showMissingFields ? "chevron-up" : "chevron-down"}
                        size={16}
                      />
                    </button>

                    {showMissingFields && (
                      <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {overviewFields.missingFields.map((field) => (
                          <div
                            key={field}
                            className="flex justify-between items-start py-1"
                          >
                            <span className="text-xs text-muted-foreground font-medium capitalize">
                              {field.replace(/_/g, " ")}:
                            </span>
                            <span className="text-xs ml-2 flex-1 text-right">
                              {/* Overview tab uses inline variant (subtle text link) */}
                              <ResearchNeeded
                                field={field}
                                entityUid={data.uid}
                                entityType={data.type}
                                variant="inline"
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags display */}
                {data.tags && data.tags.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {data.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 border border-border bg-muted"
                          style={{ borderRadius: "calc(var(--radius) * 0.75)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "properties" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Filled fields first (from schema - exhaustive) */}
                {propertiesFields.filledFields.length > 0 && (
                  <div className="space-y-2">
                    {propertiesFields.filledFields.map((field) => {
                      const value = data.properties?.[field];
                      return (
                        <div
                          key={field}
                          className="flex justify-between items-start py-1"
                        >
                          <span className="text-xs text-muted-foreground font-medium capitalize">
                            {humanizeFieldName(field)}:
                          </span>
                          <span className="text-xs text-foreground ml-2 flex-1 text-right">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Missing fields - Collapsible section (from schema - exhaustive) */}
                {propertiesFields.missingFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowMissingFields(!showMissingFields)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors nodrag"
                    >
                      <span className="uppercase tracking-wide">
                        Missing Fields ({propertiesFields.missingFields.length})
                      </span>
                      <Icon
                        name={showMissingFields ? "chevron-up" : "chevron-down"}
                        size={16}
                      />
                    </button>

                    {showMissingFields && (
                      <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {propertiesFields.missingFields.map((field) => (
                          <div
                            key={field}
                            className="flex justify-between items-start py-1"
                          >
                            <span className="text-xs text-muted-foreground font-medium capitalize">
                              {humanizeFieldName(field)}:
                            </span>
                            <span className="text-xs ml-2 flex-1 text-right">
                              {/* Properties tab uses badge variant (prominent button with icon) */}
                              <ResearchNeeded
                                field={field}
                                entityUid={data.uid}
                                entityType={data.type}
                                variant="badge"
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {propertiesFields.filledFields.length === 0 &&
                  propertiesFields.missingFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No enrichable fields defined
                    </p>
                  )}

                {data.tags && data.tags.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {data.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 border border-border bg-muted"
                          style={{ borderRadius: "calc(var(--radius) * 0.75)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "relationships" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                {/* Grouped relationships */}
                {groupedRelationships.length > 0 ? (
                  <div className="space-y-2">
                    {groupedRelationships.map((group) => {
                      const isExpanded = expandedGroups.has(group.type);
                      return (
                        <div
                          key={group.type}
                          className="border rounded-md overflow-hidden"
                        >
                          {/* Group header */}
                          <button
                            onClick={() => toggleGroup(group.type)}
                            className="w-full px-3 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                name={
                                  isExpanded ? "chevron-down" : "chevron-right"
                                }
                                size={16}
                                className="text-muted-foreground"
                              />
                              <span className="text-sm font-medium">
                                {group.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({group.relationships.length})
                              </span>
                            </div>
                          </button>

                          {/* Group content */}
                          {isExpanded && (
                            <div className="p-2 space-y-1">
                              {group.relationships.map((rel) => (
                                <RelationshipRow
                                  key={rel.edgeId}
                                  type={group.type}
                                  direction={rel.direction}
                                  targetName={rel.targetName}
                                  targetType={rel.targetType}
                                  confidence={rel.confidence}
                                  onDelete={() =>
                                    handleDeleteRelationship(rel.edgeId)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No relationships yet
                  </p>
                )}

                {/* Add new relationship */}
                {data.graph &&
                  data.onGraphChange &&
                  data.availableEntities &&
                  !data.readOnly && (
                    <AddRelationshipRow
                      availableRelationshipTypes={validRelationshipTypes}
                      availableEntities={data.availableEntities.filter(
                        (e) => e.uid !== data.uid
                      )}
                      onAdd={handleAddRelationship}
                      onCreateNewEntity={handleCreateNewEntity}
                    />
                  )}

                {/* No graph context message */}
                {!data.graph && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Graph context not available
                  </p>
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                {hasTimeline ? (
                  <>
                    {/* Timeline Stats */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {timelineSummary?.totalEvents || 0} Events
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {timelineSummary?.dateRange
                          ? `${new Date(timelineSummary.dateRange.earliest).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(timelineSummary.dateRange.latest).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                          : "No range"}
                      </Badge>
                    </div>

                    {/* Timeline Event List */}
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {timelineEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-2 border rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {event.relationshipType.replace(/_/g, " ")}
                                </Badge>
                                {event.direction === "outgoing" ? (
                                  <span className="text-xs text-muted-foreground">
                                    →
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    ←
                                  </span>
                                )}
                              </div>
                              <p className="text-xs truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs flex-shrink-0 h-5"
                            >
                              {Math.round(event.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <span className="block text-4xl mb-2">📅</span>
                    <span className="block font-medium text-sm mb-1">
                      No Timeline Data
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Add timestamps to relationships to see timeline
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// React 19: Memoize EntityCard to prevent unnecessary re-renders (1008 lines, expensive)
export const EntityCard = React.memo(
  EntityCardComponent,
  (prevProps, nextProps) => {
    // Only re-render if relevant data changed
    return (
      prevProps.selected === nextProps.selected &&
      prevProps.data.uid === nextProps.data.uid &&
      prevProps.data.name === nextProps.data.name &&
      prevProps.data.type === nextProps.data.type &&
      prevProps.data.isExpanded === nextProps.data.isExpanded &&
      prevProps.data.graphVersion === nextProps.data.graphVersion &&
      prevProps.data.readOnly === nextProps.data.readOnly &&
      JSON.stringify(prevProps.data.properties) ===
        JSON.stringify(nextProps.data.properties) &&
      JSON.stringify(prevProps.data.tags) ===
        JSON.stringify(nextProps.data.tags)
    );
  }
);
