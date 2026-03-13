import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { discoverEntitiesTool } from "@proto/llm-tools";

// 10 second timeout for discover entities operation
const DISCOVER_ENTITIES_TIMEOUT_MS = 10000;

// Validation schema for discover-entities request
const discoverEntitiesRequestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  domains: z.array(z.string()).min(1, "At least one domain is required"),
  maxEntities: z
    .number()
    .int()
    .min(1, "maxEntities must be at least 1")
    .max(100, "maxEntities cannot exceed 100")
    .optional()
    .default(25),
  modelId: z.string().optional(),
});

type DiscoverEntitiesRequest = z.infer<typeof discoverEntitiesRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload with Zod
    const parseResult = discoverEntitiesRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessages = (parseResult.error as z.ZodError).issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");

      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { content, domains, maxEntities, modelId }: DiscoverEntitiesRequest =
      parseResult.data;

    const startTime = Date.now();

    // Create AbortController and set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, DISCOVER_ENTITIES_TIMEOUT_MS);

    try {
      const result = await Promise.race([
        discoverEntitiesTool.invoke({
          content,
          domains,
          maxEntities,
          modelId: modelId || "gemini-2.5-flash-lite",
        }),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () => {
            reject(
              new Error(
                `Discover entities request timed out after ${DISCOVER_ENTITIES_TIMEOUT_MS}ms`
              )
            );
          })
        ),
      ]);

      clearTimeout(timeoutId);

      const processingTimeMs = Date.now() - startTime;

      return NextResponse.json({
        ...((result as Record<string, unknown>) || {}),
        processingTimeMs,
      });
    } catch (operationError: any) {
      clearTimeout(timeoutId);
      throw operationError;
    }
  } catch (error: any) {
    // Check for timeout
    if (error?.message?.includes("timed out") || error?.name === "AbortError") {
      console.warn("Discover entities request timed out:", error);
      return NextResponse.json({ error: "Request timed out" }, { status: 408 });
    }

    // Check for client errors (invalid JSON or validation errors)
    if (error instanceof SyntaxError || error?.name === "ZodError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Server error
    console.error("Discover entities error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
