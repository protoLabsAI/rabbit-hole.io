/**
 * Bundle Importer
 *
 * Imports Rabbit Hole bundle into Graphology graph for research workspace.
 * Supports three import modes: merge (safe), replace (clear all), overwrite (update).
 */

import type Graph from "graphology";

import type {
  RabbitHoleBundleData,
  Entity,
  Relationship,
  File as FileEntity,
} from "@proto/types";
import { validateRabbitHoleBundle } from "@proto/types";
import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import { vlog } from "@/lib/verbose-logger";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";
import { upsertNode, upsertEdge } from "../../graph-visualizer/model/graph";

// Dedupe warning logs to prevent spam
const warnLogCache = new Map<string, number>();
const WARN_LOG_TTL_MS = 60_000; // 60 seconds
const MAX_CACHE_SIZE = 100; // Cap to prevent unbounded growth

function shouldLogWarning(key: string): boolean {
  const now = Date.now();

  // Lazy cleanup: Remove stale entries if cache is getting large
  if (warnLogCache.size > MAX_CACHE_SIZE / 2) {
    for (const [cacheKey, timestamp] of warnLogCache.entries()) {
      if (now - timestamp > WARN_LOG_TTL_MS) {
        warnLogCache.delete(cacheKey);
      }
    }
  }

  const lastLogged = warnLogCache.get(key);

  if (!lastLogged || now - lastLogged > WARN_LOG_TTL_MS) {
    // Enforce size cap with simple FIFO eviction
    if (warnLogCache.size >= MAX_CACHE_SIZE) {
      const firstKey = warnLogCache.keys().next().value;
      if (firstKey) warnLogCache.delete(firstKey);
    }

    warnLogCache.set(key, now);
    return true;
  }

  return false;
}

export interface ImportOptions {
  /**
   * Import mode:
   * - "merge" (default): Add to existing graph, skip duplicates (safest)
   * - "replace": Clear graph first, then import (fresh start)
   * - "overwrite": Add to graph, update duplicates with new data
   * @default "merge"
   */
  mode?: "merge" | "replace" | "overwrite";

  /**
   * Whether to apply random layout to new nodes
   * @default true
   */
  applyLayout?: boolean;

  /**
   * Batch size for progressive loading
   * @default 50
   */
  batchSize?: number;

  /**
   * Progress callback
   */
  onProgress?: (loaded: number, total: number) => void;

  /**
   * Skip tier enforcement (only for server-validated imports)
   * Client-side imports should use API route with enforcement
   * @default false
   */
  skipEnforcement?: boolean;

  /**
   * Use exported positions from bundle (canvas_x, canvas_y)
   * If false, positions are ignored and layout algorithm is used
   * @default true
   */
  useExportedPositions?: boolean;
}

export interface ImportResult {
  entitiesAdded: number;
  entitiesSkipped: number;
  contentAdded: number;
  contentSkipped: number;
  evidenceAdded: number;
  evidenceSkipped: number;
  filesAdded: number;
  filesSkipped: number;
  relationshipsAdded: number;
  relationshipsSkipped: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import bundle into existing graph
 * @param graph - Graphology graph to import into
 * @param bundle - Rabbit Hole bundle data
 * @param options - Import configuration
 * @returns Import result summary
 */
export async function importBundle(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  bundle: RabbitHoleBundleData,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    mode = "merge",
    applyLayout = true,
    batchSize = 50,
    onProgress,
    skipEnforcement = false,
    useExportedPositions = true,
  } = options;

  const result: ImportResult = {
    entitiesAdded: 0,
    entitiesSkipped: 0,
    contentAdded: 0,
    contentSkipped: 0,
    evidenceAdded: 0,
    evidenceSkipped: 0,
    filesAdded: 0,
    filesSkipped: 0,
    relationshipsAdded: 0,
    relationshipsSkipped: 0,
    errors: [],
    warnings: [],
  };

