import { describe, it, expect, beforeEach } from "vitest";

import type { MenuConfig } from "../core/types";
import { contextMenuRegistry } from "../registry";

describe("Context Menu Registry", () => {
  beforeEach(() => {
    contextMenuRegistry.clear();
  });

  it("should register and retrieve menu config for exact route", () => {
    const menuConfig: MenuConfig = [
      {
        id: "test-item",
        label: "Test Item",
        action: () => {},
      },
    ];

    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: menuConfig,
    });

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {});
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe("test-item");
  });

  it("should register and retrieve wildcard menu config", () => {
    const menuConfig: MenuConfig = [
      {
        id: "wildcard-item",
        label: "Wildcard Item",
        action: () => {},
      },
    ];

    contextMenuRegistry.register({
      contextType: "node",
      menu: menuConfig,
    });

    const retrieved = contextMenuRegistry.getMenuConfig(
      "node",
      "/any-route",
      {}
    );
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe("wildcard-item");
  });

  it("should prioritize exact routes over wildcards", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      priority: 10,
      menu: [
        {
          id: "exact-item",
          label: "Exact Route Item",
          action: () => {},
        },
      ],
    });

    contextMenuRegistry.register({
      contextType: "node",
      priority: 5,
      menu: [
        {
          id: "wildcard-item",
          label: "Wildcard Item",
          action: () => {},
        },
      ],
    });

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {});

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].id).toBe("exact-item");
    expect(retrieved[1].id).toBe("wildcard-item");
  });

  it("should support regex route patterns", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: /^\/atlas\/.+/,
      menu: [
        {
          id: "regex-item",
          label: "Regex Item",
          action: () => {},
        },
      ],
    });

    const retrieved1 = contextMenuRegistry.getMenuConfig(
      "node",
      "/atlas/123",
      {}
    );
    expect(retrieved1).toHaveLength(1);
    expect(retrieved1[0].id).toBe("regex-item");

    const retrieved2 = contextMenuRegistry.getMenuConfig(
      "node",
      "/atlas/abc",
      {}
    );
    expect(retrieved2).toHaveLength(1);

    const retrieved3 = contextMenuRegistry.getMenuConfig(
      "node",
      "/research",
      {}
    );
    expect(retrieved3).toHaveLength(0);
  });

  it("should support dynamic menu configs via function", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: (context) => [
        {
          id: "dynamic-item",
          label: `Edit ${context.name}`,
          action: () => {},
        },
      ],
    });

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {
      name: "TestNode",
    });

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].label).toBe("Edit TestNode");
  });

  it("should sort registrations by priority", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      priority: 5,
      menu: [{ id: "low", label: "Low Priority", action: () => {} }],
    });

    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      priority: 10,
      menu: [{ id: "high", label: "High Priority", action: () => {} }],
    });

    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      priority: 7,
      menu: [{ id: "medium", label: "Medium Priority", action: () => {} }],
    });

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {});

    expect(retrieved.map((item) => item.id)).toEqual(["high", "medium", "low"]);
  });

  it("should extend existing menus", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: [{ id: "base-item", label: "Base Item", action: () => {} }],
    });

    contextMenuRegistry.extend(
      "node",
      [{ id: "extended-item", label: "Extended Item", action: () => {} }],
      "/atlas",
      20
    );

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {});

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].id).toBe("extended-item");
    expect(retrieved[1].id).toBe("base-item");
  });

  it("should handle multiple context types independently", () => {
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: [{ id: "node-item", label: "Node Item", action: () => {} }],
    });

    contextMenuRegistry.register({
      contextType: "edge",
      route: "/atlas",
      menu: [{ id: "edge-item", label: "Edge Item", action: () => {} }],
    });

    const nodeMenu = contextMenuRegistry.getMenuConfig("node", "/atlas", {});
    const edgeMenu = contextMenuRegistry.getMenuConfig("edge", "/atlas", {});

    expect(nodeMenu).toHaveLength(1);
    expect(nodeMenu[0].id).toBe("node-item");

    expect(edgeMenu).toHaveLength(1);
    expect(edgeMenu[0].id).toBe("edge-item");
  });

  it("should deduplicate items with same ID (HMR protection)", () => {
    // Simulate HMR causing duplicate registrations
    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: [
        { id: "show-details", label: "Show Details", action: () => {} },
        { id: "edit-node", label: "Edit Node", action: () => {} },
      ],
    });

    contextMenuRegistry.register({
      contextType: "node",
      route: "/atlas",
      menu: [
        { id: "show-details", label: "Show Details", action: () => {} },
        { id: "delete-node", label: "Delete Node", action: () => {} },
      ],
    });

    const retrieved = contextMenuRegistry.getMenuConfig("node", "/atlas", {});

    // Should only have 3 items, not 4 (show-details deduplicated)
    expect(retrieved).toHaveLength(3);
    expect(retrieved.map((item) => item.id)).toEqual([
      "show-details",
      "edit-node",
      "delete-node",
    ]);
  });
});
