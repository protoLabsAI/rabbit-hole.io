/**
 * Evidence Creator - Unified Evidence Node Generation
 *
 * Creates Evidence nodes for all research sources (Wikipedia, files, etc.)
 * following the Rabbit Hole Bundle format requirements.
 */

import type { Evidence, EvidenceKind } from "@protolabsai/types";

interface WikipediaEvidenceParams {
  entityName: string;
  sourceUrl: string;
  contentLength: number;
  retrievedAt: string;
}

interface FileEvidenceParams {
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Create Evidence node from Wikipedia source
 */
export function createEvidenceFromWikipedia(
  params: WikipediaEvidenceParams
): Evidence {
  const dateStamp = new Date().toISOString().split("T")[0];
  const sanitized = params.entityName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  return {
    uid: `evidence:wikipedia_${sanitized}_${dateStamp}`,
    kind: "major_media" as EvidenceKind,
    title: `${params.entityName} - Wikipedia Article`,
    publisher: "Wikipedia",
    date: dateStamp,
    url: params.sourceUrl,
    reliability: 0.85,
    notes: `Auto-retrieved (${params.contentLength} chars)`,
    retrieved_at: params.retrievedAt,
  };
}

/**
 * Create Evidence node from uploaded file
 */
export function createEvidenceFromFile(params: FileEvidenceParams): Evidence {
  const dateStamp = new Date().toISOString().split("T")[0];
  const sanitized = params.name.replace(/[^a-z0-9]/g, "_").toLowerCase();

  return {
    uid: `evidence:file_${sanitized}_${dateStamp}`,
    kind: "research" as EvidenceKind,
    title: params.name,
    publisher: "User Upload",
    date: dateStamp,
    url: `file://uploads/${params.name}`,
    reliability: 0.75,
    notes: `Uploaded file (${params.size} bytes, ${params.mimeType})`,
    retrieved_at: params.uploadedAt,
  };
}

/**
 * Create Evidence node from generic source
 */
export function createEvidenceFromSource(params: {
  identifier: string;
  sourceType: string;
  kind: EvidenceKind;
  title: string;
  publisher: string;
  url: string;
  reliability: number;
  contentLength?: number;
  metadata?: Record<string, any>;
}): Evidence {
  const dateStamp = new Date().toISOString().split("T")[0];
  const sanitized = params.identifier.toLowerCase().replace(/[^a-z0-9]/g, "_");

  return {
    uid: `evidence:${params.sourceType}_${sanitized}_${dateStamp}`,
    kind: params.kind,
    title: params.title,
    publisher: params.publisher,
    date: dateStamp,
    url: params.url,
    reliability: params.reliability,
    notes: params.contentLength
      ? `${params.contentLength} characters`
      : undefined,
    retrieved_at: new Date().toISOString(),
  };
}

/**
 * Link evidence UIDs to entity properties
 */
export function linkEvidenceToEntity(entity: any, evidenceUids: string[]): any {
  return {
    ...entity,
    properties: {
      ...entity.properties,
      _evidence_uids: evidenceUids,
      _enrichedAt: new Date().toISOString(),
    },
  };
}

/**
 * Link evidence UIDs to relationship properties
 */
export function linkEvidenceToRelationship(
  relationship: any,
  evidenceUids: string[]
): any {
  return {
    ...relationship,
    properties: {
      ...relationship.properties,
      evidence_uids: evidenceUids,
    },
  };
}

/**
 * Merge similar entities based on name/type similarity
 */
export function mergeSimilarEntities(entities: any[]): any[] {
  const merged = new Map<string, any>();

  for (const entity of entities) {
    const normalizedName = entity.name.toLowerCase().trim();
    const key = `${entity.type}:${normalizedName}`;

    if (!merged.has(key)) {
      merged.set(key, entity);
    } else {
      // Merge properties from duplicate
      const existing = merged.get(key);

      // Collect and deduplicate evidence UIDs
      const existingUids = existing.properties?._evidence_uids || [];
      const entityUids = entity.properties?._evidence_uids || [];

      // Normalize to strings and remove duplicates
      const combinedUids = [...existingUids, ...entityUids].map((uid) =>
        String(uid)
      );
      const deduplicatedUids = [...new Set(combinedUids)];

      merged.set(key, {
        ...existing,
        properties: {
          ...existing.properties,
          ...entity.properties,
          _evidence_uids: deduplicatedUids,
        },
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * Calculate bundle metrics
 */
export function calculateBundleMetrics(
  bundle: any,
  processingTime: number
): {
  confidence: number;
  completeness: number;
  processingTime: number;
  evidenceCoverage: number;
} {
  const entitiesWithEvidence = bundle.entities.filter(
    (e: any) =>
      e.properties?._evidence_uids && e.properties._evidence_uids.length > 0
  ).length;

  const evidenceCoverage =
    bundle.entities.length > 0
      ? entitiesWithEvidence / bundle.entities.length
      : 0;

  // Average reliability from evidence
  const avgReliability =
    bundle.evidence.length > 0
      ? bundle.evidence.reduce(
          (sum: number, e: any) => sum + (e.reliability || 0),
          0
        ) / bundle.evidence.length
      : 0;

  return {
    confidence: avgReliability,
    completeness: evidenceCoverage,
    processingTime,
    evidenceCoverage,
  };
}
