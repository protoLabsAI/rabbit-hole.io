"use client";

import { useMemo, useDeferredValue } from "react";

/**
 * Entity with loading state for incremental graph updates
 */
export interface IncrementalEntity {
  uid: string;
  name?: string;
  type?: string;
  properties?: Record<string, any>;
  tags?: string[];
  /** Loading state: 'discovered' = just found, 'enriched' = has properties, 'complete' = fully processed */
  loadingState: "discovered" | "enriched" | "complete";
  /** Source file that last updated this entity */
  source?: string;
}

export interface IncrementalRelationship {
  uid: string;
  source: string;
  target: string;
  type?: string;
  properties?: Record<string, any>;
  loadingState: "discovered" | "complete";
}

interface UseIncrementalGraphOptions {
  files: Record<string, string>;
  primaryEntityName?: string;
  primaryEntityType?: string;
}

interface UseIncrementalGraphResult {
  entities: IncrementalEntity[];
  relationships: IncrementalRelationship[];
  evidenceCount: number;
  isLoading: boolean;
  /** True when deferred value differs from current (parsing in progress) */
  isParsing: boolean;
}

/**
 * Agent file paths (must match constants in deep-agent-entity-researcher)
 */
const RESEARCH_FILE_PATHS = {
  EVIDENCE: "/research/evidence.json",
  ENTITY: "/research/entity.json",
  FIELD_ANALYSIS: "/research/field-analysis.json",
  RELATED_ENTITIES: "/research/related-entities.json",
  RELATIONSHIPS: "/research/relationships.json",
  BUNDLE: "/research/bundle.json",
} as const;

/**
 * Generate canonical entity UID matching the agent's format
 * Format: {type}_{normalized_name} e.g. person_albert_einstein
 */
function generateEntityUid(name: string, type: string): string {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "_");
  const normalizedType = type.toLowerCase().replace(/\s+/g, "_");
  return `${normalizedType}_${normalizedName}`;
}

/**
 * Parse files to extract graph data
 * Pure function - no side effects, can be safely memoized
 */
