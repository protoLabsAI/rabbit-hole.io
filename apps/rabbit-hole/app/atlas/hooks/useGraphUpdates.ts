"use client";

import { useEffect, useRef, useCallback } from "react";

interface GraphUpdateEvent {
  type: "entity_created" | "relationship_created" | "bundle_complete";
  uid: string;
  name?: string;
  entityType?: string;
  source?: string;
  target?: string;
  relationshipType?: string;
  timestamp: string;
}

/**
 * Subscribe to real-time graph updates via SSE.
 *
 * When a bundle is ingested, the server streams entity_created and
 * relationship_created events. On bundle_complete, calls onRefresh
 * to reload the full graph so the Atlas visualization updates live.
 */
export function useGraphUpdates(onRefresh: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Debounce refresh — bundle_complete fires once at the end,
  // but we also handle rapid entity events gracefully
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      console.log("🔄 Graph update: refreshing Atlas...");
      onRefreshRef.current();
    }, 500);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/atlas/graph-updates");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: GraphUpdateEvent = JSON.parse(event.data);

        switch (data.type) {
          case "entity_created":
            console.log(
              `🟢 Live: entity ${data.name || data.uid} (${data.entityType})`
            );
            break;
          case "relationship_created":
            console.log(
              `🔗 Live: ${data.source} -[${data.relationshipType}]-> ${data.target}`
            );
            break;
          case "bundle_complete":
            console.log("📦 Live: bundle ingest complete, refreshing graph");
            scheduleRefresh();
            break;
        }
      } catch {
        // Ignore parse errors (keepalive comments, etc.)
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects, just log
      console.log("⚡ Graph updates: reconnecting...");
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [scheduleRefresh]);
}
