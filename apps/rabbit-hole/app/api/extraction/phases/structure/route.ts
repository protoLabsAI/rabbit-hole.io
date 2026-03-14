import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";
import { structureNode } from "@proto/llm-tools";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
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

    // Convert entities array to Map<type, names[]>
    const discoveredMap = new Map<string, string[]>();
    entities.forEach((entity: any) => {
      const typeKey = entity.type.toLowerCase();
      const existing = discoveredMap.get(typeKey) || [];
      discoveredMap.set(typeKey, [...existing, entity.name]);
    });

    const result = await structureNode({
      inputText,
      mode: mode || "deep_dive",
      domains: domains || ["social", "academic", "geographic"],
      discoveredEntities: discoveredMap,
      confidenceThresholds: {
        discover: 0.7,
        structure: 0.8,
        enrich: 0.6,
        relate: 0.75,
      },
    } as any);

    // Convert Map to entity array (already deduplicated by Map structure)
    const structuredEntities: any[] = [];
    if (result.structuredEntities) {
      for (const [uid, entity] of result.structuredEntities.entries()) {
        // Ensure uid is set from the Map key
        const { uid: _, ...entityWithoutUid } = entity; // Remove uid from entity if present
        structuredEntities.push({
          uid, // Use Map key as authoritative UID
          ...entityWithoutUid,
          _phase: "structured",
        });
      }
    }

    return NextResponse.json({ entities: structuredEntities });
  } catch (error: any) {
    console.error("Structure phase error:", error);
    return NextResponse.json(
      { error: error.message || "Structure phase failed" },
      { status: 500 }
    );
  }
}
