"use client";

import { useEffect, useRef, useCallback } from "react";

import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

interface GraphEntityEvent {
  type: "entity_created";
  uid: string;
  name: string;
  entityType: string;
  properties?: Record<string, unknown>;
  tags?: string[];
  aliases?: string[];
  timestamp: string;
}

interface GraphRelationshipEvent {
  type: "relationship_created";
  uid: string;
  relationshipType: string;
  source: string;
  target: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

interface GraphBundleCompleteEvent {
  type: "bundle_complete";
  uid: string;
  entitiesCreated: number;
  relationshipsCreated: number;
  timestamp: string;
}

type GraphUpdateEvent =
  | GraphEntityEvent
  | GraphRelationshipEvent
  | GraphBundleCompleteEvent;

/**
 * Subscribe to real-time graph updates via SSE and incrementally
 * add nodes/edges to Cytoscape using layout-utilities for smart positioning.
 *
 * New nodes are placed near their connected neighbors using quadrant scoring
 * from cytoscape-layout-utilities, so the graph stays readable at scale.
 */
export function useGraphUpdates(
  cyRef: React.RefObject<any>,
  onBundleComplete?: () => void
) {
  const onBundleCompleteRef = useRef(onBundleComplete);
  onBundleCompleteRef.current = onBundleComplete;

  // Batch new nodes added during a bundle for a single placeNewNodes call
  const pendingNodesRef = useRef<string[]>([]);
  const placeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const placeNewNodes = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || pendingNodesRef.current.length === 0) return;

    try {
      const layoutUtils = cy.layoutUtilities({
        idealEdgeLength: 100,
        offset: 30,
      });

      // Collect the pending nodes as a Cytoscape collection
      const newNodes = cy.collection();
      for (const uid of pendingNodesRef.current) {
        const node = cy.getElementById(uid);
        if (node.length > 0) {
          newNodes.merge(node);
        }
      }

      if (newNodes.length > 0) {
        layoutUtils.placeNewNodes(newNodes);
        console.log(
          `📍 Positioned ${newNodes.length} new nodes via layout-utilities`
        );
      }
    } catch (err) {
      // Fallback: if layout-utilities isn't registered, skip positioning
      console.warn("Layout utilities not available, skipping placement:", err);
    }

    pendingNodesRef.current = [];
  }, [cyRef]);

  const schedulePlacement = useCallback(() => {
    // Debounce: wait 200ms after last node add before placing all at once
    if (placeTimeoutRef.current) {
      clearTimeout(placeTimeoutRef.current);
    }
    placeTimeoutRef.current = setTimeout(placeNewNodes, 200);
  }, [placeNewNodes]);

  const addEntityToGraph = useCallback(
    (event: GraphEntityEvent) => {
      const cy = cyRef.current;
      if (!cy || cy.destroyed()) return;

      // Skip if node already exists
      if (cy.getElementById(event.uid).length > 0) return;

      const color = getEntityColor(event.entityType);
      const image = getEntityImage(event.entityType);

      cy.add({
        group: "nodes" as const,
        data: {
          id: event.uid,
          label: event.name,
          type: event.entityType,
          image,
          color,
          size: 35,
          connections: 0,
        },
        classes: `entity-${event.entityType}`,
      });

      // Queue for smart positioning
      pendingNodesRef.current.push(event.uid);
      schedulePlacement();

      console.log(
        `🟢 Live: +node ${event.name} (${event.entityType})`
      );
    },
    [cyRef, schedulePlacement]
  );

  const addRelationshipToGraph = useCallback(
    (event: GraphRelationshipEvent) => {
      const cy = cyRef.current;
      if (!cy || cy.destroyed()) return;

      // Skip if edge already exists
      if (cy.getElementById(event.uid).length > 0) return;

      // Only add if both source and target exist
      if (
        cy.getElementById(event.source).length === 0 ||
        cy.getElementById(event.target).length === 0
      ) {
        return;
      }

      cy.add({
        group: "edges" as const,
        data: {
          id: event.uid,
          source: event.source,
          target: event.target,
          label: event.relationshipType,
          type: event.relationshipType,
          color: "#888",
          sentiment: "neutral",
        },
      });

      console.log(
        `🔗 Live: +edge ${event.source} -[${event.relationshipType}]-> ${event.target}`
      );
    },
    [cyRef]
  );

  useEffect(() => {
    const es = new EventSource("/api/atlas/graph-updates");

    es.onmessage = (messageEvent) => {
      try {
        const data: GraphUpdateEvent = JSON.parse(messageEvent.data);

        switch (data.type) {
          case "entity_created":
            addEntityToGraph(data);
            break;
          case "relationship_created":
            addRelationshipToGraph(data);
            break;
          case "bundle_complete":
            console.log(
              `📦 Live: bundle complete (+${data.entitiesCreated} entities, +${data.relationshipsCreated} relationships)`
            );
            // Trigger final placement for any remaining nodes
            placeNewNodes();
            onBundleCompleteRef.current?.();
            break;
        }
      } catch {
        // Ignore parse errors (keepalive comments, etc.)
      }
    };

    es.onerror = () => {
      console.log("⚡ Graph updates: reconnecting...");
    };

    return () => {
      es.close();
      if (placeTimeoutRef.current) {
        clearTimeout(placeTimeoutRef.current);
      }
    };
  }, [addEntityToGraph, addRelationshipToGraph, placeNewNodes]);
}
