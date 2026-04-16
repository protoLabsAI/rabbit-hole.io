/**
 * Bundle Exporter
 *
 * Exports Graphology research graph to bundle format
 */

import type Graph from "graphology";

import type {
  Entity,
  Relationship,
  RabbitHoleBundleData,
  Content,
  Evidence,
  File as FileEntity,
} from "@protolabsai/types";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";

import type { ResearchBundle } from "./bundle-validator";

/**
 * Adds canvas position fields to any type for export
 * These fields are used to preserve node positions during bundle transport
 */
type WithCanvasPosition<T> = T & {
  canvas_x?: number;
  canvas_y?: number;
};

/**
 * Export Graphology graph to research bundle
 */
export function exportBundle(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  metadata: {
    sessionId: string;
    sessionName?: string;
    userId?: string;
  }
): ResearchBundle {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];

  // Export nodes as entities
  graph.forEachNode((nodeId, attrs) => {
    entities.push({
      uid: attrs.uid,
      name: attrs.name,
      type: attrs.type,
      properties: attrs.properties || {},
      tags: attrs.tags || [],
      aliases: attrs.aliases || [],
      canvas_x: attrs.x,
      canvas_y: attrs.y,
    });
  });

  // Export edges as relationships
  graph.forEachEdge((edgeId, attrs, source, target) => {
    relationships.push({
      uid: attrs.uid,
      type: attrs.type,
      source,
      target,
      properties: {
        ...(attrs.properties || {}),
        sentiment: attrs.sentiment,
        confidence: attrs.confidence,
      },
    });
  });

  return {
    entities,
    relationships,
    metadata: {
      version: "1.0",
      sessionId: metadata.sessionId,
      sessionName: metadata.sessionName,
      createdAt: new Date().toISOString(),
      userId: metadata.userId,
    },
  };
}

/**
 * Export Graphology graph to Rabbit Hole bundle with filtering
 * @param graph - Graphology graph
 * @param metadata - Session metadata
 * @param options - Export filtering options
 */
export function exportBundleFiltered(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  metadata: {
    sessionId: string;
    sessionName?: string;
    userId?: string;
  },
  options: {
    hiddenEntityTypes?: Set<string>;
    hiddenNodeIds?: Set<string>;
    includeHidden?: boolean;
  } = {}
): RabbitHoleBundleData {
  const entities: WithCanvasPosition<Entity>[] = [];
  const content: WithCanvasPosition<Content>[] = [];
  const evidence: WithCanvasPosition<Evidence>[] = [];
  const files: WithCanvasPosition<FileEntity>[] = [];
  const relationships: Relationship[] = [];
  const visibleNodeIds = new Set<string>();

  // Export visible nodes to appropriate arrays
  graph.forEachNode((nodeId, attrs) => {
    // Skip hidden context entities (hops+1 data)
    if (attrs.hidden && !options.includeHidden) return;

    // Skip filtered entity types
    if (options.hiddenEntityTypes?.has(attrs.type)) return;

    // Skip manually hidden nodes
    if (options.hiddenNodeIds?.has(nodeId)) return;

    visibleNodeIds.add(nodeId);

    // Route nodes to appropriate export arrays based on type
    if (attrs.type === "Content" && attrs.properties) {
      const props = attrs.properties;
      content.push({
        uid: attrs.uid,
        content_type: props.content_type,
        platform_uid: props.platform_uid,
        author_uid: props.author_uid,
        published_at: props.published_at,
        url: props.url,
        text_excerpt: props.text_excerpt,
        canvas_x: attrs.x,
        canvas_y: attrs.y,
      });
    } else if (attrs.type === "Evidence" && attrs.properties) {
      const props = attrs.properties;
      evidence.push({
        uid: attrs.uid,
        kind: props.kind,
        title: props.title,
        publisher: props.publisher,
        date: props.date,
        url: props.url,
        reliability: props.reliability,
        notes: props.notes,
        archive: props.archive,
        retrieved_at: props.retrieved_at,
        canvas_x: attrs.x,
        canvas_y: attrs.y,
      });
    } else if (attrs.type === "File" && attrs.properties) {
      const props = attrs.properties;
      files.push({
        uid: attrs.uid,
        content_hash: props.content_hash,
        mime: props.mime,
        bytes: props.bytes,
        bucket: props.bucket,
        key: props.key,
        aliases: attrs.aliases || [],
        canvas_x: attrs.x,
        canvas_y: attrs.y,
      });
    } else {
      // Regular entities
      entities.push({
        uid: attrs.uid,
        name: attrs.name,
        type: attrs.type,
        properties: attrs.properties || {},
        tags: attrs.tags || [],
        aliases: attrs.aliases || [],
        canvas_x: attrs.x,
        canvas_y: attrs.y,
      });
    }
  });

  // Export edges where BOTH endpoints are visible
  graph.forEachEdge((edgeId, attrs, source, target) => {
    if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) {
      return; // Skip relationships with hidden endpoints
    }

    relationships.push({
      uid: attrs.uid,
      type: attrs.type,
      source,
      target,
      properties: {
        ...(attrs.properties || {}),
        sentiment: attrs.sentiment,
        confidence: attrs.confidence,
      },
    });
  });

  const bundleData: RabbitHoleBundleData = {
    entities,
    relationships,
    evidence,
    files,
    content,
    entityCitations: {},
    relationshipCitations: {},
  };

  return bundleData;
}

/**
 * Download bundle as JSON file
 */
export function downloadBundle(
  bundle: ResearchBundle,
  filename?: string
): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `research-bundle-${bundle.metadata.sessionId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download Rabbit Hole bundle as JSON file
 */
export function downloadRabbitHoleBundle(
  bundle: RabbitHoleBundleData,
  filename?: string
): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `research-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
