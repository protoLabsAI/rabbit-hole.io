import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserTier, getTierLimits } from "@proto/auth";
import { discoverNode } from "@proto/llm-tools";

export const maxDuration = 60;

// Request validation schema
const DiscoverRequestSchema = z.object({
  inputText: z.string().min(1, "inputText is required and must be non-empty"),
  domains: z.array(z.string()).optional(),
  mode: z.enum(["deep_dive", "quick", "focused"]).optional(),
  focusEntityNames: z.array(z.string()).optional(),
  maxEntities: z
    .number()
    .optional()
    .transform((val) => {
      if (val === undefined) return 25;
      // Coerce to integer and clamp to safe range [1, 100]
      const parsed = Math.floor(val);
      if (!Number.isFinite(parsed)) return 25;
      return Math.max(1, Math.min(100, parsed));
    }),
});

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
    const body = await request.json();

    // Validate request body with zod schema
    const validationResult = DiscoverRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { inputText, domains, mode, focusEntityNames, maxEntities } =
      validationResult.data;

    const result = await discoverNode({
      inputText,
      mode: mode || "deep_dive",
      domains: domains || ["social", "academic", "geographic"],
      confidenceThresholds: {
        discover: 0.7,
        structure: 0.8,
        enrich: 0.6,
        relate: 0.75,
      },
    } as any);

    // Guard and normalize discoveredEntities - handle Map, object, or null/undefined
    let discoveredEntitiesMap: Map<string, string[]>;

    if (result.discoveredEntities instanceof Map) {
      discoveredEntitiesMap = result.discoveredEntities;
    } else if (
      result.discoveredEntities &&
      typeof result.discoveredEntities === "object"
    ) {
      // Convert plain object to Map
      discoveredEntitiesMap = new Map(
        Object.entries(result.discoveredEntities)
      );
    } else {
      // Treat as empty if null/undefined/invalid
      discoveredEntitiesMap = new Map();
    }

    // Convert Map to entity array (deduplicate by UID)
    const entitiesMap = new Map<string, any>();
    for (const [type, names] of discoveredEntitiesMap.entries()) {
      const nameList = Array.isArray(names) ? names : [];
      for (const name of nameList) {
        const uid = `${type}:${name.toLowerCase().replace(/\s+/g, "_")}`;
        // Only add if not already present (deduplication)
        if (!entitiesMap.has(uid)) {
          // Use default confidence of 0.85 for discovered entities
          const confidence = 0.85;

          entitiesMap.set(uid, {
            uid,
            type: type.charAt(0).toUpperCase() + type.slice(1),
            name,
            _phase: "discovered",
            _confidence: confidence,
          });
        }
      }
    }

    let entities = Array.from(entitiesMap.values());

    // Match focus entity names to UIDs if provided
    let focusEntityUids: string[] = [];
    if (focusEntityNames && Array.isArray(focusEntityNames)) {
      const { matchFocusEntityNames } = await import("../utils");
      focusEntityUids = matchFocusEntityNames(focusEntityNames, entities);
    }

    // Limit entities to maxEntities (already clamped and coerced by schema)
    if (entities.length > maxEntities) {
      console.log(
        `Limiting discovery: ${entities.length} found → ${maxEntities} returned`
      );

      // Prioritize: focus entities + others up to limit
      const focusSet = new Set(focusEntityUids);
      const focusEntities = entities.filter((e) => focusSet.has(e.uid));
      const otherEntities = entities.filter((e) => !focusSet.has(e.uid));

      entities = [
        ...focusEntities,
        ...otherEntities.slice(
          0,
          Math.max(0, maxEntities - focusEntities.length)
        ),
      ];
    }

    return NextResponse.json({
      entities,
      focusEntityUids,
      totalFound: Array.from(entitiesMap.values()).length,
      returned: entities.length,
    });
  } catch (error: any) {
    console.error("Discover phase error:", error);
    return NextResponse.json(
      { error: error.message || "Discovery failed" },
      { status: 500 }
    );
  }
}
