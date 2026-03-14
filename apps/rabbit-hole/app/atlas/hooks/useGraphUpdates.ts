"use client";

import { useEffect, useRef, useCallback, useState } from "react";

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

export interface GraphUpdatesState {
  connected: boolean;
  recentEntityCount: number;
}

export function useGraphUpdates(
  cyRef: React.RefObject<any>,
  onBundleComplete?: () => void
): GraphUpdatesState {
  const onBundleCompleteRef = useRef(onBundleComplete);
  onBundleCompleteRef.current = onBundleComplete;

  const [connected, setConnected] = useState(false);
  const [recentEntityCount, setRecentEntityCount] = useState(0);

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
          `Positioned ${newNodes.length} new nodes via layout-utilities`
        );
      }
    } catch (err) {
      console.warn("Layout utilities not available, skipping placement:", err);
    }

    pendingNodesRef.current = [];
  }, [cyRef]);

  const schedulePlacement = useCallback(() => {
    if (placeTimeoutRef.current) {
      clearTimeout(placeTimeoutRef.current);
    }
    placeTimeoutRef.current = setTimeout(placeNewNodes, 200);
  }, [placeNewNodes]);

  const addEntityToGraph = useCallback(
    (event: GraphEntityEvent) => {
      const cy = cyRef.current;
      if (!cy || cy.destroyed()) return;

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

      pendingNodesRef.current.push(event.uid);
      schedulePlacement();
    },
    [cyRef, schedulePlacement]
  );

  const addRelationshipToGraph = useCallback(
    (event: GraphRelationshipEvent) => {
      const cy = cyRef.current;
      if (!cy || cy.destroyed()) return;

      if (cy.getElementById(event.uid).length > 0) return;

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
    },
    [cyRef]
  );

  useEffect(() => {
    const es = new EventSource("/api/atlas/graph-updates");

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (messageEvent) => {
      try {
        const data: GraphUpdateEvent = JSON.parse(messageEvent.data);

        switch (data.type) {
          case "entity_created":
            addEntityToGraph(data);
            setRecentEntityCount((prev) => prev + 1);
            break;
          case "relationship_created":
            addRelationshipToGraph(data);
            break;
          case "bundle_complete":
            placeNewNodes();
            setRecentEntityCount(data.entitiesCreated);
            onBundleCompleteRef.current?.();
            break;
        }
      } catch {
        // Ignore parse errors (keepalive comments, etc.)
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
      if (placeTimeoutRef.current) {
        clearTimeout(placeTimeoutRef.current);
      }
    };
  }, [addEntityToGraph, addRelationshipToGraph, placeNewNodes]);

  return { connected, recentEntityCount };
}
