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
 * add nodes/edges to Cytoscape without full refresh.
 *
 * @param cyRef - Ref to the Cytoscape instance
 * @param onBundleComplete - Optional callback after a bundle finishes (e.g. to sync React state)
 */
export function useGraphUpdates(
  cyRef: React.RefObject<any>,
  onBundleComplete?: () => void
) {
  const onBundleCompleteRef = useRef(onBundleComplete);
  onBundleCompleteRef.current = onBundleComplete;

  const addEntityToGraph = useCallback(
    (event: GraphEntityEvent) => {
      const cy = cyRef.current;
      if (!cy || cy.destroyed()) return;

      // Skip if node already exists
      if (cy.getElementById(event.uid).length > 0) return;

      const color = getEntityColor(event.entityType);
      const image = getEntityImage(event.entityType);

      cy.add({
        group: "nodes",
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

      console.log(
        `🟢 Live: +node ${event.name} (${event.entityType})`
      );
    },
    [cyRef]
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
        group: "edges",
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
            // Optional: sync React state in background without visual disruption
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
    };
  }, [addEntityToGraph, addRelationshipToGraph]);
}
