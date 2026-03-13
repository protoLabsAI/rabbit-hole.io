#!/usr/bin/env tsx
/**
 * Manual Test Script for YouTube Processing Flow
 *
 * Usage:
 *   pnpm tsx scripts/test-youtube-flow.ts
 *
 * Requirements:
 *   - Job processor running (docker-compose.jobs.yml)
 *   - MinIO running
 *   - Groq API key configured
 */

import { summarizeTool } from "../packages/proto-llm-tools/src/tools/core/summarize/index.js";
import {
  enqueueYouTubeJobTool,
  transcribeAudioTool,
  submitMediaOutputTool,
} from "../packages/proto-llm-tools/src/tools/writing-agent-tools/media-processing-tools.js";

// Test video: https://www.youtube.com/watch?v=R_TnZJpCULI
const TEST_VIDEO_URL =
  process.env.TEST_VIDEO_URL || "https://www.youtube.com/watch?v=R_TnZJpCULI";
const TEST_USER_ID = "test_user_manual";
const TEST_WORKSPACE_ID = "test_workspace_manual";

async function pollJobCompletion(
  jobId: string,
  maxAttempts = 60
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use Next.js API route (requires auth)
    // For testing, we'll use the job processor's completion cache directly
    const statusResponse = await fetch(
      `http://localhost:3000/api/jobs/status/${jobId}`,
      {
        headers: {
          // Note: This requires Clerk authentication
          // For manual testing, you may need to pass session token
        },
      }
    );

    if (statusResponse.status === 404) {
      // Job not in cache yet, still processing
      console.log(`  [${attempt + 1}/${maxAttempts}] Job still processing...`);
    } else if (!statusResponse.ok) {
      console.warn(`  Warning: ${statusResponse.statusText}`);
    } else {
      const status = await statusResponse.json();

      console.log(
        `  [${attempt + 1}/${maxAttempts}] Status: ${status.status || "pending"}`
      );

      if (status.status === "completed" && status.result) {
        return status.result;
      }

      if (status.status === "failed") {
        throw new Error(`Job failed: ${status.error || "Unknown error"}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Job did not complete within timeout");
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🎬 YouTube Processing Flow Test");
  console.log("=".repeat(80) + "\n");

  try {
    // Step 1: Enqueue YouTube job
    console.log("📥 Step 1: Enqueuing YouTube job...");
    console.log(`   Video: ${TEST_VIDEO_URL}\n`);

    const enqueueResult = await enqueueYouTubeJobTool.invoke({
      url: TEST_VIDEO_URL,
      userId: TEST_USER_ID,
      workspaceId: TEST_WORKSPACE_ID,
    });

    console.log(`✅ Job enqueued successfully!`);
    console.log(`   Job ID: ${enqueueResult.jobId}`);
    console.log(`   Video ID: ${enqueueResult.videoId}\n`);

    // Step 2: Wait for job completion
    console.log("⏳ Step 2: Waiting for job completion...");
    console.log("   (This may take 1-3 minutes for video download)\n");

    const jobResult = await pollJobCompletion(enqueueResult.jobId);

    console.log(`\n✅ Job completed!`);
    console.log(`   Title: ${jobResult.title || "N/A"}`);
    console.log(`   Audio Key: ${jobResult.audioKey}`);
    console.log(`   Video Key: ${jobResult.videoKey}\n`);

    // Step 3: Transcribe audio
    console.log("🎤 Step 3: Transcribing audio...");
    console.log(`   Provider: Groq (FREE)`);
    console.log(`   Model: whisper-large-v3\n`);

    const transcribeResult = await transcribeAudioTool.invoke({
      audioKey: jobResult.audioKey,
      provider: "groq",
      model: "whisper-large-v3",
    });

    console.log(`✅ Transcription complete!`);
    console.log(`   Language: ${transcribeResult.language}`);
    console.log(`   Duration: ${transcribeResult.duration?.toFixed(2)}s`);
    console.log(`   Text length: ${transcribeResult.text.length} characters`);
    console.log(`   Segments: ${transcribeResult.segments?.length || 0}\n`);

    // Step 4: Generate summary
    console.log("📝 Step 4: Generating summary...\n");

    const summarizeResult = await summarizeTool.invoke({
      content: transcribeResult.text,
    });

    console.log(`✅ Summary generated!`);
    console.log(
      `   Summary length: ${summarizeResult.summary.length} characters`
    );
    console.log(
      `   Compression: ${summarizeResult.metadata.compressionRatio}x`
    );
    console.log(
      `   Chunks processed: ${summarizeResult.metadata.totalChunks}\n`
    );

    // Step 5: Submit final output
    console.log("📤 Step 5: Submitting output...\n");

    const submitResult = await submitMediaOutputTool.invoke({
      transcript: transcribeResult.text,
      summary: summarizeResult.summary,
      metadata: {
        videoId: enqueueResult.videoId,
        videoUrl: TEST_VIDEO_URL,
        title: jobResult.title,
        duration: transcribeResult.duration,
        language: transcribeResult.language,
        audioKey: jobResult.audioKey,
        videoKey: jobResult.videoKey,
      },
    });

    console.log(`✅ Output submitted successfully!\n`);

    // Display results
    console.log("=".repeat(80));
    console.log("📊 FINAL RESULTS");
    console.log("=".repeat(80));
    console.log(`\n🎥 Video Information:`);
    console.log(`   URL: ${TEST_VIDEO_URL}`);
    console.log(`   Title: ${jobResult.title || "N/A"}`);
    console.log(`   Duration: ${transcribeResult.duration?.toFixed(2)}s`);
    console.log(`   Language: ${transcribeResult.language}`);

    console.log(`\n📝 Transcript (first 500 chars):`);
    console.log(`   ${transcribeResult.text.substring(0, 500)}...`);

    console.log(`\n📋 Summary (first 500 chars):`);
    console.log(`   ${summarizeResult.summary.substring(0, 500)}...`);

    console.log(`\n✨ Metadata:`);
    console.log(`   Audio Key: ${jobResult.audioKey}`);
    console.log(`   Video Key: ${jobResult.videoKey}`);
    console.log(`   Transcription Provider: Groq`);
    console.log(`   Summary Chunks: ${summarizeResult.metadata.totalChunks}`);
    console.log(
      `   Compression Ratio: ${summarizeResult.metadata.compressionRatio}x`
    );

    console.log("\n" + "=".repeat(80));
    console.log("✅ All tests passed!");
    console.log("=".repeat(80) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
