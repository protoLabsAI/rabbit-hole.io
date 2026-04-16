/**
 * Enqueue LangExtract via Job Queue
 *
 * Server-side utility that enqueues extraction jobs directly to the job processor
 * and polls for completion. Bypasses Next.js API routes for efficiency.
 *
 * Used internally by extraction tools to replace direct LangExtract calls.
 */

import { pollForJobCompletion } from "@protolabsai/sidequest-utils/server";

interface EnqueueLangExtractParams {
  textContent: string;
  extractionPrompt: string;
  outputFormat?: Record<string, any>;
  workspaceId?: string;
  userId?: string;
  orgId?: string | null;
  sourceEntityUid?: string;
  jobType?: string;
  modelId?: string;
  includeSourceGrounding?: boolean;
  temperature?: number;
  useSchemaConstraints?: boolean;
  customSchema?: Record<string, any>;
  examples?: Array<{ input_text: string; expected_output: any }>; // Full examples array
  pollOptions?: {
    pollInterval?: number;
    timeout?: number;
  };
}

/**
 * Enqueue extraction job and wait for results
 *
 * Calls job processor directly for server-side efficiency.
 */
export async function enqueueLangExtract(
  params: EnqueueLangExtractParams
): Promise<any> {
  const {
    textContent,
    extractionPrompt,
    outputFormat,
    workspaceId = "system",
    userId = "system",
    orgId = null,
    sourceEntityUid,
    jobType,
    modelId,
    includeSourceGrounding = true,
    temperature,
    useSchemaConstraints = true,
    customSchema,
    examples,
    pollOptions = {},
  } = params;

  console.log(`📤 Enqueueing LangExtract job...`);
  console.log(`   Text: ${textContent.length} chars`);
  console.log(`   Prompt: ${extractionPrompt.substring(0, 80)}...`);

  // Call job processor directly (server-to-server)
  const jobProcessorUrl =
    process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

  const enqueueResponse = await fetch(
    `${jobProcessorUrl}/enqueue/langextract`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textContent,
        extractionPrompt,
        outputFormat,
        userId,
        orgId,
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
    }
  );

  if (!enqueueResponse.ok) {
    const errorText = await enqueueResponse.text();
    throw new Error(
      `Failed to enqueue job: ${enqueueResponse.status} - ${errorText}`
    );
  }

  const { jobId } = await enqueueResponse.json();
  console.log(`✅ Job enqueued: ${jobId}`);

  // Poll for completion using direct DB access
  const result = await pollForJobCompletion(jobId, pollOptions);

  return {
    success: true,
    data: result.extractedEntities,
    metadata: result.metadata,
    source_grounding: result.sourceGrounding,
  };
}
