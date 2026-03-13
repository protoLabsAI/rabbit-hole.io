import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { enrichEntityTool } from "@proto/llm-tools";
import { domainRegistry } from "@proto/types";

// 10 second timeout for enrich entity operation
const ENRICH_ENTITY_TIMEOUT_MS = 10000;

// Validation schema for enrich-entity request
const enrichEntityRequestSchema = z.object({
  entityName: z.string().min(1, "Entity name is required"),
  entityType: z.string().min(1, "Entity type is required"),
  content: z.string().min(1, "Content is required"),
  fieldsToExtract: z
    .array(z.string())
    .min(1, "At least one field to extract is required"),
  modelId: z.string().optional(),
});

type EnrichEntityRequest = z.infer<typeof enrichEntityRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload with Zod
    const parseResult = enrichEntityRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessages = (parseResult.error as z.ZodError).issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");

      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const {
      entityName,
      entityType,
      content,
      fieldsToExtract,
      modelId,
    }: EnrichEntityRequest = parseResult.data;

    console.log("Enrich entity request:", {
      entityName,
      entityType,
      contentLength: content.length,
      fieldsToExtract,
    });

    // Get enrichment examples from domain configs
    let examples: Array<{
      input_text: string;
      expected_output: Record<string, any>;
    }> = [];

    try {
      // Get domain for this entity type using indexed lookup (O(1) instead of O(n))
      const domainName = domainRegistry.getDomainFromEntityType(entityType);
      if (domainName) {
        const domainConfig = domainRegistry.getDomainConfig(domainName);
        if (domainConfig?.enrichmentExamples?.[entityType]) {
          examples = [domainConfig.enrichmentExamples[entityType]];
          console.log(
            `Using enrichment example for ${entityType} from ${domainConfig.name} domain`
          );
        }
      }
    } catch (err) {
      console.warn("Could not load enrichment examples:", err);
    }

    const startTime = Date.now();

    // Create AbortController and set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, ENRICH_ENTITY_TIMEOUT_MS);

    try {
      const result = await Promise.race([
        enrichEntityTool.invoke({
          entityName,
          entityType,
          content,
          fieldsToExtract,
          examples: examples.length > 0 ? examples : undefined,
          useSchemaConstraints: false,
          modelId: modelId || "gemini-2.5-flash-lite",
        }),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () => {
            reject(
              new Error(
                `Enrich entity request timed out after ${ENRICH_ENTITY_TIMEOUT_MS}ms`
              )
            );
          })
        ),
      ]);

      clearTimeout(timeoutId);

      const processingTimeMs = Date.now() - startTime;

      console.log("Enrich entity result:", result);

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
      console.warn("Enrich entity request timed out:", error);
      return NextResponse.json({ error: "Request timed out" }, { status: 408 });
    }

    // Check for client errors (invalid JSON or validation errors)
    if (error instanceof SyntaxError || error?.name === "ZodError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Server error
    console.error("Enrich entity error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
