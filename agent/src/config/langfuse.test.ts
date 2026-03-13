/**
 * Langfuse Handler Factory Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  createLangfuseHandler,
  isLangfuseEnabled,
  forceEnableLangfuse,
} from "./langfuse";

describe("Langfuse Handler Factory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    forceEnableLangfuse();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createLangfuseHandler", () => {
    it("should return undefined when SECRET_KEY is missing", () => {
      delete process.env.LANGFUSE_SECRET_KEY;
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";

      const handler = createLangfuseHandler({
        agentName: "test-agent",
        userId: "user-123",
      });

      expect(handler).toBeUndefined();
      expect(isLangfuseEnabled()).toBe(false);
    });

    it("should return undefined when PUBLIC_KEY is missing", () => {
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      delete process.env.LANGFUSE_PUBLIC_KEY;

      const handler = createLangfuseHandler({
        agentName: "test-agent",
        userId: "user-123",
      });

      expect(handler).toBeUndefined();
      expect(isLangfuseEnabled()).toBe(false);
    });

    it("should return undefined when both keys are missing", () => {
      delete process.env.LANGFUSE_SECRET_KEY;
      delete process.env.LANGFUSE_PUBLIC_KEY;

      const handler = createLangfuseHandler({
        agentName: "test-agent",
      });

      expect(handler).toBeUndefined();
      expect(isLangfuseEnabled()).toBe(false);
    });
  });

  describe("isLangfuseEnabled", () => {
    it("should return false when not configured", () => {
      delete process.env.LANGFUSE_SECRET_KEY;
      delete process.env.LANGFUSE_PUBLIC_KEY;

      // Trigger check
      createLangfuseHandler({ agentName: "test" });

      expect(isLangfuseEnabled()).toBe(false);
    });

    it("should return true when keys are configured", () => {
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";

      // Force enable since keys exist (even if invalid)
      forceEnableLangfuse();

      expect(isLangfuseEnabled()).toBe(true);
    });
  });

  describe("forceEnableLangfuse", () => {
    it("should enable Langfuse after being disabled", () => {
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";

      // Disable first
      delete process.env.LANGFUSE_SECRET_KEY;
      createLangfuseHandler({ agentName: "test" });
      expect(isLangfuseEnabled()).toBe(false);

      // Re-enable
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      forceEnableLangfuse();
      expect(isLangfuseEnabled()).toBe(true);
    });
  });
});
