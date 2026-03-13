/**
 * Tests for Y.Map-based Workspace Tab Helpers
 *
 * Comprehensive test coverage for Y.Map migration including:
 * - Data integrity during migration
 * - CRUD operations on tabs
 * - Edge cases and security concerns
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";

import type { WorkspaceTab } from "../../types/workspace";
import {
  isYMapWorkspace,
  markAsYMapWorkspace,
  getTabsFromYMap,
  getTabById,
  addTabToYMap,
  updateTabCanvasData,
  removeTabFromYMap,
  reorderTabsInYMap,
  tabExistsInYMap,
  migrateLegacyTabsToYMap,
  convertYMapToTab,
  convertTabToYMap,
} from "../useWorkspaceYMapHelpers";

describe.skip("useWorkspaceYMapHelpers", () => {
  let ydoc: Y.Doc;
  const testUserId = "test-user-123";

  beforeEach(() => {
    ydoc = new Y.Doc();
  });

  describe("Migration Detection", () => {
    it("should detect non-migrated workspace", () => {
      expect(isYMapWorkspace(ydoc)).toBe(false);
    });

    it("should mark workspace as Y.Map", () => {
      markAsYMapWorkspace(ydoc, testUserId);
      expect(isYMapWorkspace(ydoc)).toBe(true);

      const yWorkspace = ydoc.getMap("workspace");
      expect(yWorkspace.get("_usesYMap")).toBe(true);
      expect(yWorkspace.get("_yMapMigrationDate")).toBeDefined();
    });
  });

  describe("Legacy Migration", () => {
    it("should migrate tabs from Y.Array to Y.Map", () => {
      // Setup legacy Y.Array structure
      const yTabs = ydoc.getArray("tabs");
      const legacyTabs: WorkspaceTab[] = [
        {
          id: "tab-1",
          name: "Tab 1",
          type: "main",
          canvasType: "graph",
          canvasData: { graphData: { nodes: [{ id: "n1" }], edges: [] } },
          roomId: "room-1",
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: testUserId,
          },
        },
        {
          id: "tab-2",
          name: "Tab 2",
          type: "main",
          canvasType: "graph",
          canvasData: { graphData: { nodes: [], edges: [] } },
          roomId: "room-2",
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: testUserId,
          },
        },
      ];
      yTabs.push(legacyTabs);

      // Migrate
      const result = migrateLegacyTabsToYMap(ydoc, testUserId);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(2);

      // Verify Y.Map structure
      const yTabsMap = ydoc.getMap("tabs");
      const yTabOrder = ydoc.getArray("tabOrder");

      expect(yTabsMap.size).toBe(2);
      expect(yTabOrder.length).toBe(2);
      expect(yTabOrder.toArray()).toEqual(["tab-1", "tab-2"]);

      // Verify data integrity
      const migratedTabs = getTabsFromYMap(ydoc);
      expect(migratedTabs).toHaveLength(2);
      expect(migratedTabs[0].id).toBe("tab-1");
      expect(migratedTabs[0].canvasData.graphData.nodes).toHaveLength(1);
      expect(migratedTabs[1].id).toBe("tab-2");

      // Verify marked as migrated
      expect(isYMapWorkspace(ydoc)).toBe(true);

      // Verify legacy array is cleared
      expect(ydoc.getArray("tabs").length).toBe(0);
    });

    it("should not re-migrate already migrated workspace", () => {
      markAsYMapWorkspace(ydoc, testUserId);

      const result = migrateLegacyTabsToYMap(ydoc, testUserId);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
    });

    it("should handle empty workspace migration", () => {
      const result = migrateLegacyTabsToYMap(ydoc, testUserId);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(isYMapWorkspace(ydoc)).toBe(true);
    });
  });

  describe("CRUD Operations", () => {
    beforeEach(() => {
      markAsYMapWorkspace(ydoc, testUserId);
    });

    it("should add tab to Y.Map", () => {
      const newTab: WorkspaceTab = {
        id: "tab-1",
        name: "New Tab",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, newTab, testUserId);

      const tabs = getTabsFromYMap(ydoc);
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe("tab-1");
      expect(tabs[0].name).toBe("New Tab");

      expect(tabExistsInYMap(ydoc, "tab-1")).toBe(true);
    });

    it("should get tab by ID", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Test Tab",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [{ id: "n1" }], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);

      const retrieved = getTabById(ydoc, "tab-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("tab-1");
      expect(retrieved?.canvasData.graphData.nodes).toHaveLength(1);
    });

    it("should update canvas data", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Test Tab",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);

      const newCanvasData = {
        graphData: {
          nodes: [{ id: "n1", type: "person", label: "Alice" }],
          edges: [],
        },
      };

      updateTabCanvasData(ydoc, "tab-1", newCanvasData, testUserId);

      const updated = getTabById(ydoc, "tab-1");
      expect(updated?.canvasData.graphData.nodes).toHaveLength(1);
      expect(updated?.canvasData.graphData.nodes[0].label).toBe("Alice");
      expect(updated?.metadata.updatedAt).toBeGreaterThan(
        tab.metadata.updatedAt
      );
    });

    it("should remove tab", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Test Tab",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);
      expect(tabExistsInYMap(ydoc, "tab-1")).toBe(true);

      removeTabFromYMap(ydoc, "tab-1", testUserId);

      expect(tabExistsInYMap(ydoc, "tab-1")).toBe(false);
      expect(getTabsFromYMap(ydoc)).toHaveLength(0);
    });

    it("should reorder tabs", () => {
      const tab1: WorkspaceTab = {
        id: "tab-1",
        name: "Tab 1",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      const tab2: WorkspaceTab = {
        id: "tab-2",
        name: "Tab 2",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-2",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      const tab3: WorkspaceTab = {
        id: "tab-3",
        name: "Tab 3",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-3",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab1, testUserId);
      addTabToYMap(ydoc, tab2, testUserId);
      addTabToYMap(ydoc, tab3, testUserId);

      // Reorder: move index 0 to index 2
      reorderTabsInYMap(ydoc, 0, 2, testUserId);

      const tabs = getTabsFromYMap(ydoc);
      expect(tabs[0].id).toBe("tab-2");
      expect(tabs[1].id).toBe("tab-3");
      expect(tabs[2].id).toBe("tab-1");
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      markAsYMapWorkspace(ydoc, testUserId);
    });

    it("should handle getting non-existent tab", () => {
      const tab = getTabById(ydoc, "non-existent");
      expect(tab).toBeNull();
    });

    it("should handle updating non-existent tab", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      updateTabCanvasData(ydoc, "non-existent", {}, testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found in Y.Map")
      );

      consoleSpy.mockRestore();
    });

    it("should handle removing non-existent tab", () => {
      // Should not throw
      expect(() => {
        removeTabFromYMap(ydoc, "non-existent", testUserId);
      }).not.toThrow();
    });

    it("should handle invalid reorder indices", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Tab 1",
        type: "main",
        canvasType: "graph",
        canvasData: { graphData: { nodes: [], edges: [] } },
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Invalid indices
      reorderTabsInYMap(ydoc, -1, 0, testUserId);
      reorderTabsInYMap(ydoc, 0, 10, testUserId);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should preserve tab order across multiple operations", () => {
      const tabs: WorkspaceTab[] = [
        {
          id: "a",
          name: "A",
          type: "main",
          canvasType: "graph",
          canvasData: {},
          roomId: "1",
          metadata: { createdAt: 1, updatedAt: 1, createdBy: testUserId },
        },
        {
          id: "b",
          name: "B",
          type: "main",
          canvasType: "graph",
          canvasData: {},
          roomId: "2",
          metadata: { createdAt: 1, updatedAt: 1, createdBy: testUserId },
        },
        {
          id: "c",
          name: "C",
          type: "main",
          canvasType: "graph",
          canvasData: {},
          roomId: "3",
          metadata: { createdAt: 1, updatedAt: 1, createdBy: testUserId },
        },
      ];

      tabs.forEach((tab) => addTabToYMap(ydoc, tab, testUserId));

      removeTabFromYMap(ydoc, "b", testUserId);

      const remaining = getTabsFromYMap(ydoc);
      expect(remaining.map((t) => t.id)).toEqual(["a", "c"]);
    });
  });

  describe("Data Integrity", () => {
    beforeEach(() => {
      markAsYMapWorkspace(ydoc, testUserId);
    });

    it("should preserve complex canvas data", () => {
      const complexData = {
        graphData: {
          nodes: [
            {
              id: "n1",
              type: "person",
              label: "Alice",
              x: 100,
              y: 200,
              properties: { age: 30 },
            },
            {
              id: "n2",
              type: "organization",
              label: "ACME",
              x: 300,
              y: 200,
              properties: { founded: 2010 },
            },
          ],
          edges: [
            {
              id: "e1",
              source: "n1",
              target: "n2",
              label: "works_at",
              properties: { since: 2020 },
            },
          ],
        },
        viewport: { x: 0, y: 0, zoom: 1.5 },
        selectedNodes: ["n1"],
        customSettings: { theme: "dark", layout: "force" },
      };

      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Complex Tab",
        type: "main",
        canvasType: "graph",
        canvasData: complexData,
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);

      const retrieved = getTabById(ydoc, "tab-1");
      expect(retrieved?.canvasData).toEqual(complexData);
      expect(retrieved?.canvasData.graphData.nodes[0].properties.age).toBe(30);
      expect(retrieved?.canvasData.customSettings.theme).toBe("dark");
    });

    it("should handle nested Y.Map conversion", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Test",
        type: "main",
        canvasType: "graph",
        canvasData: {},
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      const yMap = convertTabToYMap(tab);
      expect(yMap instanceof Y.Map).toBe(true);

      const converted = convertYMapToTab(yMap);
      expect(converted.id).toBe("tab-1");
      expect(converted.name).toBe("Test");
      expect(converted.type).toBe("main");
    });
  });

  describe("Security & Concurrency", () => {
    beforeEach(() => {
      markAsYMapWorkspace(ydoc, testUserId);
    });

    it("should handle concurrent tab additions", () => {
      const tab1: WorkspaceTab = {
        id: "tab-1",
        name: "Tab 1",
        type: "main",
        canvasType: "graph",
        canvasData: {},
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      const tab2: WorkspaceTab = {
        id: "tab-2",
        name: "Tab 2",
        type: "main",
        canvasType: "graph",
        canvasData: {},
        roomId: "room-2",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      // Simulate concurrent additions (would happen via Yjs CRDT in real scenario)
      addTabToYMap(ydoc, tab1, testUserId);
      addTabToYMap(ydoc, tab2, "other-user");

      const tabs = getTabsFromYMap(ydoc);
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.id).sort()).toEqual(["tab-1", "tab-2"]);
    });

    it("should not allow duplicate tab IDs", () => {
      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Tab 1",
        type: "main",
        canvasType: "graph",
        canvasData: {},
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: testUserId,
        },
      };

      addTabToYMap(ydoc, tab, testUserId);
      addTabToYMap(ydoc, { ...tab, name: "Duplicate" }, testUserId);

      const tabs = getTabsFromYMap(ydoc);
      // Y.Map will overwrite duplicate keys
      expect(tabs).toHaveLength(1);
      expect(tabs[0].name).toBe("Duplicate");
    });

    it("should maintain transaction origins", () => {
      let lastOrigin: any = null;

      const yTabsMap = ydoc.getMap("tabs");
      yTabsMap.observeDeep((events, transaction) => {
        lastOrigin = transaction.origin;
      });

      const tab: WorkspaceTab = {
        id: "tab-1",
        name: "Test",
        type: "main",
        canvasType: "graph",
        canvasData: {},
        roomId: "room-1",
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: "custom-user",
        },
      };

      addTabToYMap(ydoc, tab, "custom-user");

      expect(lastOrigin).toBe("custom-user");
    });
  });
});
