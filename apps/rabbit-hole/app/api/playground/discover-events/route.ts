import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  discoverEventsTool,
  DiscoverEventsInputSchema,
  type DiscoverEventsInput,
} from "@proto/llm-tools";

// 10 second timeout for discover events operation
const DISCOVER_EVENTS_TIMEOUT_MS = 10000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload with tool's input schema
    const parseResult = DiscoverEventsInputSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessages = (parseResult.error as z.ZodError).issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");

      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const validatedInput: DiscoverEventsInput = parseResult.data;

    const startTime = Date.now();

    // Create AbortController and set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, DISCOVER_EVENTS_TIMEOUT_MS);

    try {
      const result = await Promise.race([
        discoverEventsTool.invoke({
          ...validatedInput,
          modelId: validatedInput.modelId || "gemini-2.5-flash-lite",
        }),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () => {
            reject(
              new Error(
                `Discover events request timed out after ${DISCOVER_EVENTS_TIMEOUT_MS}ms`
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
      console.warn("Discover events request timed out:", error);
      return NextResponse.json({ error: "Request timed out" }, { status: 408 });
    }

    // Check for client errors (invalid JSON or validation errors)
    if (error instanceof SyntaxError || error?.name === "ZodError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Server error
    console.error("Discover events error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
