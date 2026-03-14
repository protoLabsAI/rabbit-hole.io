import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { getRelationshipTypesForDomains } from "@proto/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
<<<<<<< HEAD
  const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
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
>>>>>>> origin/main

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userTier = getUserTier(user);
  const tierLimits = getTierLimits(userTier);

  if (!tierLimits.hasAIChatAccess) {
    return NextResponse.json(
      {
        error: "Upgrade Required",
        message: "Interactive extraction requires Basic tier or higher",
        upgradeUrl: "/pricing",
      },
      { status: 403 }
    );
  }

  try {
    const { inputText, domains, mode, entities, focusEntityUids } =
      await request.json();

    console.log("🔗 Relate phase API called");
    console.log("📊 Input text length:", inputText?.length || 0);
    console.log("👥 Entities received:", entities?.length || 0);
    console.log("🌐 Domains:", domains);
    console.log("🎯 Focus UIDs:", focusEntityUids);

    if (!inputText || !entities || !Array.isArray(entities)) {
      console.error("❌ Validation failed: missing inputText or entities");
      return NextResponse.json(
        { error: "inputText and entities array required" },
        { status: 400 }
      );
    }

    // Determine focus entities (user-provided or auto-detect)
    let finalFocusUids = focusEntityUids || [];
    if (finalFocusUids.length === 0) {
      const { detectFocusEntities } = await import("../utils");
      finalFocusUids = await detectFocusEntities(inputText, entities, domains);
    }

    console.log(
      `Focused relationship extraction: ${finalFocusUids.length} focus entities, ${entities.length} total entities`
    );

    // Separate focus entities from others
    const focusEntities = entities.filter((e) =>
      finalFocusUids.includes(e.uid)
    );
    const otherEntities = entities.filter(
      (e) => !finalFocusUids.includes(e.uid)
    );

    // Get valid relationship types for selected domains
    const validRelationshipTypes = getRelationshipTypesForDomains(
      domains || ["social", "academic", "geographic"]
    );

    console.log(
      `Using ${validRelationshipTypes.length} relationship types from domains: ${domains?.join(", ") || "social, academic, geographic"}`
    );

    // Process in batches of 10
    const BATCH_SIZE = 10;
    const allRelationships: any[] = [];

    for (const focusEntity of focusEntities) {
      for (let i = 0; i < otherEntities.length; i += BATCH_SIZE) {
        const batch = otherEntities.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(otherEntities.length / BATCH_SIZE);

        console.log(
          `Processing batch ${batchNum}/${totalBatches} for focus entity: ${focusEntity.name}`
        );

        const { buildFocusedRelationshipPrompt } = await import("../utils");
        const prompt = buildFocusedRelationshipPrompt(
          focusEntity,
          batch,
          validRelationshipTypes
        );

        // Call LangExtract for this batch
        const { langextractConfig } = await import("@proto/llm-tools");
        const serviceUrl = langextractConfig.getServiceUrl();

        console.log(
          `📤 LangExtract request for batch ${batchNum}/${totalBatches}`
        );
        console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

        const response = await fetch(`${serviceUrl}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text_or_documents: [inputText],
            prompt_description: prompt,
            model_id: "gpt-4o-mini",
            include_source_grounding: true,
            use_schema_constraints: false,
            examples: [
              {
                input_text:
                  "Einstein worked at Princeton University from 1933 to 1955 where he developed his theories. He collaborated with Niels Bohr on quantum mechanics.",
                expected_output: {
                  relationships: [
                    {
                      source_entity: "Einstein",
                      target_entity: "Princeton University",
                      relationship_type: "WORKED_AT",
                      start_date: "1933",
                      end_date: "1955",
                      confidence: 0.95,
                    },
                    {
                      source_entity: "Einstein",
                      target_entity: "Niels Bohr",
                      relationship_type: "COLLABORATED_WITH",
                      start_date: null,
                      end_date: null,
                      confidence: 0.9,
                    },
                  ],
                },
              },
            ],
          }),
        });

        if (response.ok) {
          const batchResult = await response.json();
          console.log(`📥 LangExtract response for batch ${batchNum}:`, {
            success: batchResult.success,
            hasData: !!batchResult.data,
            hasExtractedData: !!batchResult.extracted_data,
            extractedDataLength: Array.isArray(batchResult.extracted_data)
              ? batchResult.extracted_data.length
              : 0,
          });

          // LangExtract returns { data: { extracted_data: [{...}] } } or { data: {...} }
          const extractedData =
            batchResult.data?.extracted_data?.[0] ||
            batchResult.extracted_data?.[0] ||
            batchResult.data;

          console.log(
            `   Extracted data keys:`,
            extractedData ? Object.keys(extractedData) : []
          );

          const relationshipsData =
            extractedData?.relationships || extractedData?.relationship || [];

          console.log(
            `   Relationships extracted: ${relationshipsData.length}`
          );

          if (relationshipsData.length > 0) {
            console.log(`   Sample relationship:`, relationshipsData[0]);
          } else {
            console.warn(
              `   ⚠️ No relationships found. Full batchResult:`,
              JSON.stringify(batchResult, null, 2)
            );
          }

          // Convert to standard format
          for (const rel of relationshipsData) {
            console.log(`   Processing relationship:`, {
              source: rel.source_entity,
              target: rel.target_entity,
              type: rel.relationship_type,
            });

            const sourceUid = entities.find(
              (e) =>
                e.name.toLowerCase() === (rel.source_entity || "").toLowerCase()
            )?.uid;
            const targetUid = entities.find(
              (e) =>
                e.name.toLowerCase() === (rel.target_entity || "").toLowerCase()
            )?.uid;

            if (!sourceUid) {
              console.warn(
                `   ⚠️ Source entity not found: ${rel.source_entity}`
              );
            }
            if (!targetUid) {
              console.warn(
                `   ⚠️ Target entity not found: ${rel.target_entity}`
              );
            }

            if (sourceUid && targetUid && sourceUid !== targetUid) {
              console.log(
                `   ✅ Matched: ${sourceUid} -[${rel.relationship_type}]-> ${targetUid}`
              );
              allRelationships.push({
                source_uid: sourceUid,
                target_uid: targetUid,
                relationship_type: rel.relationship_type || "RELATED_TO",
                confidence: rel.confidence || rel._confidence || 0.8,
                properties: {
                  ...(rel.start_date && { start_date: rel.start_date }),
                  ...(rel.end_date && { end_date: rel.end_date }),
                },
              });
            } else if (sourceUid === targetUid) {
              console.warn(
                `   ⚠️ Skipping self-referential relationship: ${sourceUid}`
              );
            }
          }
        } else {
          console.error(
            `❌ LangExtract request failed for batch ${batchNum}:`,
            response.status
          );
        }
      }
    }

    console.log(
      `Found ${allRelationships.length} relationships across all batches`
    );

    // Convert batch results to relationships (deduplicate by UID + filter invalid)
    const relationshipsMap = new Map<string, any>();
    allRelationships.forEach((r: any) => {
      const sourceUid = r.source_uid || r.source;
      const targetUid = r.target_uid || r.target;
      const relType = r.relationship_type || r.type;

      // Skip invalid relationships:
      // 1. Missing source or target
      // 2. Self-referential (source === target)
      // 3. Missing relationship type
      if (
        !sourceUid ||
        !targetUid ||
        !relType ||
        sourceUid === targetUid ||
        relType === "RELATED_TO" // Skip generic relationships
      ) {
        console.warn(
          `Skipping invalid relationship: ${sourceUid} -[${relType}]-> ${targetUid}`
        );
        return;
      }

      const uid = r.uid || `rel:${sourceUid}_${relType}_${targetUid}`;

      // Only add if not already present (deduplication)
      if (!relationshipsMap.has(uid)) {
        relationshipsMap.set(uid, {
          uid,
          type: relType,
          source: sourceUid,
          target: targetUid,
          confidence: r.confidence || 0.8,
          properties: r.properties || {},
        });
      }
    });

    const relationships = Array.from(relationshipsMap.values());
    console.log(
      `Relate phase: ${allRelationships.length} raw → ${relationships.length} valid relationships (focused on ${finalFocusUids.length} entities)`
    );

    if (relationships.length > 0) {
      console.log("📋 Sample final relationship:", relationships[0]);
      console.log("   Keys:", Object.keys(relationships[0]));
    } else {
      console.warn("⚠️ No valid relationships after filtering");
    }

    return NextResponse.json({ relationships });
  } catch (error: any) {
    console.error("Relate phase error:", error);
    return NextResponse.json(
      { error: error.message || "Relate phase failed" },
      { status: 500 }
    );
  }
}
