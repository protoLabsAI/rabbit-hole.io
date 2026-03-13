/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import dotenv from "dotenv";

dotenv.config();

import { queryWikipedia } from "./src/config/wikipedia-config";
import {
  buildHumanLoopExtractionGraph,
  type HumanLoopExtractionState,
  type ReviewData,
} from "./src/workflows/human-loop-extraction-graph";
import {
  discoverNode,
  structureNode,
  enrichNode,
  relateNode,
  annotationNode,
} from "./src/workflows/multi-phase-extraction";

/**
 * Interactive test for human-loop extraction workflow
 *
 * This demonstrates:
 * 1. Start extraction → interrupt at discover phase
 * 2. User reviews entities → approves
 * 3. Continue to structure → interrupt
 * 4. User corrects fields → approves
 * 5. Continue through remaining phases
 *
 * Usage:
 *   pnpm exec tsx test-human-loop.ts [entity-name]
 *
 * Example:
 *   pnpm exec tsx test-human-loop.ts "Marie Curie"
 *
 * Prerequisites:
 * - LangExtract service running at http://localhost:8000
 * - Gemini API key in .env
 */

// Build graph with phase nodes
const graph = buildHumanLoopExtractionGraph({
  discoverNode,
  structureNode,
  enrichNode,
  relateNode,
  annotationNode,
});

/**
 * Display review data in readable format
 */