function parseFilesToGraph(
  files: Record<string, string>,
  primaryEntityName?: string,
  primaryEntityType?: string
) {
  const entityMap = new Map<string, IncrementalEntity>();
  const relationshipMap = new Map<string, IncrementalRelationship>();
  let evidence = 0;

  // Parse evidence file (from evidence-gatherer subagent)
  // Shows primary entity as "gathering evidence" state
  const evidenceFile = files[RESEARCH_FILE_PATHS.EVIDENCE];
  if (evidenceFile) {
    try {
      const evidenceData = JSON.parse(evidenceFile);
      if (Array.isArray(evidenceData.evidence)) {
        evidence = evidenceData.evidence.length;
      } else if (evidenceData.evidence) {
        evidence = 1;
      }

      // Create primary entity with correct UID format: {type}_{normalized_name}
      if (primaryEntityName && primaryEntityType) {
        const primaryUid = generateEntityUid(
          primaryEntityName,
          primaryEntityType
        );
        entityMap.set(primaryUid, {
          uid: primaryUid,
          name: primaryEntityName,
          type: primaryEntityType,
          loadingState: "discovered", // Gathering evidence, not enriched yet
          source: RESEARCH_FILE_PATHS.EVIDENCE,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Parse entity file (from entity-extractor subagent)
  const entityFile = files[RESEARCH_FILE_PATHS.ENTITY];
  if (entityFile) {
    try {
      const entityData = JSON.parse(entityFile);
      if (entityData.uid) {
        // Remove any placeholder that might have a different UID but same name/type
        if (primaryEntityName && primaryEntityType) {
          const placeholderUid = generateEntityUid(
            primaryEntityName,
            primaryEntityType
          );
          if (
            placeholderUid !== entityData.uid &&
            entityMap.has(placeholderUid)
          ) {
            entityMap.delete(placeholderUid);
          }
        }

        const existing = entityMap.get(entityData.uid);
        entityMap.set(entityData.uid, {
          uid: entityData.uid,
          name: entityData.name || existing?.name,
          type: entityData.type || existing?.type,
          properties: entityData.properties || existing?.properties,
          tags: entityData.tags || existing?.tags,
          loadingState: "enriched",
          source: RESEARCH_FILE_PATHS.ENTITY,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Parse related entities file (from entity-creator subagent)
  const relatedEntitiesFile = files[RESEARCH_FILE_PATHS.RELATED_ENTITIES];
  if (relatedEntitiesFile) {
    try {
      const relatedData = JSON.parse(relatedEntitiesFile);
      const entityList = relatedData.entities || relatedData;
      if (Array.isArray(entityList)) {
        for (const entity of entityList) {
          const uid =
            entity.uid ||
            generateEntityUid(entity.name || "", entity.type || "unknown");
          if (uid) {
            const existing = entityMap.get(uid);
            entityMap.set(uid, {
              uid,
              name: entity.name || existing?.name,
              type: entity.type || existing?.type,
              properties: entity.properties || existing?.properties,
              tags: entity.tags || existing?.tags,
              loadingState: entity.properties ? "enriched" : "discovered",
              source: RESEARCH_FILE_PATHS.RELATED_ENTITIES,
            });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Parse relationships file (from relationship-mapper subagent)
  const relationshipsFile = files[RESEARCH_FILE_PATHS.RELATIONSHIPS];
  if (relationshipsFile) {
    try {
      const relationshipsData = JSON.parse(relationshipsFile);
      const relList = relationshipsData.relationships || relationshipsData;
      if (Array.isArray(relList)) {
        for (const rel of relList) {
          const uid = rel.uid || `${rel.source}-${rel.type}-${rel.target}`;
          relationshipMap.set(uid, {
            uid,
            source: rel.source,
            target: rel.target,
            type: rel.type,
            properties: rel.properties,
            loadingState: "discovered",
          });

          // Ensure source and target entities exist (add as placeholders)
          if (!entityMap.has(rel.source)) {
            entityMap.set(rel.source, {
              uid: rel.source,
              name: rel.source.split(":").pop()?.replace(/_/g, " "),
              type: rel.source.split(":")[0] || "Unknown",
              loadingState: "discovered",
              source: RESEARCH_FILE_PATHS.RELATIONSHIPS,
            });
          }
          if (!entityMap.has(rel.target)) {
            entityMap.set(rel.target, {
              uid: rel.target,
              name: rel.target.split(":").pop()?.replace(/_/g, " "),
              type: rel.target.split(":")[0] || "Unknown",
              loadingState: "discovered",
              source: RESEARCH_FILE_PATHS.RELATIONSHIPS,
            });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Parse final bundle (marks everything complete)
  // When bundle exists, it's the source of truth - clear all intermediate data
  const bundleFile = files[RESEARCH_FILE_PATHS.BUNDLE];
  if (bundleFile) {
    try {
      const bundleData = JSON.parse(bundleFile);
      const bundle = bundleData.bundle || bundleData;

      // Bundle is authoritative - clear stale placeholders and intermediate entities
      if (Array.isArray(bundle.entities) && bundle.entities.length > 0) {
        entityMap.clear();
        for (const entity of bundle.entities) {
          if (entity.uid) {
            entityMap.set(entity.uid, {
              uid: entity.uid,
              name: entity.name,
              type: entity.type,
              properties: entity.properties,
              tags: entity.tags,
              loadingState: "complete",
              source: RESEARCH_FILE_PATHS.BUNDLE,
            });
          }
        }
      }

      if (
        Array.isArray(bundle.relationships) &&
        bundle.relationships.length > 0
      ) {
        relationshipMap.clear();
        for (const rel of bundle.relationships) {
          const uid = rel.uid || `${rel.source}-${rel.type}-${rel.target}`;
          relationshipMap.set(uid, {
            uid,
            source: rel.source,
            target: rel.target,
            type: rel.type,
            properties: rel.properties,
            loadingState: "complete",
          });
        }
      }

      if (Array.isArray(bundle.evidence)) {
        evidence = bundle.evidence.length;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships: Array.from(relationshipMap.values()),
    evidenceCount: evidence,
  };
}

/**
 * Hook to extract entities and relationships incrementally from agent files
 *
 * React 19 Optimizations:
 * - useDeferredValue: Defers expensive file parsing to avoid blocking UI
 * - Pure parsing function: Extracted for potential React Compiler optimization
 *
 * Parses files as they become available from subagents:
 * 1. evidence-gatherer → /research/evidence.json
 * 2. entity-extractor → /research/entity.json
 * 3. field-analyzer → /research/field-analysis.json
 * 4. entity-creator → /research/related-entities.json
 * 5. relationship-mapper → /research/relationships.json
 * 6. bundle-assembler → /research/bundle.json
 */
export function useIncrementalGraph({
  files,
  primaryEntityName,
  primaryEntityType,
}: UseIncrementalGraphOptions): UseIncrementalGraphResult {
  // React 19: Defer file parsing to avoid blocking user interactions
  // When files change rapidly, this allows React to skip intermediate states
  const deferredFiles = useDeferredValue(files);
  const isParsing = files !== deferredFiles;

  // Parse deferred files - React Compiler can optimize this pure computation
  const { entities, relationships, evidenceCount } = useMemo(
    () =>
      parseFilesToGraph(deferredFiles, primaryEntityName, primaryEntityType),
    [deferredFiles, primaryEntityName, primaryEntityType]
  );

  const isLoading = entities.some((e) => e.loadingState !== "complete");

  return {
    entities,
    relationships,
    evidenceCount,
    isLoading,
    isParsing,
  };
}
