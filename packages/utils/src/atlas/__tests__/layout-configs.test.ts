import { describe, test, expect } from "vitest";

import { getLayoutConfig, type LayoutType } from "../layout-configs";

describe("getLayoutConfig", () => {
  test("returns breadthfirst layout configuration", () => {
    const config = getLayoutConfig("breadthfirst");

    expect(config.name).toBe("breadthfirst");
    expect(config.directed).toBe(false);
    expect(config.padding).toBe(40);
    expect(config.animate).toBe(true);
    expect(config.animationDuration).toBe(1000);
    expect(config.animationEasing).toBe("ease-out");
    expect(config.spacingFactor).toBe(2.0);
    expect(config.avoidOverlap).toBe(true);
    expect(config.nodeDimensionsIncludeLabels).toBe(false);
  });

  test("returns force layout configuration", () => {
    const config = getLayoutConfig("force");

    expect(config.name).toBe("cola");
    expect(config.animate).toBe(true);
    expect(config.animationDuration).toBe(1000);
    expect(config.maxSimulationTime).toBe(2000);
    expect(config.ungrabifyWhileSimulating).toBe(false);
    expect(config.nodeSpacing).toBe(60);
    expect(config.edgeLength).toBe(150);
    expect(config.convergenceThreshold).toBe(0.01);
    expect(config.handleDisconnected).toBe(true);
    expect(config.avoidOverlap).toBe(true);
  });

  test("returns atlas layout configuration", () => {
    const config = getLayoutConfig("atlas");

    expect(config.name).toBe("cise");
    expect(typeof config.clusters).toBe("function");
    expect(config.animate).toBe("end");
    expect(config.animationDuration).toBe(1000);
    expect(config.animationEasing).toBe("ease-out");
    expect(config.nodeRepulsion).toBe(3000);
    expect(config.idealEdgeLength).toBe(120);
    expect(config.edgeElasticity).toBe(0.45);
    expect(config.nodeSeparation).toBe(80);
    expect(config.allowNodesInsideCircle).toBe(false);
  });

  test("atlas layout clusters function works correctly", () => {
    const config = getLayoutConfig("atlas");
    const mockNode = {
      data: (key: string) => {
        if (key === "type") return "person";
        return undefined;
      },
    };

    expect(config.clusters(mockNode)).toBe("person");
  });

  test("returns grid layout for unknown layout types", () => {
    // @ts-expect-error - Testing invalid input
    const config = getLayoutConfig("unknown" as LayoutType);

    expect(config.name).toBe("grid");
    expect(config.animate).toBe(true);
    expect(config.animationDuration).toBe(1000);
  });

  test("all layouts have consistent animation properties", () => {
    const layouts: LayoutType[] = ["breadthfirst", "force", "atlas"];

    layouts.forEach((layoutType) => {
      const config = getLayoutConfig(layoutType);

      // All layouts should have consistent animation timing
      expect(config.animationDuration).toBe(1000);

      // All layouts should have some form of animation
      expect(
        config.animate === true ||
          config.animate === "end" ||
          config.animate === "during"
      ).toBe(true);
    });
  });

  test("layout configurations are immutable", () => {
    const config1 = getLayoutConfig("breadthfirst");
    const config2 = getLayoutConfig("breadthfirst");

    // Should return new objects each time
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });

  test("force layout has performance-optimized settings", () => {
    const config = getLayoutConfig("force");

    // Should have simulation limits to prevent infinite computation
    expect(config.maxSimulationTime).toBeGreaterThan(0);
    expect(config.convergenceThreshold).toBeGreaterThan(0);
    expect(config.convergenceThreshold).toBeLessThan(1);
  });

  test("atlas layout handles node clustering", () => {
    const config = getLayoutConfig("atlas");

    // Test clustering function with different node types
    const personNode = { data: () => "person" };
    const orgNode = { data: () => "organization" };

    expect(config.clusters(personNode)).toBe("person");
    expect(config.clusters(orgNode)).toBe("organization");
  });
});
