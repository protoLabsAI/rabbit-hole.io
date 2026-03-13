/**
 * Workspace Usage Counting Tests
 */

import { describe, it, expect } from "vitest";
import * as Y from "yjs";

import {
  countWorkspaceEntities,
  countTabEntities,
  wouldExceedLimit,
} from "../index";

describe("countWorkspaceEntities", () => {
  it("counts entities across multiple graph tabs", () => {
    const ydoc = new Y.Doc();
    const yTabs = ydoc.getArray("tabs");

    yTabs.push([
      {
        id: "tab1",
        canvasType: "graph",
        canvasData: { nodes: Array(20).fill({}), edges: Array(15).fill({}) },
      },
      {
        id: "tab2",
        canvasType: "graph",
        canvasData: { nodes: Array(30).fill({}), edges: Array(40).fill({}) },
      },
    ]);

    const usage = countWorkspaceEntities(ydoc);

    expect(usage.totalEntities).toBe(50);
    expect(usage.totalRelationships).toBe(55);
    expect(usage.tabCount).toBe(2);
  });

  it("handles different canvas types", () => {
    const ydoc = new Y.Doc();
    const yTabs = ydoc.getArray("tabs");

    yTabs.push([
      {
        id: "tab1",
        canvasType: "graph",
        canvasData: { nodes: Array(10).fill({}) },
      },
      {
        id: "tab2",
        canvasType: "map",
        canvasData: { markers: Array(5).fill({}) },
      },
      {
        id: "tab3",
        canvasType: "timeline",
        canvasData: { events: Array(15).fill({}) },
      },
    ]);

    const usage = countWorkspaceEntities(ydoc);
    expect(usage.totalEntities).toBe(30);
  });

  it("handles empty workspace", () => {
    const ydoc = new Y.Doc();
    ydoc.getArray("tabs"); // Initialize but don't add tabs

    const usage = countWorkspaceEntities(ydoc);

    expect(usage.totalEntities).toBe(0);
    expect(usage.totalRelationships).toBe(0);
    expect(usage.tabCount).toBe(0);
  });
});

describe("countTabEntities", () => {
  it("counts graph canvas correctly", () => {
    const tab = {
      id: "tab1",
      canvasType: "graph",
      canvasData: {
        nodes: Array(10).fill({}),
        edges: Array(5).fill({}),
      },
    };

    const usage = countTabEntities(tab);

    expect(usage.entities).toBe(10);
    expect(usage.relationships).toBe(5);
    expect(usage.canvasType).toBe("graph");
  });

  it("counts map canvas correctly", () => {
    const tab = {
      id: "tab1",
      canvasType: "map",
      canvasData: {
        markers: Array(8).fill({}),
        routes: Array(3).fill({}),
      },
    };

    const usage = countTabEntities(tab);

    expect(usage.entities).toBe(11); // markers + routes
    expect(usage.relationships).toBe(0);
  });

  it("counts timeline canvas correctly", () => {
    const tab = {
      id: "tab1",
      canvasType: "timeline",
      canvasData: {
        events: Array(20).fill({}),
        connections: Array(10).fill({}),
      },
    };

    const usage = countTabEntities(tab);

    expect(usage.entities).toBe(20);
    expect(usage.relationships).toBe(10);
  });

  it("handles missing canvasData", () => {
    const tab = {
      id: "tab1",
      canvasType: "graph",
      canvasData: null,
    };

    const usage = countTabEntities(tab);

    expect(usage.entities).toBe(0);
    expect(usage.relationships).toBe(0);
  });

  it("handles unknown canvas type", () => {
    const tab = {
      id: "tab1",
      canvasType: "unknown",
      canvasData: { some: "data" },
    };

    const usage = countTabEntities(tab);

    expect(usage.entities).toBe(0);
    expect(usage.canvasType).toBe("unknown");
  });
});

describe("wouldExceedLimit", () => {
  it("detects entity limit exceeded", () => {
    const currentUsage = {
      totalEntities: 45,
      totalRelationships: 30,
      totalStorageBytes: 1000,
      usageByTab: {},
      tabCount: 1,
    };

    const result = wouldExceedLimit(currentUsage, 10, 5, {
      maxEntities: 50,
      maxRelationships: 100,
    });

    expect(result.entities).toBe(true);
    expect(result.entityOverflow).toBe(5);
    expect(result.relationships).toBe(false);
  });

  it("detects relationship limit exceeded", () => {
    const currentUsage = {
      totalEntities: 20,
      totalRelationships: 95,
      totalStorageBytes: 1000,
      usageByTab: {},
      tabCount: 1,
    };

    const result = wouldExceedLimit(currentUsage, 5, 10, {
      maxEntities: 50,
      maxRelationships: 100,
    });

    expect(result.entities).toBe(false);
    expect(result.relationships).toBe(true);
    expect(result.relationshipOverflow).toBe(5);
  });

  it("allows unlimited tier", () => {
    const currentUsage = {
      totalEntities: 1000000,
      totalRelationships: 1000000,
      totalStorageBytes: 1000,
      usageByTab: {},
      tabCount: 1,
    };

    const result = wouldExceedLimit(currentUsage, 1000000, 1000000, {
      maxEntities: -1,
      maxRelationships: -1,
    });

    expect(result.entities).toBe(false);
    expect(result.relationships).toBe(false);
  });

  it("allows addition within limits", () => {
    const currentUsage = {
      totalEntities: 30,
      totalRelationships: 50,
      totalStorageBytes: 1000,
      usageByTab: {},
      tabCount: 1,
    };

    const result = wouldExceedLimit(currentUsage, 10, 20, {
      maxEntities: 50,
      maxRelationships: 100,
    });

    expect(result.entities).toBe(false);
    expect(result.relationships).toBe(false);
  });
});
