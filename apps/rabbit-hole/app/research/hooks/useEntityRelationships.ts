import type Graph from "graphology";
import { useMemo } from "react";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

export interface EntityRelationship {
  edgeId: string;
  type: string;
  direction: "incoming" | "outgoing";
  targetUid: string;
  targetName: string;
  targetType: string;
  confidence?: number;
  properties?: Record<string, any>;
}

export function useEntityRelationships(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes> | null | undefined,
  entityUid: string,
  graphVersion?: number
) {
  const relationships = useMemo(() => {
    if (!graph || !graph.hasNode(entityUid)) return [];

    const result: EntityRelationship[] = [];

    // Outgoing edges (entity → target)
    graph.outEdges(entityUid).forEach((edgeId) => {
      const attrs = graph.getEdgeAttributes(edgeId);
      const targetUid = graph.target(edgeId);
      const targetNode = graph.getNodeAttributes(targetUid);

      result.push({
        edgeId,
        type: attrs.type,
        direction: "outgoing",
        targetUid,
        targetName: targetNode.name,
        targetType: targetNode.type,
        confidence: attrs.confidence,
        properties: attrs.properties,
      });
    });

    // Incoming edges (source → entity)
    graph.inEdges(entityUid).forEach((edgeId) => {
      const attrs = graph.getEdgeAttributes(edgeId);
      const sourceUid = graph.source(edgeId);
      const sourceNode = graph.getNodeAttributes(sourceUid);

      result.push({
        edgeId,
        type: attrs.type,
        direction: "incoming",
        targetUid: sourceUid,
        targetName: sourceNode.name,
        targetType: sourceNode.type,
        confidence: attrs.confidence,
        properties: attrs.properties,
      });
    });

    return result;
  }, [graph, entityUid, graphVersion]);

  return { relationships };
}