  // Validate bundle first
  const validation = validateRabbitHoleBundle(bundle);
  if (!validation.isValid) {
    result.errors = validation.errors.map((e: any) => e.message);

    // Structured error logging with environment-based redaction
    const isDevelopment = process.env.NODE_ENV === "development";

    vlog.error("Bundle validation failed", {
      errorCount: validation.errors.length,
      errors: validation.errors.map((err: any) => ({
        type: err.type,
        message: err.message,
        field: err.field,
        itemId: err.itemId,
      })),
      bundleStats: {
        entityCount: bundle.entities?.length || 0,
        relationshipCount: bundle.relationships?.length || 0,
        contentCount: bundle.content?.length || 0,
        evidenceCount: bundle.evidence?.length || 0,
        filesCount: bundle.files?.length || 0,
      },
      // Include samples only in development
      ...(isDevelopment && {
        sampleEntities: bundle.entities?.slice(0, 2).map((e: any) => ({
          uid: e.uid,
          type: e.type,
          name: e.name,
        })),
        sampleRelationships: bundle.relationships
          ?.slice(0, 2)
          .map((r: any) => ({
            source: r.source,
            target: r.target,
            type: r.type,
          })),
      }),
    });

    throw new Error(`Bundle validation failed: ${result.errors.join(", ")}`);
  }

  // LOG BUNDLE SIZE (enforcement happens server-side via API)
  const incomingEntities =
    (bundle.entities?.length || 0) +
    (bundle.content?.length || 0) +
    (bundle.evidence?.length || 0) +
    (bundle.files?.length || 0);

  const incomingRelationships = bundle.relationships?.length || 0;

  vlog.log("Bundle import initiated", {
    mode,
    incomingEntities,
    incomingRelationships,
    breakdown: {
      entities: bundle.entities?.length || 0,
      content: bundle.content?.length || 0,
      evidence: bundle.evidence?.length || 0,
      files: bundle.files?.length || 0,
    },
  });

  if (!skipEnforcement && shouldLogWarning("no-tier-enforcement")) {
    vlog.warn("Bundle import called without tier enforcement", {
      message: "Tier enforcement should be done via API route",
      skipEnforcement,
      note: "This warning is rate-limited to once per 60 seconds",
    });
  }

  // REPLACE mode: Clear graph first
  if (mode === "replace") {
    vlog.log("Clearing existing graph", {
      mode: "replace",
      previousNodeCount: graph.order,
      previousEdgeCount: graph.size,
    });
    graph.clear();
  }

