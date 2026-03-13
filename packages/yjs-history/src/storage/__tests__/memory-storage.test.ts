import { describe, it, expect, beforeEach } from "vitest";

import type { VersionSnapshot } from "../../types";
import { MemoryVersionStorage } from "../memory-storage";

describe("MemoryVersionStorage", () => {
  let storage: MemoryVersionStorage;

  beforeEach(() => {
    storage = new MemoryVersionStorage();
  });

  const createMockSnapshot = (id: string, name: string): VersionSnapshot => ({
    id,
    name,
    description: `Description for ${name}`,
    timestamp: Date.now(),
    userId: "test-user",
    state: new Uint8Array([1, 2, 3, 4, 5]),
    tags: ["test"],
  });

  describe("save", () => {
    it("saves a version snapshot", async () => {
      const snapshot = createMockSnapshot("v1", "Version 1");
      await storage.save(snapshot);

      const loaded = await storage.load("v1");
      expect(loaded).toEqual(snapshot);
    });

    it("overwrites existing version with same ID", async () => {
      const snapshot1 = createMockSnapshot("v1", "Version 1");
      const snapshot2 = { ...snapshot1, name: "Updated Version 1" };

      await storage.save(snapshot1);
      await storage.save(snapshot2);

      const loaded = await storage.load("v1");
      expect(loaded?.name).toBe("Updated Version 1");
    });
  });

  describe("load", () => {
    it("loads existing version", async () => {
      const snapshot = createMockSnapshot("v1", "Version 1");
      await storage.save(snapshot);

      const loaded = await storage.load("v1");
      expect(loaded).toEqual(snapshot);
    });

    it("returns null for non-existent version", async () => {
      const loaded = await storage.load("non-existent");
      expect(loaded).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no versions", async () => {
      const list = await storage.list();
      expect(list).toEqual([]);
    });

    it("lists all versions", async () => {
      await storage.save(createMockSnapshot("v1", "Version 1"));
      await storage.save(createMockSnapshot("v2", "Version 2"));
      await storage.save(createMockSnapshot("v3", "Version 3"));

      const list = await storage.list();
      expect(list).toHaveLength(3);
    });

    it("returns metadata without state", async () => {
      const snapshot = createMockSnapshot("v1", "Version 1");
      await storage.save(snapshot);

      const list = await storage.list();
      expect(list[0]).toHaveProperty("id");
      expect(list[0]).toHaveProperty("name");
      expect(list[0]).toHaveProperty("timestamp");
      expect(list[0]).toHaveProperty("userId");
      expect(list[0]).not.toHaveProperty("state");
    });

    it("sorts versions newest first", async () => {
      const old = createMockSnapshot("v1", "Old");
      old.timestamp = Date.now() - 1000;

      const middle = createMockSnapshot("v2", "Middle");
      middle.timestamp = Date.now() - 500;

      const recent = createMockSnapshot("v3", "Recent");
      recent.timestamp = Date.now();

      await storage.save(old);
      await storage.save(middle);
      await storage.save(recent);

      const list = await storage.list();
      expect(list[0].name).toBe("Recent");
      expect(list[1].name).toBe("Middle");
      expect(list[2].name).toBe("Old");
    });
  });

  describe("delete", () => {
    it("deletes existing version", async () => {
      const snapshot = createMockSnapshot("v1", "Version 1");
      await storage.save(snapshot);

      let loaded = await storage.load("v1");
      expect(loaded).not.toBeNull();

      await storage.delete("v1");

      loaded = await storage.load("v1");
      expect(loaded).toBeNull();
    });

    it("does nothing for non-existent version", async () => {
      await expect(storage.delete("non-existent")).resolves.not.toThrow();
    });
  });

  describe("clear", () => {
    it("clears all versions", async () => {
      await storage.save(createMockSnapshot("v1", "Version 1"));
      await storage.save(createMockSnapshot("v2", "Version 2"));
      await storage.save(createMockSnapshot("v3", "Version 3"));

      let list = await storage.list();
      expect(list).toHaveLength(3);

      await storage.clear();

      list = await storage.list();
      expect(list).toHaveLength(0);
    });

    it("works when already empty", async () => {
      await expect(storage.clear()).resolves.not.toThrow();
    });
  });
});
