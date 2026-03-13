import { describe, it, expect, beforeEach } from "vitest";

import { IconRegistry } from "../registry";
import type { IconDefinition } from "../types";

describe("IconRegistry", () => {
  let registry: IconRegistry;

  beforeEach(() => {
    registry = new IconRegistry();
  });

  describe("register", () => {
    it("should register a valid icon definition", () => {
      const definition: IconDefinition = {
        name: "check",
        library: "lucide",
        identifier: "Check",
        category: "status",
        themeBindings: { useThemeColor: true },
      };

      registry.register(definition);
      expect(registry.has("check")).toBe(true);
    });

    it("should register aliases", () => {
      const definition: IconDefinition = {
        name: "check",
        library: "lucide",
        identifier: "Check",
        aliases: ["checkmark", "tick", "success"],
        category: "status",
      };

      registry.register(definition);
      expect(registry.has("check")).toBe(true);
      expect(registry.has("checkmark")).toBe(true);
      expect(registry.has("tick")).toBe(true);
      expect(registry.has("success")).toBe(true);
    });

    it("should throw on invalid definition", () => {
      const invalid = {
        name: "test",
        library: "invalid-lib",
      };

      expect(() => registry.register(invalid as any)).toThrow();
    });
  });

  describe("get", () => {
    it("should retrieve icon by name", () => {
      const definition: IconDefinition = {
        name: "check",
        library: "lucide",
        identifier: "Check",
        category: "status",
      };

      registry.register(definition);
      const retrieved = registry.get("check");
      expect(retrieved).toEqual(definition);
    });

    it("should retrieve icon by alias", () => {
      const definition: IconDefinition = {
        name: "check",
        library: "lucide",
        identifier: "Check",
        aliases: ["tick"],
        category: "status",
      };

      registry.register(definition);
      const retrieved = registry.get("tick");
      expect(retrieved?.name).toBe("check");
    });

    it("should return undefined for non-existent icon", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("listByCategory", () => {
    it("should filter icons by category", () => {
      registry.register({
        name: "check",
        library: "lucide",
        identifier: "Check",
        category: "status",
      });
      registry.register({
        name: "arrow-left",
        library: "lucide",
        identifier: "ArrowLeft",
        category: "navigation",
      });
      registry.register({
        name: "alert",
        library: "lucide",
        identifier: "AlertTriangle",
        category: "status",
      });

      const statusIcons = registry.listByCategory("status");
      expect(statusIcons).toHaveLength(2);
      expect(statusIcons.map((i) => i.name)).toContain("check");
      expect(statusIcons.map((i) => i.name)).toContain("alert");
    });
  });

  describe("search", () => {
    beforeEach(() => {
      registry.register({
        name: "check",
        library: "lucide",
        identifier: "Check",
        aliases: ["checkmark"],
        description: "Success indicator",
        category: "status",
      });
      registry.register({
        name: "arrow-left",
        library: "lucide",
        identifier: "ArrowLeft",
        category: "navigation",
      });
    });

    it("should search by name", () => {
      const results = registry.search("check");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("check");
    });

    it("should search by alias", () => {
      const results = registry.search("checkmark");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("check");
    });

    it("should search by description", () => {
      const results = registry.search("success");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("check");
    });

    it("should be case insensitive", () => {
      const results = registry.search("CHECK");
      expect(results).toHaveLength(1);
    });
  });

  describe("getCategoryCounts", () => {
    it("should count icons per category", () => {
      registry.register({
        name: "check",
        library: "lucide",
        identifier: "Check",
        category: "status",
      });
      registry.register({
        name: "x",
        library: "lucide",
        identifier: "X",
        category: "status",
      });
      registry.register({
        name: "arrow",
        library: "lucide",
        identifier: "ArrowLeft",
        category: "navigation",
      });

      const counts = registry.getCategoryCounts();
      expect(counts.status).toBe(2);
      expect(counts.navigation).toBe(1);
    });
  });

  describe("registerMany", () => {
    it("should register multiple icons at once", () => {
      const definitions: IconDefinition[] = [
        {
          name: "check",
          library: "lucide",
          identifier: "Check",
          category: "status",
        },
        {
          name: "x",
          library: "lucide",
          identifier: "X",
          category: "status",
        },
      ];

      registry.registerMany(definitions);
      expect(registry.listNames()).toHaveLength(2);
    });
  });
});
