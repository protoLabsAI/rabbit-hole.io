/**
 * Entity Matching API - Server-side Entity Similarity Detection
 *
 * Simple, debuggable server-side matching that actually works.
 * No more client-side complexity - just straightforward string matching.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

interface EntityMatchRequest {
  sourceEntityId: string;
}

interface EntityMatch {
  entity: any;
  similarity: number;
  matchReasons: string[];
}

interface EntityMatchResponse {
  success: boolean;
  matches?: EntityMatch[];
  sourceEntity?: any;
  error?: string;
  debug?: {
    totalEntitiesChecked: number;
    sameTypeEntitiesFound: number;
    searchQuery: string;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<EntityMatchResponse>> {
  try {
    const { sourceEntityId }: EntityMatchRequest = await request.json();

    if (!sourceEntityId) {
      return NextResponse.json(
        { success: false, error: "sourceEntityId is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Finding matches for entity: ${sourceEntityId}`);

    const client = getGlobalNeo4jClient();

    try {
      // Step 1: Get the source entity
      const sourceQuery = `
        MATCH (source {uid: $sourceId})
        RETURN source, labels(source) as labels
      `;

      const sourceResult = await client.executeRead(sourceQuery, {
        sourceId: sourceEntityId,
      });

      if (sourceResult.records.length === 0) {
        return NextResponse.json(
          { success: false, error: "Source entity not found" },
          { status: 404 }
        );
      }

      const sourceRecord = sourceResult.records[0];
      const sourceEntity = sourceRecord.get("source").properties;
      const sourceLabels = sourceRecord.get("labels");

      console.log(
        `📋 Source entity: ${sourceEntity.name} (${sourceLabels.join(", ")})`
      );

      // Step 2: Use any valid entity type from our modular system
      const { ALL_ENTITY_TYPES } = await import("@proto/types");
      const entityTypeLabels = sourceLabels.filter((label: string) =>
        ALL_ENTITY_TYPES.includes(label as any)
      );

      if (entityTypeLabels.length === 0) {
        console.log("⚠️ No recognized entity type found");
        return NextResponse.json({
          success: true,
          matches: [],
          sourceEntity,
          debug: {
            totalEntitiesChecked: 0,
            sameTypeEntitiesFound: 0,
            searchQuery: "No entity type labels found",
          },
        });
      }

      const entityType = entityTypeLabels[0];
      const sourceName = sourceEntity.name || "";

      console.log(`🎯 Using Neo4j similarity functions for: "${sourceName}"`);

      // Use Neo4j's APOC string similarity functions - much more powerful!
      const similarityQuery = `
        MATCH (source {uid: $sourceId})
        MATCH (candidate:${entityType})
        WHERE candidate.uid <> $sourceId
        
        WITH source, candidate,
             // Multiple similarity scores using Neo4j APOC functions
             apoc.text.levenshteinSimilarity(toLower(source.name), toLower(candidate.name)) as levenshtein,
             apoc.text.jaroWinklerDistance(toLower(source.name), toLower(candidate.name)) as jaroWinkler,
             apoc.text.sorensenDiceSimilarity(toLower(source.name), toLower(candidate.name)) as sorensenDice,
             
             // Normalized name comparison (remove common words)
             apoc.text.levenshteinSimilarity(
               toLower(apoc.text.replace(source.name, '(?i)\\b(the|of|and|for|in|on|at|to|a|an|us|u\\.s\\.)\\b', '')),
               toLower(apoc.text.replace(candidate.name, '(?i)\\b(the|of|and|for|in|on|at|to|a|an|us|u\\.s\\.)\\b', ''))
             ) as normalizedSimilarity,
             
             // Check if one name contains the other (fuzzy contains)
             CASE 
               WHEN toLower(candidate.name) CONTAINS toLower(source.name) 
                 OR toLower(source.name) CONTAINS toLower(candidate.name)
               THEN 0.8 
               ELSE 0.0 
             END as containsSimilarity
        
        WITH source, candidate, levenshtein, jaroWinkler, sorensenDice, normalizedSimilarity, containsSimilarity,
             // Take the highest similarity score
             apoc.coll.max([levenshtein, jaroWinkler, sorensenDice, normalizedSimilarity, containsSimilarity]) as maxSimilarity
        
        WHERE maxSimilarity > 0.3  // Only include decent matches
        
        RETURN candidate,
               candidate.uid as candidateUid,
               maxSimilarity as similarity,
               levenshtein,
               jaroWinkler, 
               sorensenDice,
               normalizedSimilarity,
               containsSimilarity,
               
               // Generate match reasons based on which similarity was highest
               CASE
                 WHEN normalizedSimilarity = maxSimilarity AND normalizedSimilarity > 0.9
                   THEN ['Exact match after removing common words (' + toString(round(normalizedSimilarity * 100)) + '%)']
                 WHEN containsSimilarity = maxSimilarity AND containsSimilarity > 0.5
                   THEN ['One name contains the other: "' + source.name + '" & "' + candidate.name + '"']
                 WHEN jaroWinkler = maxSimilarity AND jaroWinkler > 0.8
                   THEN ['Very similar names (Jaro-Winkler: ' + toString(round(jaroWinkler * 100)) + '%)']
                 WHEN levenshtein = maxSimilarity AND levenshtein > 0.7
                   THEN ['Similar with minor differences (Levenshtein: ' + toString(round(levenshtein * 100)) + '%)']
                 WHEN sorensenDice = maxSimilarity AND sorensenDice > 0.6
                   THEN ['Shared word patterns (Sorensen-Dice: ' + toString(round(sorensenDice * 100)) + '%)']
                 ELSE ['Similar names (' + toString(round(maxSimilarity * 100)) + '% match)']
               END as matchReasons
        
        ORDER BY maxSimilarity DESC
        LIMIT 20  // Reasonable limit for UI
      `;

      console.log(`🚀 Running Neo4j similarity query...`);

      let similarityResult;
      try {
        similarityResult = await client.executeRead(similarityQuery, {
          sourceId: sourceEntityId,
        });
      } catch (apocError) {
        console.warn(
          "⚠️ APOC functions not available, falling back to simple matching"
        );

        // Fallback query without APOC functions
        const fallbackQuery = `
          MATCH (source {uid: $sourceId})
          MATCH (candidate:${entityType})
          WHERE candidate.uid <> $sourceId
            AND (
              toLower(candidate.name) CONTAINS toLower(source.name)
              OR toLower(source.name) CONTAINS toLower(candidate.name)
              OR toLower(candidate.name) = toLower(source.name)
            )
          RETURN candidate,
                 candidate.uid as candidateUid,
                 CASE
                   WHEN toLower(candidate.name) = toLower(source.name) THEN 1.0
                   WHEN toLower(candidate.name) CONTAINS toLower(source.name) 
                     OR toLower(source.name) CONTAINS toLower(candidate.name)
                   THEN 0.8
                   ELSE 0.5
                 END as similarity,
                 ['Name similarity detected'] as matchReasons
          ORDER BY similarity DESC
          LIMIT 20
        `;

        similarityResult = await client.executeRead(fallbackQuery, {
          sourceId: sourceEntityId,
        });
      }

      console.log(
        `📊 Neo4j found ${similarityResult.records.length} similar entities`
      );

      // Process Neo4j results
      const matches: EntityMatch[] = similarityResult.records.map(
        (record: any) => {
          const candidate = record.get("candidate").properties;
          const candidateUid = record.get("candidateUid");

          // Safe conversion of similarity value (could be Neo4j Integer, number, or null)
          const similarityRaw = record.get("similarity");
          const similarity =
            typeof similarityRaw === "number"
              ? similarityRaw
              : (similarityRaw?.toNumber?.() ?? 0);

          const matchReasons = record.get("matchReasons");

          // Add detailed similarity breakdown for debugging (if APOC functions were used)
          let debug = {};
          try {
            const safeToNumber = (val: any): number => {
              if (typeof val === "number") return val;
              if (val?.toNumber) return val.toNumber();
              return 0;
            };

            debug = {
              levenshtein: safeToNumber(record.get("levenshtein")),
              jaroWinkler: safeToNumber(record.get("jaroWinkler")),
              sorensenDice: safeToNumber(record.get("sorensenDice")),
              normalizedSimilarity: safeToNumber(
                record.get("normalizedSimilarity")
              ),
              containsSimilarity: safeToNumber(
                record.get("containsSimilarity")
              ),
            };
          } catch {
            debug = { fallback: true };
          }

          console.log(
            `  📈 [${candidateUid}] ${candidate.name}: ${similarity.toFixed(2)} (${JSON.stringify(debug)})`
          );

          // Include uid in the entity object
          return {
            entity: {
              ...candidate,
              uid: candidateUid, // Ensure uid is included
            },
            similarity,
            matchReasons,
          };
        }
      );

      console.log(`✅ Found ${matches.length} potential matches`);

      return NextResponse.json({
        success: true,
        matches,
        sourceEntity,
        debug: {
          totalEntitiesChecked: similarityResult.records.length,
          sameTypeEntitiesFound: similarityResult.records.length,
          searchQuery: `Neo4j APOC similarity search for ${entityType}`,
        },
      });
    } catch (innerError) {
      console.error("❌ Inner entity matching failed:", innerError);
      return NextResponse.json(
        {
          success: false,
          error:
            innerError instanceof Error
              ? innerError.message
              : "Entity matching failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Entity matching failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Entity matching failed",
      },
      { status: 500 }
    );
  }
}
