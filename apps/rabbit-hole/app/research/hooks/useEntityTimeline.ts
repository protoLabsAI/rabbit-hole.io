import type Graph from "graphology";
import { useMemo } from "react";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

export interface TimelineEventFromGraph {
  id: string;
  timestamp: string;
  eventType: "relationship";
  category: string;
  title: string;
  relationshipType: string;
  targetEntity: {
    uid: string;
    name: string;
    type: string;
  };
  direction: "incoming" | "outgoing";
  confidence: number;
  importance: "critical" | "major" | "minor";
}

export function useEntityTimeline(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes> | null | undefined,
  entityUid: string,
  graphVersion?: number
) {
  const events = useMemo(() => {
    if (!graph || !graph.hasNode(entityUid)) return [];

    const timelineEvents: TimelineEventFromGraph[] = [];

    // Process outgoing edges
    graph.outEdges(entityUid).forEach((edgeId) => {
      const attrs = graph.getEdgeAttributes(edgeId);
      const targetUid = graph.target(edgeId);
      const targetNode = graph.getNodeAttributes(targetUid);

      // Check if edge has a timestamp in properties
      const timestamp =
        attrs.properties?.at ||
        attrs.properties?.createdAt ||
        attrs.properties?.since ||
        attrs.properties?.timestamp ||
        attrs.properties?.from;

      if (timestamp) {
        timelineEvents.push({
          id: edgeId,
          timestamp,
          eventType: "relationship",
          category: attrs.type,
          title: `${attrs.type.replace(/_/g, " ")} → ${targetNode.name}`,
          relationshipType: attrs.type,
          targetEntity: {
            uid: targetUid,
            name: targetNode.name,
            type: targetNode.type,
          },
          direction: "outgoing",
          confidence: attrs.confidence ?? 0.8,
          importance: determineImportance(attrs),
        });
      }
    });

    // Process incoming edges
    graph.inEdges(entityUid).forEach((edgeId) => {
      const attrs = graph.getEdgeAttributes(edgeId);
      const sourceUid = graph.source(edgeId);
      const sourceNode = graph.getNodeAttributes(sourceUid);

      const timestamp =
        attrs.properties?.at ||
        attrs.properties?.createdAt ||
        attrs.properties?.since ||
        attrs.properties?.timestamp ||
        attrs.properties?.from;

      if (timestamp) {
        timelineEvents.push({
          id: edgeId,
          timestamp,
          eventType: "relationship",
          category: attrs.type,
          title: `${sourceNode.name} → ${attrs.type.replace(/_/g, " ")}`,
          relationshipType: attrs.type,
          targetEntity: {
            uid: sourceUid,
            name: sourceNode.name,
            type: sourceNode.type,
          },
          direction: "incoming",
          confidence: attrs.confidence ?? 0.8,
          importance: determineImportance(attrs),
        });
      }
    });

    // Sort by timestamp (newest first)
    return timelineEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [graph, entityUid, graphVersion]);

  const summary = useMemo(() => {
    if (events.length === 0) {
      return null;
    }

    const timestamps = events.map((e) => new Date(e.timestamp).getTime());
    const categoryCount = events.reduce(
      (acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEvents: events.length,
      dateRange: {
        earliest: new Date(Math.min(...timestamps)).toISOString(),
        latest: new Date(Math.max(...timestamps)).toISOString(),
      },
      eventCategories: categoryCount,
    };
  }, [events]);

  return { events, summary, hasTimeline: events.length > 0 };
}

function determineImportance(
  attrs: GraphEdgeAttributes
): "critical" | "major" | "minor" {
  const confidence = attrs.confidence ?? 0.8;

  // High confidence relationships are more important
  if (confidence >= 0.9) return "major";
  if (confidence >= 0.7) return "minor";
  return "minor";
}