  // Import entities in batches
  const entities = bundle.entities || [];
  const content = bundle.content || [];
  const evidence = bundle.evidence || [];
  const files: FileEntity[] = bundle.files || [];
  const totalItems =
    entities.length +
    content.length +
    evidence.length +
    files.length +
    (bundle.relationships?.length || 0);
  let itemsProcessed = 0;

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);

    batch.forEach((entity: Entity) => {
      try {
        // Check if entity exists
        const exists = graph.hasNode(entity.uid);

        // MERGE mode: Skip existing entities
        if (exists && mode === "merge") {
          result.entitiesSkipped++;
          result.warnings.push(
            `Skipped existing entity: ${entity.name} (${entity.uid})`
          );
          return;
        }

        // OVERWRITE mode: Update existing entities
        // REPLACE mode: No entities exist (graph was cleared)

        // Convert bundle entity to GraphNodeAttributes
        // Prioritize exported positions if available and useExportedPositions is true
        const hasExportedPosition =
          useExportedPositions &&
          (entity as any).canvas_x !== undefined &&
          (entity as any).canvas_y !== undefined;

        upsertNode(graph, entity.uid, {
          uid: entity.uid,
          name: entity.name,
          type: entity.type,
          x: hasExportedPosition
            ? (entity as any).canvas_x
            : applyLayout
              ? Math.random() * 800
              : undefined,
          y: hasExportedPosition
            ? (entity as any).canvas_y
            : applyLayout
              ? Math.random() * 600
              : undefined,
          color: getEntityColor(entity.type),
          icon: getEntityImage(entity.type),
          size: 10,
          properties: entity.properties || {},
          tags: entity.tags || [],
          aliases: entity.aliases || [],
        });

        result.entitiesAdded++;
      } catch (error) {
        result.errors.push(`Failed to import entity ${entity.uid}: ${error}`);
      }
    });

    itemsProcessed += batch.length;
    onProgress?.(itemsProcessed, totalItems);

    // Allow UI to update between batches
    if (i + batchSize < entities.length) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  // Import content items as nodes in batches
  for (let i = 0; i < content.length; i += batchSize) {
    const batch = content.slice(i, i + batchSize);

    batch.forEach((contentItem) => {
      try {
        // Check if content node exists
        const exists = graph.hasNode(contentItem.uid);

        // MERGE mode: Skip existing content
        if (exists && mode === "merge") {
          result.contentSkipped++;
          result.warnings.push(`Skipped existing content: ${contentItem.uid}`);
          return;
        }

        // OVERWRITE mode: Update existing content
        // REPLACE mode: No content exists (graph was cleared)

        // Convert content to GraphNodeAttributes
        // Use text_excerpt as name, fallback to uid
        const name =
          contentItem.text_excerpt?.substring(0, 50) ||
          contentItem.uid.split(":")[1] ||
          "Content";

        const hasContentPosition =
          useExportedPositions &&
          (contentItem as any).canvas_x !== undefined &&
          (contentItem as any).canvas_y !== undefined;

        upsertNode(graph, contentItem.uid, {
          uid: contentItem.uid,
          name: name,
          type: "Content",
          x: hasContentPosition
            ? (contentItem as any).canvas_x
            : applyLayout
              ? Math.random() * 800
              : undefined,
          y: hasContentPosition
            ? (contentItem as any).canvas_y
            : applyLayout
              ? Math.random() * 600
              : undefined,
          color: getEntityColor("Content"),
          icon: getEntityImage("Content"),
          size: 8, // Slightly smaller than regular entities
          properties: {
            content_type: contentItem.content_type,
            platform_uid: contentItem.platform_uid,
            author_uid: contentItem.author_uid,
            published_at: contentItem.published_at,
            url: contentItem.url,
            text_excerpt: contentItem.text_excerpt,
          },
          tags: ["content"],
          aliases: [],
        });

        result.contentAdded++;
      } catch (error) {
        result.errors.push(
          `Failed to import content ${contentItem.uid}: ${error}`
        );
      }
    });

    itemsProcessed += batch.length;
    onProgress?.(itemsProcessed, totalItems);

    // Allow UI to update between batches
    if (i + batchSize < content.length) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  // Import evidence items as nodes in batches
  for (let i = 0; i < evidence.length; i += batchSize) {
    const batch = evidence.slice(i, i + batchSize);

    batch.forEach((evidenceItem) => {
      try {
        // Check if evidence node exists
        const exists = graph.hasNode(evidenceItem.uid);

        // MERGE mode: Skip existing evidence
        if (exists && mode === "merge") {
          result.evidenceSkipped++;
          result.warnings.push(
            `Skipped existing evidence: ${evidenceItem.uid}`
          );
          return;
        }

        // Convert evidence to GraphNodeAttributes
        const name =
          evidenceItem.title || evidenceItem.uid.split(":")[1] || "Evidence";

        const hasEvidencePosition =
          useExportedPositions &&
          (evidenceItem as any).canvas_x !== undefined &&
          (evidenceItem as any).canvas_y !== undefined;

        upsertNode(graph, evidenceItem.uid, {
          uid: evidenceItem.uid,
          name: name,
          type: "Evidence",
          x: hasEvidencePosition
            ? (evidenceItem as any).canvas_x
            : applyLayout
              ? Math.random() * 800
              : undefined,
          y: hasEvidencePosition
            ? (evidenceItem as any).canvas_y
            : applyLayout
              ? Math.random() * 600
              : undefined,
          color: getEntityColor("Evidence"),
          icon: getEntityImage("Evidence"),
          size: 7, // Smaller than content
          properties: {
            kind: evidenceItem.kind,
            title: evidenceItem.title,
            publisher: evidenceItem.publisher,
            date: evidenceItem.date,
            url: evidenceItem.url,
            reliability: evidenceItem.reliability,
            notes: evidenceItem.notes,
            archive: evidenceItem.archive,
            retrieved_at: evidenceItem.retrieved_at,
          },
          tags: ["evidence", evidenceItem.kind],
          aliases: [],
        });

        result.evidenceAdded++;
      } catch (error) {
        result.errors.push(
          `Failed to import evidence ${evidenceItem.uid}: ${error}`
        );
      }
    });

    itemsProcessed += batch.length;
    onProgress?.(itemsProcessed, totalItems);

    // Allow UI to update between batches
    if (i + batchSize < evidence.length) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  // Import file items as nodes in batches
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    batch.forEach((fileItem) => {
      try {
        // Check if file node exists
        const exists = graph.hasNode(fileItem.uid);

        // MERGE mode: Skip existing files
        if (exists && mode === "merge") {
          result.filesSkipped++;
          result.warnings.push(`Skipped existing file: ${fileItem.uid}`);
          return;
        }

        // Convert file to GraphNodeAttributes
        const name =
          fileItem.aliases?.[0] ||
          fileItem.key?.split("/").pop() ||
          fileItem.uid.split(":")[1] ||
          "File";

        const hasFilePosition =
          useExportedPositions &&
          (fileItem as any).canvas_x !== undefined &&
          (fileItem as any).canvas_y !== undefined;

        upsertNode(graph, fileItem.uid, {
          uid: fileItem.uid,
          name: name,
          type: "File",
          x: hasFilePosition
            ? (fileItem as any).canvas_x
            : applyLayout
              ? Math.random() * 800
              : undefined,
          y: hasFilePosition
            ? (fileItem as any).canvas_y
            : applyLayout
              ? Math.random() * 600
              : undefined,
          color: getEntityColor("File"),
          icon: getEntityImage("File"),
          size: 7, // Smaller than content
          properties: {
            content_hash: fileItem.content_hash,
            mime: fileItem.mime,
            bytes: fileItem.bytes,
            bucket: fileItem.bucket,
            key: fileItem.key,
          },
          tags: ["file"],
          aliases: fileItem.aliases || [],
        });

        result.filesAdded++;
      } catch (error) {
        result.errors.push(`Failed to import file ${fileItem.uid}: ${error}`);
      }
    });

    itemsProcessed += batch.length;
    onProgress?.(itemsProcessed, totalItems);

    // Allow UI to update between batches
    if (i + batchSize < files.length) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  // Log position preservation statistics
  const allItems = [
    ...(entities || []),
    ...(content || []),
    ...(evidence || []),
    ...(files || []),
  ];
  const positionedItems = allItems.filter(
    (item: any) => item.canvas_x !== undefined && item.canvas_y !== undefined
  );

  if (positionedItems.length > 0) {
    vlog.log("Bundle contains positioned entities", {
      total: allItems.length,
      positioned: positionedItems.length,
      percentage: Math.round((positionedItems.length / allItems.length) * 100),
      useExportedPositions,
    });
  }

  // Import relationships in batches
  const relationships = bundle.relationships || [];

  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize);

    batch.forEach((rel: Relationship) => {
      try {
        // Check if both source and target exist
        if (!graph.hasNode(rel.source)) {
          result.errors.push(
            `Relationship ${rel.uid} references missing source: ${rel.source}`
          );
          return;
        }

        if (!graph.hasNode(rel.target)) {
          result.errors.push(
            `Relationship ${rel.uid} references missing target: ${rel.target}`
          );
          return;
        }

        // Check if relationship exists
        const exists = graph.hasEdge(rel.source, rel.target);

        // MERGE mode: Skip existing relationships
        if (exists && mode === "merge") {
          result.relationshipsSkipped++;
          result.warnings.push(`Skipped existing relationship: ${rel.uid}`);
          return;
        }

        // OVERWRITE mode: Update existing relationships
        // REPLACE mode: No relationships exist (graph was cleared)

        // Convert bundle relationship to GraphEdgeAttributes
        upsertEdge(graph, rel.uid, rel.source, rel.target, {
          uid: rel.uid,
          type: rel.type,
          source: rel.source,
          target: rel.target,
          sentiment: rel.properties?.sentiment,
          confidence: rel.properties?.confidence || (rel as any).confidence,
          properties: rel.properties || {},
        });

        result.relationshipsAdded++;
      } catch (error) {
        result.errors.push(
          `Failed to import relationship ${rel.uid}: ${error}`
        );
      }
    });

    itemsProcessed += batch.length;
    onProgress?.(itemsProcessed, totalItems);

    // Allow UI to update between batches
    if (i + batchSize < relationships.length) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  return result;
}

/**
 * Parse and validate uploaded file
 */
export async function parseImportFile(
  file: File
): Promise<{ data: RabbitHoleBundleData; validation: any }> {
  const text = await file.text();
  const data = JSON.parse(text);
  const validation = validateRabbitHoleBundle(data);
  return { data, validation };
}
