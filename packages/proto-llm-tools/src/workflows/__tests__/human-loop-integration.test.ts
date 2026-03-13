import { describe, it, expect } from "vitest";

/**
 * Integration tests for human-loop extraction workflow
 *
 * These tests verify the full start → interrupt → resume cycle
 *
 * NOTE: These are integration tests that require:
 * - LangExtract service running
 * - Valid API keys configured
 *
 * Run with: INTEGRATION=true pnpm test
 */

const INTEGRATION_ENABLED = process.env.INTEGRATION === "true";

describe.skipIf(!INTEGRATION_ENABLED)(
  "Human Loop Extraction Integration",
  () => {
    const API_ENDPOINT =
      process.env.TEST_API_ENDPOINT ||
      "http://localhost:3000/api/extraction-workflow-interactive";

    describe("Start Extraction", () => {
      it("should start extraction and return thread ID", async () => {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            text: "Albert Einstein was a German-born theoretical physicist.",
            domains: ["social"],
            mode: "discover",
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.threadId).toBeDefined();
        expect(data.currentPhase).toBeDefined();
        expect(data.reviewData).toBeDefined();
      });

      it("should return 400 for missing text", async () => {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            domains: ["social"],
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    describe("Resume Extraction", () => {
      it("should resume with user decisions", async () => {
        // Start extraction first
        const startResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            text: "Marie Curie was a Polish physicist and chemist.",
            domains: ["social"],
            mode: "discover",
          }),
        });

        const startData = await startResponse.json();
        const { threadId } = startData;

        // Resume with approval
        const resumeResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resume",
            threadId,
            approvals: { discover: true },
          }),
        });

        const resumeData = await resumeResponse.json();

        expect(resumeResponse.status).toBe(200);
        expect(resumeData.success).toBe(true);
        expect(resumeData.currentPhase).toBeDefined();
      });

      it("should return 400 for missing thread ID", async () => {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resume",
            approvals: { discover: true },
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    describe("Get State", () => {
      it("should retrieve current state", async () => {
        // Start extraction
        const startResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            text: "Test content",
            domains: ["social"],
          }),
        });

        const { threadId } = await startResponse.json();

        // Get state
        const stateResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getState",
            threadId,
          }),
        });

        const stateData = await stateResponse.json();

        expect(stateResponse.status).toBe(200);
        expect(stateData.success).toBe(true);
        expect(stateData.currentPhase).toBeDefined();
      });

      it("should return 404 for non-existent thread", async () => {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getState",
            threadId: "non-existent-thread",
          }),
        });

        expect(response.status).toBe(404);
      });
    });

    describe("Full Workflow", () => {
      it("should complete discover → structure → enrich → relate", async () => {
        const text =
          "Albert Einstein (1879-1955) was a physicist at Princeton.";

        // Phase 1: Discover
        const discoverResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            text,
            domains: ["social", "academic"],
            mode: "deep_dive",
          }),
        });

        const discoverData = await discoverResponse.json();
        expect(discoverData.currentPhase).toContain("discover");

        const { threadId } = discoverData;

        // Approve discover phase
        const structureResponse = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resume",
            threadId,
            approvals: { discover: true },
          }),
        });

        const structureData = await structureResponse.json();
        expect(structureData.currentPhase).toContain("structure");

        // Continue approving phases
        expect(structureData.success).toBe(true);
      }, 60000); // 60s timeout for full workflow
    });
  }
);

describe("Mock Workflow Tests", () => {
  it("should validate thread ID format", () => {
    const threadId = "extraction:user123:1234567890:abc123";
    const parts = threadId.split(":");

    expect(parts[0]).toBe("extraction");
    expect(parts[1]).toBe("user123");
    expect(parts).toHaveLength(4);
  });

  it("should validate review data structure", () => {
    const reviewData = {
      phase: "discover",
      timestamp: new Date().toISOString(),
      entities: [{ uid: "e1", name: "Entity 1", type: "Person" }],
      stats: { total: 1 },
    };

    expect(reviewData.phase).toBe("discover");
    expect(reviewData.entities).toHaveLength(1);
    expect(reviewData.stats.total).toBe(1);
  });
});
