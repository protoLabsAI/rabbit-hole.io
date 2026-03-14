/**
 * Unified Research Graph API Endpoint
 *
 * Single endpoint for all research sources (Wikipedia, files, future sources)
 * with evidence-first design and multi-source aggregation.
 */

import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import {
  discoverNode,
  structureNode,
  entityResearchTool,
  summarizeTool,
} from "@proto/llm-tools";
import type {
  Evidence,
  Entity,
  Relationship,
  RabbitHoleBundleData,
  EntityResearchInput,
} from "@proto/types";
import { getRelationshipTypesForDomains } from "@proto/types";
import { areSimilarStrings } from "@proto/utils";

import {
  createSourceBatches,
  processBatchesWithRetry,
  estimateTokens,
  DEFAULT_BATCH_CONFIG,
  type SourceBatch,
} from "./batch-processor";
import {
  createEvidenceFromWikipedia,
  createEvidenceFromFile,
  linkEvidenceToEntity,
  mergeSimilarEntities,
  calculateBundleMetrics,
} from "./evidence-creator";
import { fetchSources, parseEntityNames } from "./source-fetcher";

export const maxDuration = 300;

interface ResearchGraphResponse {
  success: boolean;
  bundle: RabbitHoleBundleData;
  stats: {
    evidenceCreated: number;
    entitiesExtracted: number;
    relationshipsDiscovered: number;
    filesProcessed: number;
    sourcesUsed: string[];
  };
  metrics: {
    confidence: number;
    completeness: number;
    processingTime: number;
    evidenceCoverage: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Deduplicate entities using semantic similarity and substring matching
 * Merges variations like "Bernie", "Sanders", "Bernie Sanders" into one entity with aliases
 */
function deduplicateEntitiesBySimilarity(entities: any[]): any[] {
  const deduplicated: any[] = [];
  const merged = new Set<number>(); // Track indices already merged

  for (let i = 0; i < entities.length; i++) {
    if (merged.has(i)) continue;

    const entity = entities[i];
    const duplicates: any[] = [entity];
    const aliasSet = new Set<string>([entity.name]);

    // Find all similar entities of same type
    for (let j = i + 1; j < entities.length; j++) {
      if (merged.has(j)) continue;

      const candidate = entities[j];

      // Must be same type
      if (entity.type !== candidate.type) continue;

      const entityLower = entity.name.toLowerCase().trim();
      const candidateLower = candidate.name.toLowerCase().trim();

      // Check if names are similar - be conservative to avoid false merges
      let isSimilar = false;

      // Strategy 1: High similarity score (0.90+ for strict matching)
      if (areSimilarStrings(entity.name, candidate.name, 0.9)) {
        isSimilar = true;
      }
      // Strategy 2: Exact substring match (shorter is complete subset of longer)
      // But ONLY if the shorter name is <= 2 words (avoid "Bernie Sanders" merging with "Elias Sanders")
      else {
        const entityWords = entityLower.split(/\s+/);
        const candidateWords = candidateLower.split(/\s+/);

        // If one name is single word and appears in the other (e.g., "Bernie" in "Bernie Sanders")
        if (entityWords.length === 1 && candidateWords.length >= 1) {
          isSimilar = candidateWords.includes(entityWords[0]);
        } else if (candidateWords.length === 1 && entityWords.length >= 1) {
          isSimilar = entityWords.includes(candidateWords[0]);
        }
        // If both are 2+ words, only merge if one is proper subset
        // e.g., "Bernie Sanders" contains "Bernie Sanders" but NOT "Elias Sanders"
        else if (entityWords.length <= 2 && candidateWords.length <= 2) {
          isSimilar = entityLower === candidateLower;
        }
      }

      if (isSimilar) {
        duplicates.push(candidate);
        aliasSet.add(candidate.name);
        merged.add(j);
      }
    }

    // Use the longest/most complete name as canonical
    const canonical = duplicates.reduce((best, curr) =>
      curr.name.length > best.name.length ? curr : best
    );

    // Add all variant names as aliases (exclude canonical)
    aliasSet.delete(canonical.name);

    deduplicated.push({
      ...canonical,
      aliases: Array.from(aliasSet),
    });
  }

  return deduplicated;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Authentication
  const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  // 2. Tier enforcement
  const userTier = getUserTier(user);
  const tierLimits = getTierLimits(userTier);

  if (!tierLimits.hasAIChatAccess) {
    return NextResponse.json(
      {
        error: "Upgrade Required",
        message: "Research requires Basic tier or higher",
        currentTier: userTier,
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  try {
    // 3. Parse request
    const formData = await request.formData();

    const entityNamesRaw = formData.get("entityNames") as string | null;
    const sourcesRaw = formData.get("sources") as string | null;
    const domainsRaw = formData.get("domains") as string | null;
    const entityTypesRaw = formData.get("entityTypes") as string | null;
    const maxEntitiesRaw = formData.get("maxEntities") as string | null;

    const entityNames = entityNamesRaw ? parseEntityNames(entityNamesRaw) : [];
    const sources = sourcesRaw ? JSON.parse(sourcesRaw) : ["wikipedia"];
    const domains = domainsRaw ? JSON.parse(domainsRaw) : [];
    const entityTypes = entityTypesRaw ? JSON.parse(entityTypesRaw) : undefined;
    const maxEntities = maxEntitiesRaw ? parseInt(maxEntitiesRaw) : 50;

    // Extract files from formData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push(value);
      }
    }

    // Validate inputs
    if (entityNames.length === 0 && files.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "At least one entity name or file required",
        },
        { status: 400 }
      );
    }

    console.log(`🔬 Research Graph API`);
    console.log(`   Entities: ${entityNames.join(", ")}`);
    console.log(`   Files: ${files.map((f) => f.name).join(", ")}`);
    console.log(`   Sources: ${sources.join(", ")}`);
    console.log(`   Domains: ${domains.join(", ")}`);
    console.log(`   Max entities: ${maxEntities}`);

    // Phase 1: Fetch sources (parallel)
    const { sourceData, errors: fetchErrors } = await fetchSources({
      entityNames,
      files,
      sources,
    });

    if (sourceData.length === 0) {
      return NextResponse.json(
        {
          error: "No data sources",
          message: "Failed to fetch data from any source",
          errors: fetchErrors,
        },
        { status: 400 }
      );
    }

    // Phase 2: Create evidence nodes with AI-generated summaries
    const evidence: Evidence[] = [];

    for (const source of sourceData) {
      if (source.type === "wikipedia") {
        // Generate concise summary using AI summarize tool
        let summary = source.metadata.summary || "";

        try {
          const summaryResult = await summarizeTool.invoke({
            content: source.content,
            maxLength: 500,
          });
          summary = summaryResult.summary;
          console.log(
            `✅ Generated summary for ${source.identifier}: ${summary.length} chars`
          );
        } catch (error) {
          console.error(
            `Summary generation failed for ${source.identifier}, using fallback:`,
            error
          );
          summary =
            source.metadata.summary ||
            `Wikipedia article (${source.metadata.length} chars)`;
        }

        evidence.push({
          ...createEvidenceFromWikipedia({
            entityName: source.identifier,
            sourceUrl: source.metadata.url,
            contentLength: source.metadata.length,
            retrievedAt: source.metadata.retrievedAt,
          }),
          notes: summary,
        });
      } else {
        evidence.push(
          createEvidenceFromFile({
            name: source.identifier,
            size: source.metadata.size,
            mimeType: source.metadata.mimeType,
            uploadedAt: source.metadata.retrievedAt,
          })
        );
      }
    }

    // Phase 3: Multi-Phase Extraction (like interactive extraction)
    console.log("🔬 Starting multi-phase extraction...");

    let entities: Entity[] = [];
    const relationships: Relationship[] = [];
    const focusEntityUids: string[] = [];

    // PHASE 3A: DISCOVER - Extract all entity names from ALL sources first
    console.log("📋 Phase 1: Discovering entities from all sources...");

    const allDiscoveredEntities = new Map<string, any>(); // uid -> entity
    const sourceEntityMap = new Map<string, Set<string>>(); // sourceId -> Set<uid>

    for (const source of sourceData) {
      console.log(`   Discovering from ${source.identifier}...`);

      const discoverResult = await discoverNode({
        inputText: source.content,
        mode: "deep_dive",
        domains:
          domains.length > 0 ? domains : ["social", "academic", "geographic"],
        confidenceThresholds: {
          discover: 0.7,
          structure: 0.8,
          enrich: 0.6,
          relate: 0.75,
        },
      } as any);

      // Convert discovered entities to array
      const discoveredMap =
        discoverResult.discoveredEntities instanceof Map
          ? discoverResult.discoveredEntities
          : new Map(Object.entries(discoverResult.discoveredEntities || {}));

      const sourceUids = new Set<string>();

      for (const [type, names] of discoveredMap.entries()) {
        const nameList = Array.isArray(names) ? names : [];
        for (const name of nameList) {
          const uid = `${type}:${name.toLowerCase().replace(/\s+/g, "_")}`;

          // Deduplicate: only add if not already discovered
          if (!allDiscoveredEntities.has(uid)) {
            allDiscoveredEntities.set(uid, {
              uid,
              type: type.charAt(0).toUpperCase() + type.slice(1),
              name,
              _phase: "discovered",
              _confidence: 0.85,
            });
          }

          sourceUids.add(uid);

          // Track if this is a focus entity
          if (name.toLowerCase() === source.identifier.toLowerCase()) {
            focusEntityUids.push(uid);
          }
        }
      }

      sourceEntityMap.set(source.identifier, sourceUids);
      console.log(
        `   Found ${sourceUids.size} entities (${allDiscoveredEntities.size} unique total)`
      );
    }

    const totalDiscovered = allDiscoveredEntities.size;
    console.log(
      `✅ Discovered ${totalDiscovered} unique entities across all sources`
    );

    // Deduplicate using semantic similarity BEFORE structure phase
    console.log(`🔄 Deduplicating similar entities...`);
    const deduplicatedEntities = deduplicateEntitiesBySimilarity(
      Array.from(allDiscoveredEntities.values())
    );

    const dedupedCount = totalDiscovered - deduplicatedEntities.length;
    if (dedupedCount > 0) {
      console.log(
        `✅ Merged ${dedupedCount} duplicate entities (${deduplicatedEntities.length} unique)`
      );
    }

    // Limit entities to maxEntities before structure phase
    const entitiesToStructure = deduplicatedEntities.slice(0, maxEntities);

    if (deduplicatedEntities.length > maxEntities) {
      console.log(
        `⚠️  Limiting to ${maxEntities} entities (found ${deduplicatedEntities.length})`
      );
    }

    // PHASE 3B: STRUCTURE - Get required fields for deduplicated entities
    console.log(
      `📋 Phase 2: Extracting fields for ${entitiesToStructure.length} deduplicated entities...`
    );

    // Rebuild discovered map for structure phase (by type)
    // Only canonical names, not duplicates
    const deduplicatedDiscoveredMap = new Map<string, string[]>();
    const canonicalNames = new Set<string>();

    for (const entity of entitiesToStructure) {
      const type = entity.type.toLowerCase();

      // Skip if we already have this name (shouldn't happen after dedup, but safety check)
      if (canonicalNames.has(entity.name)) {
        console.log(`⚠️ Duplicate found in deduplicated list: ${entity.name}`);
        continue;
      }

      canonicalNames.add(entity.name);

      if (!deduplicatedDiscoveredMap.has(type)) {
        deduplicatedDiscoveredMap.set(type, []);
      }
      deduplicatedDiscoveredMap.get(type)!.push(entity.name);
    }

    console.log(
      `📊 Structure phase will process: ${canonicalNames.size} unique names`
    );
    console.log(
      `   Sample: ${Array.from(canonicalNames).slice(0, 5).join(", ")}`
    );

    // Update focusEntityUids - map old uids to canonical deduplicated uids
    const processedUids = new Set(entitiesToStructure.map((e) => e.uid));
    const limitedFocusUids: string[] = [];

    // For each original focus uid, find if it was deduplicated to a canonical entity
    for (const oldUid of focusEntityUids) {
      if (processedUids.has(oldUid)) {
        limitedFocusUids.push(oldUid);
      } else {
        // Find the canonical entity this was merged into
        const oldEntity = Array.from(allDiscoveredEntities.values()).find(
          (e) => e.uid === oldUid
        );
        if (oldEntity) {
          const canonical = entitiesToStructure.find(
            (e) =>
              e.type === oldEntity.type &&
              areSimilarStrings(e.name, oldEntity.name, 0.85)
          );
          if (canonical && !limitedFocusUids.includes(canonical.uid)) {
            limitedFocusUids.push(canonical.uid);
          }
        }
      }
    }

    // Use first source's content for structure (or could concatenate)
    const primarySource = sourceData[0];

    const structureResult = await structureNode({
      inputText: primarySource.content,
      mode: "deep_dive",
      domains:
        domains.length > 0 ? domains : ["social", "academic", "geographic"],
      discoveredEntities: deduplicatedDiscoveredMap,
      confidenceThresholds: {
        discover: 0.7,
        structure: 0.8,
        enrich: 0.6,
        relate: 0.75,
      },
    } as any);

    // Convert structured entities and merge with aliases from deduplication
    const structuredEntities: Entity[] = [];
    if (structureResult.structuredEntities) {
      for (const [
        uid,
        entity,
      ] of structureResult.structuredEntities.entries()) {
        const { uid: _, ...entityWithoutUid } = entity as any;

        // Find the deduplicated entity to get aliases
        const deduped = entitiesToStructure.find(
          (e) => e.uid === uid || e.name === (entity as any).name
        );

        const structuredEntity = {
          uid,
          ...entityWithoutUid,
          aliases: deduped?.aliases || (entity as any).aliases || [],
          _phase: "structured",
        } as Entity;

        structuredEntities.push(structuredEntity);
      }
    }

    console.log(
      `✅ Structured ${structuredEntities.length} entities (with aliases)`
    );

    // PHASE 3C: RELATE - Find relationships with focus entities using batch processing
    console.log(`📋 Phase 3: Finding relationships...`);

    const focusEntities = structuredEntities.filter((e) =>
      limitedFocusUids.includes(e.uid)
    );
    const otherEntities = structuredEntities.filter(
      (e) => !limitedFocusUids.includes(e.uid)
    );

    console.log(`   Focus entities: ${focusEntities.length}`);
    console.log(`   Other entities: ${otherEntities.length}`);

    // Create source batches to avoid oversized LangExtract payloads
    const sourceBatches = createSourceBatches(sourceData, DEFAULT_BATCH_CONFIG);
    console.log(
      `   Split sources into ${sourceBatches.length} batch(es) ` +
        `(max ${DEFAULT_BATCH_CONFIG.maxCharsPerBatch} chars/batch)`
    );

    // Log batch details
    for (const batch of sourceBatches) {
      const tokens = estimateTokens(batch.content);
      console.log(
        `   Batch ${batch.batchIndex + 1}: ${batch.sourceCount} source(s), ` +
          `${batch.charCount} chars (~${tokens} tokens)`
      );
    }

    if (focusEntities.length > 0 && otherEntities.length > 0) {
      const validRelationshipTypes = getRelationshipTypesForDomains(
        domains.length > 0 ? domains : ["social", "academic", "geographic"]
      );

      // Import relation utilities
      const { buildFocusedRelationshipPrompt } = await import(
        "../../extraction/phases/utils"
      );

      const langextractUrl =
        process.env.LANGEXTRACT_URL || "http://localhost:8002";

      // Define batch processor function
      const processBatch = async (
        batch: SourceBatch
      ): Promise<Relationship[]> => {
        const batchResults: Relationship[] = [];

        // Process each focus entity against this batch
        for (const focusEntity of focusEntities) {
          // Process entities in smaller batches for better results
          const BATCH_SIZE = 10;
          for (let i = 0; i < otherEntities.length; i += BATCH_SIZE) {
            const entityBatch = otherEntities.slice(i, i + BATCH_SIZE);

            const prompt = buildFocusedRelationshipPrompt(
              focusEntity,
              entityBatch,
              validRelationshipTypes
            );

            console.log(
              `   Processing relationships for: ${focusEntity.name} ` +
                `(entity batch ${Math.floor(i / BATCH_SIZE) + 1}, source batch ${batch.batchIndex + 1})`
            );

            const response = await fetch(`${langextractUrl}/api/extract`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text_or_documents: [batch.content], // Use batch content, not all content
                prompt_description: prompt,
                model_id: "gpt-4o-mini",
                format: "json",
              }),
            });

            if (!response.ok) {
              throw new Error(
                `LangExtract request failed: ${response.status} ${response.statusText}`
              );
            }

            const data = await response.json();
            const batchRelationships = data.data?.[0]?.relationships || [];
            console.log(
              `   Found ${batchRelationships.length} relationships ` +
                `(focus: ${focusEntity.name}, source batch: ${batch.batchIndex + 1})`
            );

            batchResults.push(...batchRelationships);
          }
        }

        return batchResults;
      };