function displayReviewData(reviewData: ReviewData) {
  console.log("\n" + "=".repeat(60));
  console.log(`📋 REVIEW: ${reviewData.phase.toUpperCase()} PHASE`);
  console.log("=".repeat(60));

  if (reviewData.entities && reviewData.entities.length > 0) {
    console.log(`\n✨ Entities Found: ${reviewData.entities.length}`);
    reviewData.entities.slice(0, 10).forEach((entity, i) => {
      console.log(`   ${i + 1}. ${entity.name} (${entity.type})`);
      if (entity.uid) console.log(`      UID: ${entity.uid}`);
      if (entity.confidence) {
        console.log(
          `      Confidence: ${Math.round(entity.confidence * 100)}%`
        );
      }
    });
    if (reviewData.entities.length > 10) {
      console.log(`   ... and ${reviewData.entities.length - 10} more`);
    }
  }

  if (reviewData.relationships && reviewData.relationships.length > 0) {
    console.log(`\n🔗 Relationships: ${reviewData.relationships.length}`);
    reviewData.relationships.slice(0, 5).forEach((rel, i) => {
      console.log(`   ${i + 1}. ${rel.source} → ${rel.type} → ${rel.target}`);
      if (rel.confidence) {
        console.log(`      Confidence: ${Math.round(rel.confidence * 100)}%`);
      }
    });
    if (reviewData.relationships.length > 5) {
      console.log(`   ... and ${reviewData.relationships.length - 5} more`);
    }
  }

  if (
    reviewData.duplicateCandidates &&
    reviewData.duplicateCandidates.length > 0
  ) {
    console.log(
      `\n⚠️  Possible Duplicates: ${reviewData.duplicateCandidates.length}`
    );
    reviewData.duplicateCandidates.forEach((group, i) => {
      console.log(
        `   ${i + 1}. Similarity: ${Math.round(group.similarity * 100)}%`
      );
      console.log(`      Entities: ${group.entities.join(", ")}`);
    });
  }

  if (reviewData.stats) {
    console.log("\n📊 Stats:");
    Object.entries(reviewData.stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * Simulate user decision (auto-approve for demo)
 */
function simulateUserDecision(phase: string): any {
  console.log(
    `\n✅ Auto-approving ${phase} phase (in real UI, user would review)`
  );

  return {
    approvals: { [phase]: true },
    userActions: [
      {
        phase,
        action: "approve" as const,
        timestamp: new Date().toISOString(),
        details: {},
      },
    ],
  };
}

async function main() {
  const entityName = process.argv[2] || "Albert Einstein";

  try {
    console.log(`\n🚀 Starting Human-in-the-Loop Extraction`);
    console.log(`📖 Entity: ${entityName}`);
    console.log("=".repeat(60));

    // Fetch Wikipedia content
    console.log(`\n🔍 Fetching Wikipedia data...`);
    const wikiData = await queryWikipedia(entityName, {
      language: "en",
      topKResults: 1,
    });

    if (wikiData.pages.length === 0) {
      throw new Error("No Wikipedia pages found");
    }

    const page = wikiData.pages[0];
    console.log(`✅ Found: ${page.title}`);
    console.log(`   Words: ${page.wordCount}`);
    console.log(`   Characters: ${page.content.length}`);

    // Generate thread ID
    const threadId = `test-${Date.now()}`;
    const config = {
      configurable: { thread_id: threadId },
    };

    console.log(`\n🔄 Starting extraction workflow (thread: ${threadId})`);
    console.log("   This will pause at each phase for review...\n");

    // Phase 1: Start extraction (runs until first interrupt)
    console.log("⏳ Phase 1: DISCOVER - Finding entities...");
    let states: HumanLoopExtractionState[] = [];

    for await (const state of await graph.stream(
      {
        inputText: page.content.substring(0, 2000), // Limit for demo
        mode: "deep_dive" as const,
        domains: ["social", "academic"],
        modelId: undefined,
        temperature: undefined,
        confidenceThresholds: {
          discover: 0.7,
          structure: 0.8,
          enrich: 0.6,
          relate: 0.75,
        },
      },
      config
    )) {
      states.push(state);
    }

    let currentState = states[states.length - 1];

    if (currentState.reviewData) {
      displayReviewData(currentState.reviewData);
    }

    // Simulate user approval for discover phase
    const discoverDecision = simulateUserDecision("discover");

    // Phase 2: Continue to structure
    console.log("\n⏳ Phase 2: STRUCTURE - Extracting required fields...");
    states = [];

    // @ts-ignore - Demo script with complex LangGraph interrupt types
    for await (const state of await graph.stream(discoverDecision, {
      ...config,
      interruptBefore: [],
    })) {
      states.push(state);
    }

    currentState = states[states.length - 1];

    if (currentState.reviewData) {
      displayReviewData(currentState.reviewData);
    }

    // Simulate user approval for structure phase
    const structureDecision = simulateUserDecision("structure");

    // Phase 3: Continue to enrich
    console.log("\n⏳ Phase 3: ENRICH - Adding optional fields...");
    states = [];

    // @ts-ignore - Demo script with complex LangGraph interrupt types
    for await (const state of await graph.stream(structureDecision, {
      ...config,
      interruptBefore: [],
    })) {
      states.push(state);
    }

    currentState = states[states.length - 1];

    if (currentState.reviewData) {
      displayReviewData(currentState.reviewData);
    }

    // Simulate user approval for enrich phase
    const enrichDecision = simulateUserDecision("enrich");

    // Phase 4: Continue to relate
    console.log("\n⏳ Phase 4: RELATE - Discovering relationships...");
    states = [];

    // @ts-ignore - Demo script with complex LangGraph interrupt types
    for await (const state of await graph.stream(enrichDecision, {
      ...config,
      interruptBefore: [],
    })) {
      states.push(state);
    }

    currentState = states[states.length - 1];

    if (currentState.reviewData) {
      displayReviewData(currentState.reviewData);
    }

    // Simulate user approval for relate phase
    const relateDecision = simulateUserDecision("relate");

    // Phase 5: Finalize
    console.log("\n⏳ Finalizing extraction...");
    states = [];

    // @ts-ignore - Demo script with complex LangGraph interrupt types
    for await (const state of await graph.stream(relateDecision, {
      ...config,
      interruptBefore: [],
    })) {
      states.push(state);
    }

    currentState = states[states.length - 1];

    // Display final results
    console.log("\n" + "=".repeat(60));
    console.log("🎉 EXTRACTION COMPLETE");
    console.log("=".repeat(60));

    if (currentState.reviewData) {
      console.log(`\n📊 Final Statistics:`);
      if (currentState.reviewData.stats) {
        Object.entries(currentState.reviewData.stats).forEach(
          ([key, value]) => {
            console.log(`   ${key}: ${value}`);
          }
        );
      }
    }

    console.log(`\n⏱️  Phase Timings:`);
    Object.entries(currentState.processingTime || {}).forEach(
      ([phase, time]) => {
        console.log(`   ${phase}: ${time}ms`);
      }
    );

    if (currentState.userActions && currentState.userActions.length > 0) {
      console.log(`\n👤 User Actions: ${currentState.userActions.length}`);
      currentState.userActions.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.phase}: ${action.action}`);
      });
    }

    if (currentState.errorLog && currentState.errorLog.length > 0) {
      console.log(`\n❌ Errors: ${currentState.errorLog.length}`);
      currentState.errorLog.forEach((error) => {
        console.log(`   ${error}`);
      });
    }

    console.log("\n✅ Test completed successfully!");
    console.log("\n💡 In a real application:");
    console.log("   1. User would see interactive UI at each review point");
    console.log("   2. User could merge duplicate entities");
    console.log("   3. User could correct field values");
    console.log("   4. User could validate relationships");
    console.log("   5. Session state persists via checkpointer");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
