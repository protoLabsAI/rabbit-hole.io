"use client";

/**
 * useResearchAgentCanvas
 *
 * Progressively imports entities from a PartialBundle into the Graphology canvas.
 * Tracks imported UIDs to avoid duplicates. Only imports new entities/relationships
 * that haven't been seen before.
 *
 * This hook does NOT call useCoAgent — the partialBundle is passed in as a prop.
 * The parent component is responsible for reading agent state via useCoAgent.
 */

import type Graph from "graphology";
import { useCallback, useEffect, useRef } from "react";

import type { PartialBundle, RabbitHoleBundleData } from "@proto/types";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";
import { importBundle } from "../lib/bundle-importer";
import { applyForceLayout } from "../lib/layoutAlgorithms";

interface UseResearchAgentCanvasOptions {
  partialBundle: PartialBundle | null;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes> | null;
  enabled: boolean;
  setGraphVersion: React.Dispatch<React.SetStateAction<number>>;
}

export interface ResearchAgentCanvasState {
  isResearching: boolean;
  isComplete: boolean;
  importedEntityCount: number;
  importedRelationshipCount: number;
}

export function useResearchAgentCanvas({
  partialBundle,
  graph,
  enabled,
  setGraphVersion,
}: UseResearchAgentCanvasOptions): ResearchAgentCanvasState {
  const importedEntityUids = useRef<Set<string>>(new Set());
  const importedRelationshipKeys = useRef<Set<string>>(new Set());
  const lastPhase = useRef<string | null>(null);
  const importedEntityCount = useRef(0);
  const importedRelationshipCount = useRef(0);

  const importNewEntities = useCallback(
    async (bundle: PartialBundle) => {
      if (!graph || !enabled) return;

      // Find entities not yet imported
      const newEntities = bundle.entities.filter(
        (e) => e.uid && !importedEntityUids.current.has(e.uid)
      );

      // Find relationships not yet imported
      const newRelationships = bundle.relationships.filter((r) => {
        const key = `${r.source}-${r.type}-${r.target}`;
        return !importedRelationshipKeys.current.has(key);
      });

      if (newEntities.length === 0 && newRelationships.length === 0) return;

      // Build a mini-bundle with only new items
      const miniBundleData: RabbitHoleBundleData = {
        entities: newEntities,
        relationships: newRelationships,
        evidence: [],
        files: [],
        content: [],
        entityCitations: {},
        relationshipCitations: {},
      };

      try {
        const result = await importBundle(graph, miniBundleData, {
          mode: "merge",
          applyLayout: false,
          skipEnforcement: true,
        });

        // Track what we imported
        for (const entity of newEntities) {
          if (entity.uid) importedEntityUids.current.add(entity.uid);
        }
        for (const rel of newRelationships) {
          const key = `${rel.source}-${rel.type}-${rel.target}`;
          importedRelationshipKeys.current.add(key);
        }

        importedEntityCount.current += result.entitiesAdded;
        importedRelationshipCount.current += result.relationshipsAdded;

        // Apply layout for newly added nodes
        if (result.entitiesAdded > 0) {
          applyForceLayout(graph, {
            strength: -800,
            distance: 250,
            collisionRadius: 120,
          });
        }

        // Trigger re-render
        setGraphVersion((v) => v + 1);

        // Fit view when first entities arrive
        if (importedEntityUids.current.size === newEntities.length) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
          }, 100);
        }
      } catch (error) {
        console.error("[useResearchAgentCanvas] Import failed:", error);
      }
    },
    [graph, enabled, setGraphVersion]
  );

  // React to partialBundle changes
  useEffect(() => {
    if (!partialBundle || !enabled) return;

    // Only process when phase advances or entity/relationship count changes
    const phaseChanged = partialBundle.phase !== lastPhase.current;
    const hasNewData =
      partialBundle.entityCount > importedEntityUids.current.size ||
      partialBundle.relationshipCount > importedRelationshipKeys.current.size;

    if (phaseChanged || hasNewData) {
      lastPhase.current = partialBundle.phase;
      importNewEntities(partialBundle);
    }
  }, [partialBundle, enabled, importNewEntities]);

  // Reset tracking when a new research session starts
  useEffect(() => {
    if (
      partialBundle?.phase === "scoping" &&
      importedEntityUids.current.size > 0
    ) {
      importedEntityUids.current.clear();
      importedRelationshipKeys.current.clear();
      importedEntityCount.current = 0;
      importedRelationshipCount.current = 0;
      lastPhase.current = null;
    }
  }, [partialBundle?.phase]);

  return {
    isResearching: partialBundle != null && !partialBundle.isComplete,
    isComplete: partialBundle?.isComplete ?? false,
    importedEntityCount: importedEntityCount.current,
    importedRelationshipCount: importedRelationshipCount.current,
  };
}
