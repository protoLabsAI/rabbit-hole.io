/**
 * Research Graph Streaming API (Server-Sent Events)
 *
 * POST /api/research/graph/stream
 *
 * Real-time progress updates for multi-source entity research.
 * Streams progress events to clients with detailed phase information.
 */

import { NextRequest } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import {
  discoverNode,
  structureNode,
  summarizeTool,
  entityResearchTool,
} from "@proto/llm-tools";
import type {
  Entity,
  Relationship,
  Evidence,
  RabbitHoleBundleData,
  EntityResearchInput,
  EntityResearchOutput,
} from "@proto/types";
import { getRelationshipTypesForDomains } from "@proto/types";
import { areSimilarStrings } from "@proto/utils";

import {
  createEvidenceFromWikipedia,
  createEvidenceFromFile,
  linkEvidenceToEntity,
  mergeSimilarEntities,
  calculateBundleMetrics,
} from "../evidence-creator";
import { fetchSources, parseEntityNames } from "../source-fetcher";

// Import extraction nodes

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface ProgressEvent {
  phase: string;
  message: string;
  progress: number;
  details?: any;
}

/**
 * Deduplicate entities using semantic similarity and substring matching
 * Merges variations like "Bernie", "Sanders", "Bernie Sanders" into one entity with aliases
 *
 * Optimization: Pre-groups entities by type + first letter (normalized) to reduce comparisons by ~10-20x
 */
