import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { enrichNode } from "@proto/llm-tools";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = {
    id: "local-user",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
  } as any;

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
    const { inputText, domains, mode, entities } = await request.json();

    if (!inputText || !entities || !Array.isArray(entities)) {
      return NextResponse.json(
        { error: "inputText and entities array required" },
        { status: 400 }
      );
    }

    // Convert entities array to Map<uid, entity>
    const structuredMap = new Map<string, any>();
    entities.forEach((entity: any) => {
      structuredMap.set(entity.uid, entity);
    });

    const result = await enrichNode({
      inputText,
      mode: mode || "deep_dive",
      domains: domains || ["social", "academic", "geographic"],
      structuredEntities: structuredMap,
      confidenceThresholds: {
        discover: 0.7,
        structure: 0.8,
        enrich: 0.6,
        relate: 0.75,
      },
    } as any);

    // Convert Map to entity array (already deduplicated by Map structure)
    const enrichedEntities: any[] = [];
    if (result.enrichedEntities) {
      for (const [uid, entity] of result.enrichedEntities.entries()) {
        // Ensure uid is set from the Map key
        const { uid: _, ...entityWithoutUid } = entity; // Remove uid from entity if present
        enrichedEntities.push({
          uid, // Use Map key as authoritative UID
          ...entityWithoutUid,
          _phase: "enriched",
        });
      }
    }

    return NextResponse.json({ entities: enrichedEntities });
  } catch (error: any) {
    console.error("Enrich phase error:", error);
    return NextResponse.json(
      { error: error.message || "Enrich phase failed" },
      { status: 500 }
    );
  }
}
