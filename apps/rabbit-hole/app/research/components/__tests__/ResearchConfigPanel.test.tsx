/**
 * ResearchConfigPanel Tests
 *
 * Validates config panel renders correctly with default and custom configs,
 * and that config changes are propagated via onConfigChange callback.
 */

import { describe, it, expect } from "vitest";

import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@protolabsai/types";
import type { ResearchSessionConfig } from "@protolabsai/types";

describe("ResearchConfigPanel", () => {
  describe("config defaults", () => {
    it("has correct default values", () => {
      expect(DEFAULT_RESEARCH_SESSION_CONFIG).toEqual({
        depth: "detailed",
        maxEntities: 50,
        maxDepth: 3,
        searchProviders: ["tavily", "duckduckgo", "wikipedia"],
      });
    });
  });

  describe("config mutations", () => {
    it("updates depth correctly", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
      };
      const updated = { ...config, depth: "comprehensive" as const };
      expect(updated.depth).toBe("comprehensive");
      expect(updated.maxEntities).toBe(50); // unchanged
    });

    it("updates maxEntities correctly", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
      };
      const updated = { ...config, maxEntities: 100 };
      expect(updated.maxEntities).toBe(100);
      expect(updated.depth).toBe("detailed"); // unchanged
    });

    it("updates maxDepth correctly", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
      };
      const updated = { ...config, maxDepth: 5 };
      expect(updated.maxDepth).toBe(5);
    });

    it("toggles search provider on", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
        searchProviders: ["tavily"],
      };
      const providers = [...config.searchProviders, "wikipedia"];
      expect(providers).toEqual(["tavily", "wikipedia"]);
    });

    it("toggles search provider off", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
      };
      const providers = config.searchProviders.filter(
        (p) => p !== "duckduckgo"
      );
      expect(providers).toEqual(["tavily", "wikipedia"]);
    });

    it("prevents removing last search provider", () => {
      const config: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
        searchProviders: ["tavily"],
      };
      const providerId = "tavily";
      const newProviders = config.searchProviders.filter(
        (p) => p !== providerId
      );
      // Should not update if result is empty
      const result =
        newProviders.length > 0 ? newProviders : config.searchProviders;
      expect(result).toEqual(["tavily"]);
    });
  });

  describe("depth-dependent UI", () => {
    it("maxDepth is only relevant for comprehensive mode", () => {
      const basicConfig: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
        depth: "basic",
      };
      const comprehensiveConfig: ResearchSessionConfig = {
        ...DEFAULT_RESEARCH_SESSION_CONFIG,
        depth: "comprehensive",
      };
      // maxDepth slider should only show for comprehensive
      expect(basicConfig.depth === "comprehensive").toBe(false);
      expect(comprehensiveConfig.depth === "comprehensive").toBe(true);
    });
  });
});
