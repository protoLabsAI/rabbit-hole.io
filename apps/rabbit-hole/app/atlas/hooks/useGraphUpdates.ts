"use client";

import { useEffect, useRef, useCallback, useState } from "react";

import { getEntityVisual, getRelationshipVisual } from "../lib/atlas-schema";

// ─── Types ───────────────────────────────────────────────────────────

interface AtlasNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
}

interface AtlasLink {
  source: string;
  target: string;
  color: string;
}

interface GraphData {
  nodes: AtlasNode[];
  links: AtlasLink[];
}

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

// ─── Hook Return ─────────────────────────────────────────────────────

export interface GraphUpdatesState {
  connected: boolean;
  outOfSync: boolean;
  recentEntityCount: number;
  clearOutOfSync: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Subscribe to the /api/atlas/graph-updates SSE stream and merge incoming
 * node/link events into the 3D force-graph's graphData state.
 *
 * @param setGraphData - React setter from Atlas3DClient's useState<GraphData>
 * @param graphRef - ref to the ForceGraph3D instance (for reheatSimulation)
 * @param onBundleComplete - optional callback after a bundle_complete event
 */
export function useGraphUpdates(
  setGraphData: React.Dispatch<React.SetStateAction<GraphData | null>>,
  graphRef: React.RefObject<any>,
  onBundleComplete?: () => void
): GraphUpdatesState {
  const onBundleCompleteRef = useRef(onBundleComplete);
  onBundleCompleteRef.current = onBundleComplete;

  const [connected, setConnected] = useState(false);
  const [outOfSync, setOutOfSync] = useState(false);
  const [recentEntityCount, setRecentEntityCount] = useState(0);

  // Track current node IDs so we can deduplicate without reading state in callbacks
  const nodeIdsRef = useRef<Set<string>>(new Set());
  // Track link keys (source-target) for deduplication
  const linkKeysRef = useRef<Set<string>>(new Set());

  const addNode = useCallback(
    (event: GraphEntityEvent) => {
      if (nodeIdsRef.current.has(event.uid)) return;

      const visual = getEntityVisual(event.entityType);
      const newNode: AtlasNode = {
        id: event.uid,
        name: event.name,
        type: event.entityType,
        color: visual.color,
        val: visual.size,
      };

      nodeIdsRef.current.add(event.uid);

      setGraphData((prev) => {
        if (!prev) return prev;
        // Double-check dedup inside setter (prev could be stale in ref)
        if (prev.nodes.some((n) => n.id === event.uid)) return prev;
        return { ...prev, nodes: [...prev.nodes, newNode] };
      });
    },
    [setGraphData]
  );

  const addLink = useCallback(
    (event: GraphRelationshipEvent) => {
      const linkKey = `${event.source}-${event.target}`;
      if (linkKeysRef.current.has(linkKey)) return;

      // Only add link if both nodes exist
      if (
        !nodeIdsRef.current.has(event.source) ||
        !nodeIdsRef.current.has(event.target)
      ) {
        return;
      }

      const visual = getRelationshipVisual(event.relationshipType);
      const newLink: AtlasLink = {
        source: event.source,
        target: event.target,
        color: visual.color,
      };

      linkKeysRef.current.add(linkKey);

      setGraphData((prev) => {
        if (!prev) return prev;
        // Double-check dedup inside setter
        const alreadyExists = prev.links.some((l) => {
          const src =
            typeof l.source === "string" ? l.source : (l.source as any).id;
          const tgt =
            typeof l.target === "string" ? l.target : (l.target as any).id;
          return src === event.source && tgt === event.target;
        });
        if (alreadyExists) return prev;
        return { ...prev, links: [...prev.links, newLink] };
      });
    },
    [setGraphData]
  );

  const reheatSimulation = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;
    try {
      // react-force-graph-3d exposes d3Force — bump alpha to re-settle
      const simulation = fg.d3Force?.("simulation");
      if (simulation) {
        simulation.alpha(0.3).restart();
      } else {
        // Fallback: use reheatSimulation if available in newer versions
        fg.d3ReheatSimulation?.();
      }
    } catch {
      // Silently ignore — simulation may not be accessible
    }
  }, [graphRef]);

  useEffect(() => {
    const es = new EventSource("/api/atlas/graph-updates");

    es.onopen = () => {
      setConnected(true);
      setOutOfSync(false);
    };

    es.onmessage = (messageEvent) => {
      try {
        const data: GraphUpdateEvent = JSON.parse(messageEvent.data);

        switch (data.type) {
          case "entity_created":
            addNode(data);
            setRecentEntityCount((prev) => prev + 1);
            break;

          case "relationship_created":
            addLink(data);
            break;

          case "bundle_complete":
            // Re-settle the force simulation after new nodes land
            reheatSimulation();
            setRecentEntityCount(data.entitiesCreated);
            onBundleCompleteRef.current?.();
            break;
        }
      } catch {
        // Ignore parse errors (keepalive comments send no data)
      }
    };

    es.onerror = () => {
      setConnected(false);
      setOutOfSync(true);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [addNode, addLink, reheatSimulation]);

  const clearOutOfSync = useCallback(() => setOutOfSync(false), []);

  return { connected, outOfSync, recentEntityCount, clearOutOfSync };
}