      // Process all batches with retry and backpressure control
      const batchResults = await processBatchesWithRetry(
        sourceBatches,
        processBatch,
        DEFAULT_BATCH_CONFIG
      );

      // Merge results from all batches - flatten the array results
      for (const result of batchResults) {
        if (result.success && Array.isArray(result.data)) {
          relationships.push(...(result.data as Relationship[]));
        } else if (!result.success) {
          console.warn(
            `⚠️  Source batch ${result.batchIndex} failed after retries: ${result.error}`
          );
        }
      }
    }

    console.log(`✅ Found ${relationships.length} total relationships`);

    // PHASE 3D: ENRICH - Enrich primary entities using domain config
    const wikipediaSources = sourceData.filter((s) => s.type === "wikipedia");
    if (wikipediaSources.length > 0 && focusEntities.length > 0) {
      console.log(
        `📋 Phase 4: Enriching ${focusEntities.length} primary entities using domain configs...`
      );

      for (const focusEntity of focusEntities) {
        const wikipediaContent = wikipediaSources
          .map((s) => s.content)
          .join("\n\n");

        const researchInput: EntityResearchInput = {
          targetEntityName: focusEntity.name || focusEntity.uid.split(":")[1],
          entityType: focusEntity.type as any,
          researchDepth: "detailed",
          focusAreas: ["biographical", "business", "relationships"],
          rawData: [
            {
              content: wikipediaContent,
              source: "Wikipedia",
              sourceType: "wikipedia",
            },
          ],
          existingEntities: [],
          existingRelationships: [],
          dataSourceConfig: { userProvided: { enabled: true } },
        };

        try {
          const researchResult = await entityResearchTool.invoke(researchInput);

          if (researchResult.success && researchResult.entities.length > 0) {
            const enrichedEntity = researchResult.entities[0];
            const index = structuredEntities.findIndex(
              (e) => e.uid === focusEntity.uid
            );
            if (index >= 0) {
              // Merge enriched properties with existing properties
              structuredEntities[index] = {
                ...structuredEntities[index],
                properties: {
                  ...structuredEntities[index].properties,
                  ...enrichedEntity.properties,
                },
                aliases:
                  enrichedEntity.aliases || structuredEntities[index].aliases,
                tags: enrichedEntity.tags || structuredEntities[index].tags,
              };
            }
          }
        } catch (error) {
          console.error(`Failed to enrich ${focusEntity.name}:`, error);
          // Continue with other entities
        }
      }
    }

    // Link evidence to all entities (use all evidence UIDs)
    const allEvidenceUids = evidence.map((e) => e.uid);
    const entitiesWithEvidence = structuredEntities.map((e) =>
      linkEvidenceToEntity(e, allEvidenceUids)
    );

    entities.push(...entitiesWithEvidence);

    console.log(
      `🎉 Multi-phase extraction complete: ${entities.length} entities, ${relationships.length} relationships`
    );

    // Phase 4: Merge similar entities
    entities = mergeSimilarEntities(entities);

    // Phase 5: Assemble bundle (relationships already collected above)
    const bundle: RabbitHoleBundleData = {
      evidence,
      entities,
      relationships,
      files: [],
      content: [],
      entityCitations: {},
      relationshipCitations: {},
    };

    const processingTime = Date.now() - startTime;
    const metrics = calculateBundleMetrics(bundle, processingTime);

    const response: ResearchGraphResponse = {
      success: true,
      bundle,
      stats: {
        evidenceCreated: evidence.length,
        entitiesExtracted: entities.length,
        relationshipsDiscovered: relationships.length,
        filesProcessed: files.length,
        sourcesUsed: sources,
      },
      metrics,
      warnings: [],
      errors: fetchErrors,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Research graph error:", error);
    return NextResponse.json(
      {
        error: "Research failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: "/api/research/graph",
    description: "Unified research endpoint for multi-source entity extraction",
    version: "1.0",
    capabilities: [
      "Wikipedia entity research",
      "File entity extraction",
      "Multi-source evidence tracking",
      "Entity deduplication",
      "Relationship discovery",
    ],
    usage: {
      method: "POST (multipart/form-data)",
      parameters: {
        entityNames: "string (comma-separated)",
        files: "File[] (multiple uploads)",
        sources: "string[] (wikipedia, arxiv, etc.)",
        domains: "string[] (social, medical, etc.)",
        entityTypes: "string[] (Person, Organization, etc.)",
        maxEntities: "number (default: 50)",
      },
    },
  });
}
