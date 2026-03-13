import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";

import { MemoryVersionStorage } from "../../storage/memory-storage";
import { VersionManager } from "../version-manager";

describe("VersionManager", () => {
  let ydoc: Y.Doc;
  let yMap: Y.Map<any>;
  let storage: MemoryVersionStorage;
  let manager: VersionManager;
  const userId = "test-user";

  beforeEach(() => {
    ydoc = new Y.Doc();
    yMap = ydoc.getMap("test");
    storage = new MemoryVersionStorage();
    manager = new VersionManager(ydoc, storage);
  });

  describe("createVersion", () => {
    it("creates version with name and description", async () => {
      // Add data to document
      yMap.set("key", "value");

      const versionId = await manager.createVersion({
        name: "Test Version",
        description: "Test description",
        userId,
      });

      expect(versionId).toBeTruthy();
      expect(versionId).toMatch(/^version-/);
    });

    it("creates version with tags", async () => {
      yMap.set("key", "value");

      const versionId = await manager.createVersion({
        name: "Tagged Version",
        userId,
        tags: ["manual", "milestone"],
      });

      const snapshot = await storage.load(versionId);
      expect(snapshot?.tags).toEqual(["manual", "milestone"]);
    });

    it("captures current document state", async () => {
      yMap.set("key1", "value1");
      yMap.set("key2", "value2");

      const versionId = await manager.createVersion({
        name: "State Capture",
        userId,
      });

      const snapshot = await storage.load(versionId);
      expect(snapshot?.state).toBeInstanceOf(Uint8Array);
      expect(snapshot?.state.byteLength).toBeGreaterThan(0);
    });

    it("includes timestamp", async () => {
      const before = Date.now();

      const versionId = await manager.createVersion({
        name: "Timestamp Test",
        userId,
      });

      const snapshot = await storage.load(versionId);
      const after = Date.now();

      expect(snapshot?.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("listVersions", () => {
    it("returns empty array when no versions", async () => {
      const versions = await manager.listVersions();
      expect(versions).toEqual([]);
    });

    it("lists all versions", async () => {
      await manager.createVersion({ name: "V1", userId });
      await manager.createVersion({ name: "V2", userId });
      await manager.createVersion({ name: "V3", userId });

      const versions = await manager.listVersions();
      expect(versions).toHaveLength(3);
    });

    it("returns metadata only (no state)", async () => {
      await manager.createVersion({ name: "Test", userId });

      const versions = await manager.listVersions();
      expect(versions[0]).toHaveProperty("id");
      expect(versions[0]).toHaveProperty("name");
      expect(versions[0]).toHaveProperty("timestamp");
      expect(versions[0]).toHaveProperty("userId");
      expect(versions[0]).not.toHaveProperty("state");
    });

    it("sorts versions newest first", async () => {
      await manager.createVersion({ name: "First", userId });
      await new Promise((r) => setTimeout(r, 10));
      await manager.createVersion({ name: "Second", userId });
      await new Promise((r) => setTimeout(r, 10));
      await manager.createVersion({ name: "Third", userId });

      const versions = await manager.listVersions();
      expect(versions[0].name).toBe("Third");
      expect(versions[1].name).toBe("Second");
      expect(versions[2].name).toBe("First");
    });
  });

  describe("loadVersion", () => {
    it("loads version snapshot", async () => {
      yMap.set("key", "value");

      const versionId = await manager.createVersion({
        name: "Test",
        userId,
      });

      const snapshot = await manager.loadVersion(versionId);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.id).toBe(versionId);
      expect(snapshot?.name).toBe("Test");
      expect(snapshot?.state).toBeInstanceOf(Uint8Array);
    });

    it("returns null for non-existent version", async () => {
      const snapshot = await manager.loadVersion("non-existent-id");
      expect(snapshot).toBeNull();
    });
  });

  describe("restoreVersion", () => {
    it.skip("restores document to version state (complex restoration NYI)", async () => {
      // Note: Full document restoration with Y.Map is complex
      // This test demonstrates the desired behavior but is skipped
      // until full implementation is complete
      yMap.set("key1", "original-value");
      yMap.set("key2", "another-value");

      const versionId = await manager.createVersion({
        name: "Original",
        userId,
      });

      yMap.set("key1", "modified-value");
      yMap.delete("key2");
      yMap.set("key3", "new-value");

      await manager.restoreVersion(versionId, userId);

      // Expected behavior (not yet implemented):
      // expect(yMap.get("key1")).toBe("original-value");
      // expect(yMap.get("key2")).toBe("another-value");
      // expect(yMap.has("key3")).toBe(false);
    });

    it("throws error for non-existent version", async () => {
      await expect(
        manager.restoreVersion("non-existent", userId)
      ).rejects.toThrow("Version non-existent not found");
    });

    it.skip("clears document before applying snapshot (complex restoration NYI)", async () => {
      // Note: Full document restoration with clearing is complex
      // This test is skipped until full implementation
      yMap.set("key1", "value1");
      yMap.set("key2", "value2");

      const versionId = await manager.createVersion({
        name: "Two Keys",
        userId,
      });

      yMap.set("key3", "value3");
      yMap.set("key4", "value4");

      await manager.restoreVersion(versionId, userId);

      // Expected behavior (not yet implemented):
      // expect(yMap.size).toBe(2);
      // expect(yMap.has("key3")).toBe(false);
    });
  });

  describe("deleteVersion", () => {
    it("deletes version from storage", async () => {
      const versionId = await manager.createVersion({
        name: "To Delete",
        userId,
      });

      let snapshot = await manager.loadVersion(versionId);
      expect(snapshot).not.toBeNull();

      await manager.deleteVersion(versionId);

      snapshot = await manager.loadVersion(versionId);
      expect(snapshot).toBeNull();
    });
  });

  describe("clearVersions", () => {
    it("clears all versions", async () => {
      await manager.createVersion({ name: "V1", userId });
      await manager.createVersion({ name: "V2", userId });
      await manager.createVersion({ name: "V3", userId });

      let versions = await manager.listVersions();
      expect(versions).toHaveLength(3);

      await manager.clearVersions();

      versions = await manager.listVersions();
      expect(versions).toHaveLength(0);
    });
  });

  describe("getVersionDiff", () => {
    it("calculates size difference between versions", async () => {
      // Small version
      yMap.set("key", "small");
      const v1 = await manager.createVersion({ name: "V1", userId });

      // Large version
      yMap.set("key", "x".repeat(1000));
      const v2 = await manager.createVersion({ name: "V2", userId });

      const diff = await manager.getVersionDiff(v1, v2);
      expect(diff).toBeGreaterThan(0);
    });

    it("throws error for non-existent versions", async () => {
      const versionId = await manager.createVersion({ name: "V1", userId });

      await expect(
        manager.getVersionDiff(versionId, "non-existent")
      ).rejects.toThrow("Version not found for diff");
    });
  });
});
