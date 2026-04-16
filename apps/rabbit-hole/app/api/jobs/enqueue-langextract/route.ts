/**
 * Enqueue LangExtract Job API Route
 *
 * POST /api/jobs/enqueue-langextract
 *
 * Enqueues text content for entity extraction via job queue.
 * Supports batching and configurable extraction parameters.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserTier, getTierLimits } from "@protolabsai/auth";

const EnqueueLangExtractSchema = z.object({
  textContent: z.string().min(1, "Text content required"),
  extractionPrompt: z.string().min(1, "Extraction prompt required"),
  outputFormat: z.record(z.string(), z.any()).optional(),
  workspaceId: z.string().min(1, "Workspace ID required"),
  sourceEntityUid: z.string().optional(),
  jobType: z.string().optional(),
  modelId: z.string().optional(),
  includeSourceGrounding: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  useSchemaConstraints: z.boolean().optional(),
  customSchema: z.record(z.string(), z.any()).optional(),
  examples: z
    .array(
      z.object({
        input_text: z.string(),
        expected_output: z.any(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = "local-user";
    const orgId = "local-org";
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Tier enforcement (Clerk removed - using local user)
    const user = {
      id: "local-user",
      publicMetadata: { tier: "free", role: "admin" },
      emailAddresses: [{ emailAddress: "local@localhost" }],
    } as any;
    const userTier = getUserTier(user);
    const tierLimits = getTierLimits(userTier);

    if (!tierLimits.hasAIChatAccess) {
      return NextResponse.json(
        {
          error: "Upgrade Required",
          message:
            "Entity extraction requires Basic tier or higher. Upgrade at /pricing.",
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate request
    const body = await request.json();
    const validation = EnqueueLangExtractSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      textContent,
      extractionPrompt,
      outputFormat,
      workspaceId,
      sourceEntityUid,
      jobType,
      modelId,
      includeSourceGrounding,
      temperature,
      useSchemaConstraints,
      customSchema,
      examples,
    } = validation.data;

    console.log(`📤 Enqueueing LangExtract job for user ${userId}`);
    console.log(
      `   Content: ${textContent.length} chars, Prompt: ${extractionPrompt.substring(0, 50)}...`
    );

    // 4. Call job processor HTTP API
    const jobProcessorUrl =
      process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

    const response = await fetch(`${jobProcessorUrl}/enqueue/langextract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textContent,
        extractionPrompt,
        outputFormat,
        userId,
        orgId: orgId || null,
        workspaceId,
        sourceEntityUid,
        jobType,
        modelId,
        includeSourceGrounding,
        temperature,
        useSchemaConstraints,
        customSchema,
        examples,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("❌ Job processor failed:", error);
      throw new Error(error.error || "Failed to enqueue job");
    }

    const result = await response.json();

    console.log(`✅ Job enqueued: ${result.jobId}`);

    return NextResponse.json(
      {
        success: true,
        status: "enqueued",
        message: "Extraction job queued for processing",
        data: {
          jobId: result.jobId,
          queuedAt: result.queuedAt ?? new Date().toISOString(),
        },
      },
      { status: 202 } // Accepted
    );
  } catch (error) {
    console.error("❌ Failed to enqueue LangExtract job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