function deduplicateEntitiesBySimilarity(entities: any[]): any[] {
  if (entities.length === 0) return [];

  // Step 1: Build buckets by type + first letter for fast lookup
  const buckets = new Map<string, number[]>(); // key: "type::firstLetter" -> indices

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const nameStr = String(entity?.name ?? "").trim();
    const firstLetter = nameStr.charAt(0).toLowerCase() || "_";
    const bucketKey = `${entity.type}::${firstLetter}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(i);
  }

  const deduplicated: any[] = [];
  const merged = new Set<number>(); // Track indices already merged

  for (let i = 0; i < entities.length; i++) {
    if (merged.has(i)) continue;

    const entity = entities[i];
    const duplicates: any[] = [entity];
    const aliasSet = new Set<string>([entity.name]);

    // Find all similar entities in the same bucket only
    const nameStr = String(entity?.name ?? "").trim();
    const firstLetter = nameStr.charAt(0).toLowerCase() || "_";
    const bucketKey = `${entity.type}::${firstLetter}`;
    const bucketIndices = buckets.get(bucketKey) || [];

    for (const j of bucketIndices) {
      if (i === j || merged.has(j)) continue;

      const candidate = entities[j];

      const entityLower = String(entity?.name ?? "")
        .toLowerCase()
        .trim();
      const candidateLower = String(candidate?.name ?? "")
        .toLowerCase()
        .trim();

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
  const { userId } = { userId: "local-user" };

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Tier enforcement (must check before starting stream)
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userTier = getUserTier(user);
  const tierLimits = getTierLimits(userTier);

  if (!tierLimits.hasAIChatAccess) {
    return new Response(
      JSON.stringify({
        error: "Upgrade Required",
        message: "Research requires Basic tier or higher",
        currentTier: userTier,
        upgradeUrl: "/pricing",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (event: ProgressEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Wire up abort signal to detect client disconnects
      const abortHandler = () => {
        console.log("🛑 Client disconnected from research stream");
        try {
          controller.error(new Error("Client disconnected"));
        } catch (e) {
          // Controller may already be closed
        }
      };

      request.signal.addEventListener("abort", abortHandler);

      try {
        // Parse request
        const formData = await request.formData();
        const entityNamesRaw = formData.get("entityNames") as string | null;
        const sourcesRaw = formData.get("sources") as string | null;
        const domainsRaw = formData.get("domains") as string | null;
        const entityTypesRaw = formData.get("entityTypes") as string | null;
        const maxEntitiesRaw = formData.get("maxEntities") as string | null;

        const entityNames = entityNamesRaw
          ? parseEntityNames(entityNamesRaw)
          : [];
        const sources = sourcesRaw ? JSON.parse(sourcesRaw) : ["wikipedia"];
        const domains = domainsRaw ? JSON.parse(domainsRaw) : [];
        const entityTypes = entityTypesRaw
          ? JSON.parse(entityTypesRaw)
          : undefined;
        const maxEntities = maxEntitiesRaw ? parseInt(maxEntitiesRaw) : 50;

        const files: File[] = [];
        for (const [key, value] of formData.entries()) {
          if (key.startsWith("file_") && value instanceof File) {
            files.push(value);
          }
        }

        sendProgress({
          phase: "init",
          message: `Researching ${entityNames.length} entities from ${sources.join(", ")}`,
          progress: 5,
        });

        // Phase 1: Fetch sources
        sendProgress({
          phase: "fetch",
          message: `Fetching from ${sources.join(", ")}...`,
          progress: 10,
        });

        const { sourceData, errors: fetchErrors } = await fetchSources({
          entityNames,
          files,
          sources,
        });

        if (sourceData.length === 0) {
          sendProgress({
            phase: "error",
            message: "Failed to fetch data from any source",
            progress: 0,
            details: { errors: fetchErrors },
          });
          controller.close();
          return;
        }

        sendProgress({
          phase: "fetch_complete",
          message: `Fetched ${sourceData.length} sources successfully`,
          progress: 15,
        });

        // Phase 2: Create evidence nodes
        sendProgress({
          phase: "evidence",
          message: "Creating evidence nodes with AI summaries...",
          progress: 20,
        });

        const evidence: Evidence[] = [];

        for (let i = 0; i < sourceData.length; i++) {
          const source = sourceData[i];

          sendProgress({
            phase: "evidence",
            message: `Summarizing ${source.identifier} (${i + 1}/${sourceData.length})...`,
            progress: 20 + (i / sourceData.length) * 10,
          });

          if (request.signal.aborted) {
            console.log("🛑 Request aborted during evidence creation");
            controller.close();
            return;
          }

          if (source.type === "wikipedia") {
            let summary = source.metadata.summary || "";

            try {
              const summaryResult = await summarizeTool.invoke({
                content: source.content,
                maxLength: 500,
              });
              summary = summaryResult.summary;
            } catch (error) {
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

        sendProgress({
          phase: "evidence_complete",
          message: `Created ${evidence.length} evidence nodes`,
          progress: 30,
        });

        // Phase 3A: Discover entities
        sendProgress({
          phase: "discover",
          message: "Discovering entities across all sources...",
          progress: 35,
        });

        const allDiscoveredEntities = new Map<string, any>();
        const focusEntityUids: string[] = [];

        for (let i = 0; i < sourceData.length; i++) {
          const source = sourceData[i];

          sendProgress({
            phase: "discover",
            message: `Discovering entities from ${source.identifier} (${i + 1}/${sourceData.length})...`,
            progress: 35 + (i / sourceData.length) * 15,
          });

          if (request.signal.aborted) {
            console.log("🛑 Request aborted during entity discovery");
            controller.close();
            return;
          }

          const discoverResult = await discoverNode({
            inputText: source.content,
            mode: "deep_dive",
            domains:
              domains.length > 0
                ? domains
                : ["social", "academic", "geographic"],
            confidenceThresholds: {
              discover: 0.7,
              structure: 0.8,
              enrich: 0.6,
              relate: 0.75,
            },
          } as any);

          const discoveredMap =
            discoverResult.discoveredEntities instanceof Map
              ? discoverResult.discoveredEntities
              : new Map(
                  Object.entries(discoverResult.discoveredEntities || {})
                );

          for (const [type, names] of discoveredMap.entries()) {
            const nameList = Array.isArray(names) ? names : [];
            for (const name of nameList) {
              const uid = `${type}:${name.toLowerCase().replace(/\s+/g, "_")}`;

              if (!allDiscoveredEntities.has(uid)) {
                allDiscoveredEntities.set(uid, {
                  uid,
                  type: type.charAt(0).toUpperCase() + type.slice(1),
                  name,
                  _phase: "discovered",
                  _confidence: 0.85,
                });
              }

              if (name.toLowerCase() === source.identifier.toLowerCase()) {
                focusEntityUids.push(uid);
              }
            }
          }
        }

        sendProgress({
          phase: "discover_complete",
          message: `Discovered ${allDiscoveredEntities.size} unique entities`,
          progress: 50,
          details: { totalEntities: allDiscoveredEntities.size },
        });

        // Deduplicate using semantic similarity
        console.log(
          `🔄 Deduplicating ${allDiscoveredEntities.size} entities...`
        );
        sendProgress({
          phase: "dedupe",
          message: "Deduplicating similar entities...",
          progress: 52,
        });

        const deduplicatedEntities = deduplicateEntitiesBySimilarity(
          Array.from(allDiscoveredEntities.values())
        );

        const dedupedCount =
          allDiscoveredEntities.size - deduplicatedEntities.length;
        console.log(
          `✅ Deduplication: ${allDiscoveredEntities.size} → ${deduplicatedEntities.length} (merged ${dedupedCount})`
        );

        if (dedupedCount > 0) {
          sendProgress({
            phase: "dedupe",
            message: `Merged ${dedupedCount} duplicate entities`,
            progress: 54,
          });
        }

        // Limit entities to maxEntities before structure phase
        const entitiesToStructure = deduplicatedEntities.slice(0, maxEntities);

        if (deduplicatedEntities.length > maxEntities) {
          sendProgress({
            phase: "limit",
            message: `Limiting to ${maxEntities} entities (found ${deduplicatedEntities.length})`,
            progress: 56,
          });
        }

        // Phase 3B: Structure - Extract required fields
        sendProgress({
          phase: "structure",
          message: `Extracting required fields for ${entitiesToStructure.length} entities...`,
          progress: 55,
        });

        const deduplicatedDiscoveredMap = new Map<string, string[]>();
        const canonicalNames = new Set<string>();

        for (const entity of entitiesToStructure) {
          const type = entity.type.toLowerCase();

          // Skip if we already have this name
          if (canonicalNames.has(entity.name)) continue;

          canonicalNames.add(entity.name);

          if (!deduplicatedDiscoveredMap.has(type)) {
            deduplicatedDiscoveredMap.set(type, []);
          }
          deduplicatedDiscoveredMap.get(type)!.push(entity.name);
        }

        console.log(`📊 Canonical names for structure: ${canonicalNames.size}`);
        console.log(
          `   Sample: ${Array.from(canonicalNames).slice(0, 5).join(", ")}`
        );

        sendProgress({
          phase: "structure",
          message: `Processing ${canonicalNames.size} unique entities...`,
          progress: 57,
        });

        // Update focusEntityUids - map old uids to canonical deduplicated uids
        const processedUids = new Set(entitiesToStructure.map((e) => e.uid));
        const limitedFocusUids: string[] = [];

        console.log(`🎯 Original focus entity UIDs: ${focusEntityUids.length}`);

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

            console.log(
              `   Structured ${(entity as any).name}: ${Object.keys((entity as any).properties || {}).length} properties`
            );
            structuredEntities.push(structuredEntity);
          }
        }

        console.log(
          `✅ Phase 2 complete: Structured ${structuredEntities.length} entities`
        );
        console.log(
          `   Properties check: ${structuredEntities.map((e) => `${e.name}=${Object.keys(e.properties || {}).length}`).join(", ")}`
        );

        sendProgress({
          phase: "structure_complete",
          message: `Structured ${structuredEntities.length} entities (with aliases)`,
          progress: 65,
        });

        // Phase 3C: Relationships
        sendProgress({
          phase: "relate",
          message: "Finding relationships...",
          progress: 70,
        });

        const relationships: Relationship[] = [];
        const focusEntities = structuredEntities.filter((e) =>
          limitedFocusUids.includes(e.uid)
        );
        const otherEntities = structuredEntities.filter(
          (e) => !limitedFocusUids.includes(e.uid)
        );

        const allContent = sourceData.map((s) => s.content).join("\n\n---\n\n");

        if (focusEntities.length > 0 && otherEntities.length > 0) {
          const validRelationshipTypes = getRelationshipTypesForDomains(
            domains.length > 0 ? domains : ["social", "academic", "geographic"]
          );

          const { buildFocusedRelationshipPrompt } = await import(
            "../../../extraction/phases/utils"
          );

          for (let focusIdx = 0; focusIdx < focusEntities.length; focusIdx++) {
            const focusEntity = focusEntities[focusIdx];

            sendProgress({
              phase: "relate",
              message: `Finding relationships for ${focusEntity.name} (${focusIdx + 1}/${focusEntities.length})...`,
              progress: 70 + (focusIdx / focusEntities.length) * 15,
            });

            const BATCH_SIZE = 10;
            for (let i = 0; i < otherEntities.length; i += BATCH_SIZE) {
              const batch = otherEntities.slice(i, i + BATCH_SIZE);
              const prompt = buildFocusedRelationshipPrompt(
                focusEntity,
                batch,
                validRelationshipTypes
              );

              if (request.signal.aborted) {
                console.log("🛑 Request aborted during relationship finding");
                controller.close();
                return;
              }

              const langextractUrl =
                process.env.LANGEXTRACT_URL || "http://localhost:8002";
              const response = await fetch(`${langextractUrl}/api/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text_or_documents: [allContent],
                  prompt_description: prompt,
                  model_id: "gpt-4o-mini",
                  format: "json",
                }),
              });

              if (response.ok) {
                const data = await response.json();
                const batchRelationships = data.data?.[0]?.relationships || [];
                relationships.push(...batchRelationships);
              }
            }
          }
        }

        sendProgress({
          phase: "relate_complete",
          message: `Found ${relationships.length} relationships`,
          progress: 85,
        });

        // Phase 3D: Enrich focus entities using domain config enrichment
        const wikipediaSources = sourceData.filter(
          (s) => s.type === "wikipedia"
        );
        console.log(
          `🎯 Focus entities for enrichment: ${focusEntities.length}`
        );
        console.log(`   Names: ${focusEntities.map((e) => e.name).join(", ")}`);

        if (wikipediaSources.length > 0 && focusEntities.length > 0) {
          console.log(
            `📋 Phase 4: Enriching ${focusEntities.length} primary entities using domain configs...`
          );
          sendProgress({
            phase: "enrich",
            message: `Enriching ${focusEntities.length} primary entities...`,
            progress: 88,
          });

          for (let i = 0; i < focusEntities.length; i++) {
            const focusEntity = focusEntities[i];

            console.log(
              `   Processing ${i + 1}/${focusEntities.length}: ${focusEntity.name}`
            );
            sendProgress({
              phase: "enrich",
              message: `Enriching ${focusEntity.name} (${i + 1}/${focusEntities.length})...`,
              progress: 88 + (i / focusEntities.length) * 7,
            });

            if (request.signal.aborted) {
              console.log("🛑 Request aborted during enrichment");
              controller.close();
              return;
            }

            const wikipediaContent = wikipediaSources
              .map((s) => s.content)
              .join("\n\n");

            const researchInput: EntityResearchInput = {
              targetEntityName:
                focusEntity.name || focusEntity.uid.split(":")[1],
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
              const researchResult = (await entityResearchTool.invoke(
                researchInput
              )) as EntityResearchOutput;

              if (
                researchResult.success &&
                researchResult.entities.length > 0
              ) {
                const enrichedEntity = researchResult.entities[0];
                const index = structuredEntities.findIndex(
                  (e) => e.uid === focusEntity.uid
                );

                console.log(
                  `   Entity ${focusEntity.name}: index=${index}, enriched properties=${Object.keys(enrichedEntity.properties || {}).length}`
                );

                if (index >= 0) {
                  const beforeProps = Object.keys(
                    structuredEntities[index].properties || {}
                  ).length;
                  // Merge enriched properties with existing properties
                  structuredEntities[index] = {
                    ...structuredEntities[index],
                    properties: {
                      ...structuredEntities[index].properties,
                      ...enrichedEntity.properties,
                    },
                    aliases:
                      enrichedEntity.aliases ||
                      structuredEntities[index].aliases,
                    tags: enrichedEntity.tags || structuredEntities[index].tags,
                  };
                  const afterProps = Object.keys(
                    structuredEntities[index].properties || {}
                  ).length;
                  console.log(
                    `   ✅ Merged properties: ${beforeProps} → ${afterProps}`
                  );
                }
              } else {
                console.log(
                  `   ⚠️ Enrichment returned no entities or failed for ${focusEntity.name}`
                );
              }
            } catch (error) {
              console.error(
                `   ❌ Failed to enrich ${focusEntity.name}:`,
                error
              );
              // Continue with other entities
            }
          }
        }

        // Link evidence
        const allEvidenceUids = evidence.map((e) => e.uid);
        let entities = structuredEntities.map((e) =>
          linkEvidenceToEntity(e, allEvidenceUids)
        );

        sendProgress({
          phase: "merge",
          message: "Deduplicating similar entities...",
          progress: 92,
        });

        entities = mergeSimilarEntities(entities);

        // Transform relationships to bundle format (source_entity → source, etc.)
        // and link evidence
        const transformedRelationships = relationships.map(
          (rel: any, idx: number) => ({
            uid: rel.uid || `rel:${idx}`,
            type: rel.relationship_type || rel.type,
            source: rel.source_entity || rel.source,
            target: rel.target_entity || rel.target,
            at: rel.at,
            confidence: rel.confidence,
            properties: {
              ...(rel.properties || {}),
              evidence_uids: allEvidenceUids,
            },
          })
        );

        sendProgress({
          phase: "complete",
          message: "Preparing final results...",
          progress: 95,
        });

        // Assemble bundle
        const bundle: RabbitHoleBundleData = {
          evidence,
          entities,
          relationships: transformedRelationships,
          files: [],
          content: [],
          entityCitations: {},
          relationshipCitations: {},
        };

        const metrics = calculateBundleMetrics(bundle, 0);

        // Send final result
        const finalEvent = {
          phase: "done",
          message: "Research complete",
          progress: 100,
          details: {
            bundle,
            stats: {
              evidenceCreated: evidence.length,
              entitiesExtracted: entities.length,
              relationshipsDiscovered: relationships.length,
              filesProcessed: files.length,
              sourcesUsed: sources,
            },
            metrics,
          },
        };

        const data = `data: ${JSON.stringify(finalEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      } catch (error) {
        const errorEvent = {
          phase: "error",
          message: error instanceof Error ? error.message : "Research failed",
          progress: 0,
        };
        const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      } finally {
        // Remove the abort listener to prevent memory leaks
        request.signal.removeEventListener("abort", abortHandler);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
