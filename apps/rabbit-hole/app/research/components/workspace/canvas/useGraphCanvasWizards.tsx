/**
 * useGraphCanvasWizards - Wizard dialog state management
 *
 * Manages state and handlers for:
 * - Research wizard
 * - File extraction wizard
 * - Enrichment wizard
 */

"use client";

import type Graph from "graphology";
import { useState, useCallback } from "react";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { upsertNode } from "@/graph-visualizer/model/graph";

import { applyForceLayout } from "../../../lib/layoutAlgorithms";
import {
  EnrichmentWizardDialog,
  FileExtractionWizardDialog,
  ResearchWizardDialog,
} from "../../dialogs";

interface UseGraphCanvasWizardsProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onGraphChange: () => void;
  userId?: string;
  userTier?: string;
  toast: (options: { title: string; description: string }) => void;
  logUserAction: (params: {
    action: string;
    page: string;
    userId: string;
    tier?: string;
    sessionId?: string;
    value?: Record<string, any>;
  }) => void;
}

export function useGraphCanvasWizards({
  graph,
  onGraphChange,
  userId,
  userTier,
  toast,
  logUserAction,
}: UseGraphCanvasWizardsProps) {
  // Wizard states
  const [showFileExtractionWizard, setShowFileExtractionWizard] =
    useState(false);
  const [showResearchWizard, setShowResearchWizard] = useState(false);
  const [enrichmentWizard, setEnrichmentWizard] = useState<{
    open: boolean;
    entity: GraphNodeAttributes | null;
  }>({
    open: false,
    entity: null,
  });

  // Handle file extraction/research wizard completion
  const handleExtractComplete = useCallback(
    (entities: any[], fileName: string, bundle?: any) => {
      console.log(
        `📄 Import complete for ${fileName}: ${entities.length} entities`
      );

      let addedCount = 0;
      let evidenceAddedCount = 0;
      let relationshipAddedCount = 0;

      // Add evidence nodes first (if bundle provided)
      if (bundle?.evidence) {
        bundle.evidence.forEach((evidence: any) => {
          if (!graph.hasNode(evidence.uid)) {
            upsertNode(graph, evidence.uid, {
              uid: evidence.uid,
              name: evidence.title || evidence.uid.split(":")[1],
              type: "Evidence",
              properties: evidence,
              tags: ["evidence", evidence.kind || "unknown"],
              aliases: [],
              size: 7,
            });
            evidenceAddedCount++;
          }
        });
      }

      // Add entities to graph
      entities.forEach((entity) => {
        if (!graph.hasNode(entity.uid)) {
          upsertNode(graph, entity.uid, entity);
          addedCount++;
        }
      });

      // Add relationships (if bundle provided)
      if (bundle?.relationships) {
        bundle.relationships.forEach((rel: any) => {
          if (graph.hasNode(rel.source) && graph.hasNode(rel.target)) {
            if (!graph.hasEdge(rel.source, rel.target)) {
              graph.addEdgeWithKey(rel.uid, rel.source, rel.target, {
                uid: rel.uid,
                type: rel.type,
                source: rel.source,
                target: rel.target,
                properties: rel.properties || {},
              });
              relationshipAddedCount++;
            }
          }
        });
      }

      if (
        addedCount === 0 &&
        evidenceAddedCount === 0 &&
        relationshipAddedCount === 0
      ) {
        toast({
          title: "No New Nodes",
          description: "All entities and evidence already exist in your graph",
        });
        return;
      }

      // Apply force layout to organize new nodes
      applyForceLayout(graph, {
        strength: -800,
        distance: 250,
        collisionRadius: 120,
        iterations: 100,
      });

      // Trigger graph update
      onGraphChange();

      const summary = [
        addedCount > 0 &&
          `${addedCount} ${addedCount === 1 ? "entity" : "entities"}`,
        evidenceAddedCount > 0 &&
          `${evidenceAddedCount} evidence ${evidenceAddedCount === 1 ? "node" : "nodes"}`,
        relationshipAddedCount > 0 &&
          `${relationshipAddedCount} ${relationshipAddedCount === 1 ? "relationship" : "relationships"}`,
      ]
        .filter(Boolean)
        .join(", ");

      toast({
        title: "Import Complete",
        description: `Added ${summary} from ${fileName}`,
      });

      // Log user action
      if (userId) {
        const sessionId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("sessionId") || undefined
            : undefined;

        logUserAction({
          action: "file_entity_extraction",
          page: "/research",
          userId,
          tier: userTier,
          sessionId,
          value: {
            fileName,
            entitiesExtracted: entities.length,
            entitiesAdded: addedCount,
            evidenceAdded: evidenceAddedCount,
            relationshipsAdded: relationshipAddedCount,
          },
        });
      }
    },
    [graph, onGraphChange, toast, userId, userTier, logUserAction]
  );

  // Handle enrichment completion
  const handleEnrichmentComplete = useCallback(
    (approvedProperties: Record<string, any>) => {
      const entity = enrichmentWizard.entity;
      if (!entity || !graph.hasNode(entity.uid)) return;

      // Merge approved properties into entity
      const currentProps =
        graph.getNodeAttribute(entity.uid, "properties") || {};
      graph.mergeNodeAttributes(entity.uid, {
        properties: {
          ...currentProps,
          ...approvedProperties,
        },
      });

      onGraphChange();

      toast({
        title: "Enrichment Applied",
        description: `Updated ${entity.name} with ${Object.keys(approvedProperties).length} properties`,
      });

      // Close wizard
      setEnrichmentWizard({ open: false, entity: null });
    },
    [enrichmentWizard.entity, graph, onGraphChange, toast]
  );

  // Open handlers
  const openFileExtractionWizard = useCallback(() => {
    setShowFileExtractionWizard(true);
  }, []);

  const openResearchWizard = useCallback(() => {
    setShowResearchWizard(true);
  }, []);

  const openEnrichmentWizard = useCallback((entity: GraphNodeAttributes) => {
    setEnrichmentWizard({ open: true, entity });
  }, []);

  // Wizard components
  const WizardComponents = (
    <>
      <FileExtractionWizardDialog
        open={showFileExtractionWizard}
        onOpenChange={setShowFileExtractionWizard}
        onComplete={handleExtractComplete}
        graph={graph}
      />

      <ResearchWizardDialog
        open={showResearchWizard}
        onOpenChange={setShowResearchWizard}
        onComplete={handleExtractComplete}
        graph={graph}
      />

      {enrichmentWizard.entity && (
        <EnrichmentWizardDialog
          open={enrichmentWizard.open}
          onOpenChange={(open) =>
            setEnrichmentWizard({
              open,
              entity: open ? enrichmentWizard.entity : null,
            })
          }
          entity={enrichmentWizard.entity}
          onComplete={handleEnrichmentComplete}
        />
      )}
    </>
  );

  return {
    // State
    showFileExtractionWizard,
    showResearchWizard,
    enrichmentWizard,

    // Handlers
    openFileExtractionWizard,
    openResearchWizard,
    openEnrichmentWizard,
    handleExtractComplete,
    handleEnrichmentComplete,

    // Components
    WizardComponents,
  };
}
