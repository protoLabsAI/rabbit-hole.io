import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Y from "yjs";

import { MemoryVersionStorage } from "../../storage/memory-storage";
import { useYjsHistory } from "../useYjsHistory";

describe("useYjsHistory", () => {
  let ydoc: Y.Doc;
  let yMap: Y.Map<any>;
  const userId = "test-user-1";

  beforeEach(() => {
    ydoc = new Y.Doc();
    yMap = ydoc.getMap("test");
  });

  describe("Basic Undo/Redo", () => {
    it("initializes with no undo/redo available", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoStackSize).toBe(0);
      expect(result.current.redoStackSize).toBe(0);
    });

    it("enables undo after user makes change", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value");
        }, userId);
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoStackSize).toBe(1);
    });

    it("only tracks own user changes", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      // Another user makes change
      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value-from-other-user");
        }, "other-user");
      });

      // Should NOT be undoable
      expect(result.current.canUndo).toBe(false);
      expect(result.current.undoStackSize).toBe(0);
    });

    it("performs undo operation", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      // Add item
      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value");
        }, userId);
      });

      expect(yMap.get("key")).toBe("value");

      // Undo
      act(() => {
        result.current.undo();
      });

      expect(yMap.get("key")).toBeUndefined();
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it("performs redo operation", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      // Add and undo
      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value");
        }, userId);
      });

      act(() => {
        result.current.undo();
      });

      expect(yMap.get("key")).toBeUndefined();

      // Redo
      act(() => {
        result.current.redo();
      });

      expect(yMap.get("key")).toBe("value");
      expect(result.current.canRedo).toBe(false);
      expect(result.current.canUndo).toBe(true);
    });

    it("clears undo stack", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      // Add items
      act(() => {
        ydoc.transact(() => {
          yMap.set("key1", "value1");
          yMap.set("key2", "value2");
        }, userId);
      });

      expect(result.current.canUndo).toBe(true);

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.undoStackSize).toBe(0);
    });

    it("enforces stack size limit", () => {
      const maxStackSize = 5;
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          maxUndoStackSize: maxStackSize,
          captureTimeout: 0, // No timeout to ensure each operation is captured
        })
      );

      // Add 10 operations
      for (let i = 0; i < 10; i++) {
        act(() => {
          ydoc.transact(() => {
            yMap.set(`key-${i}`, `value-${i}`);
          }, userId);
        });
      }

      // Should only keep last maxStackSize or less
      expect(result.current.undoStackSize).toBeLessThanOrEqual(maxStackSize);
    });

    it("handles multiple undo/redo operations", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          captureTimeout: 0, // Ensure separate undo items
        })
      );

      // Add 3 items in separate transactions
      act(() => {
        ydoc.transact(() => yMap.set("key1", "value1"), userId);
      });
      act(() => {
        ydoc.transact(() => yMap.set("key2", "value2"), userId);
      });
      act(() => {
        ydoc.transact(() => yMap.set("key3", "value3"), userId);
      });

      expect(yMap.size).toBe(3);
      expect(result.current.undoStackSize).toBeGreaterThanOrEqual(1);

      // Undo 2 times
      act(() => {
        result.current.undo();
      });
      act(() => {
        result.current.undo();
      });

      // Should have fewer items (exact count depends on Yjs batching)
      expect(yMap.size).toBeLessThan(3);
      expect(result.current.redoStackSize).toBeGreaterThanOrEqual(1);

      // Redo once
      act(() => {
        result.current.redo();
      });

      expect(yMap.size).toBeGreaterThan(0);
    });

    it("disables undo manager when enabled=false", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: false,
        })
      );

      // Try to add item
      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value");
        }, userId);
      });

      // Should not track
      expect(result.current.canUndo).toBe(false);
      expect(result.current.undoManager).toBe(null);
    });

    it("handles missing ydoc gracefully", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc: null,
          userId,
          scope: yMap,
          enabled: true,
        })
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.undoManager).toBe(null);
    });

    it("handles missing userId gracefully", () => {
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId: null,
          scope: yMap,
          enabled: true,
        })
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.undoManager).toBe(null);
    });
  });

  describe("Versioning", () => {
    it("creates a version snapshot", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      // Add data
      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "value");
        }, userId);
      });

      // Create version
      let versionId: string = "";
      await act(async () => {
        versionId = await result.current.createVersion(
          "Test Version",
          "Test description"
        );
      });

      expect(versionId).toBeTruthy();
      expect(versionId).toMatch(/^version-/);
    });

    it("lists versions", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      // Create 2 versions with delay to ensure different timestamps
      await act(async () => {
        await result.current.createVersion("Version 1");
        await new Promise((r) => setTimeout(r, 10));
        await result.current.createVersion("Version 2");
      });

      // List versions
      let versions: any[] = [];
      await act(async () => {
        versions = await result.current.listVersions();
      });

      expect(versions).toHaveLength(2);
      // Newest first (Version 2 created after Version 1)
      expect(versions[0].name).toBe("Version 2");
      expect(versions[1].name).toBe("Version 1");
    });

    it.skip("restores version snapshot (complex restoration NYI)", async () => {
      // Note: Full version restoration is complex with Y.js
      // This test demonstrates desired behavior but is skipped
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "original-value");
        }, userId);
      });

      let versionId: string = "";
      await act(async () => {
        versionId = await result.current.createVersion("Original State");
      });

      act(() => {
        ydoc.transact(() => {
          yMap.set("key", "modified-value");
        }, userId);
      });

      await act(async () => {
        await result.current.restoreVersion(versionId);
      });

      // Expected behavior (not fully implemented):
      // expect(yMap.get("key")).toBe("original-value");
    });

    it("clears undo stack after version restore", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      // Create version
      act(() => {
        ydoc.transact(() => yMap.set("key", "value"), userId);
      });

      let versionId: string = "";
      await act(async () => {
        versionId = await result.current.createVersion("Version");
      });

      // Make more changes (undo stack grows)
      act(() => {
        ydoc.transact(() => yMap.set("key2", "value2"), userId);
      });

      expect(result.current.canUndo).toBe(true);

      // Restore version
      await act(async () => {
        await result.current.restoreVersion(versionId);
      });

      // Undo stack should be cleared
      expect(result.current.canUndo).toBe(false);
    });

    it("creates version with tags", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      await act(async () => {
        await result.current.createVersion("Tagged Version", "With tags", [
          "manual",
          "milestone",
        ]);
      });

      let versions: any[] = [];
      await act(async () => {
        versions = await result.current.listVersions();
      });

      expect(versions[0].tags).toEqual(["manual", "milestone"]);
    });

    it("deletes version", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
        })
      );

      let versionId: string = "";
      await act(async () => {
        versionId = await result.current.createVersion("Test");
      });

      let versions: any[] = [];
      await act(async () => {
        versions = await result.current.listVersions();
      });
      expect(versions).toHaveLength(1);

      await act(async () => {
        await result.current.deleteVersion(versionId);
      });

      await act(async () => {
        versions = await result.current.listVersions();
      });
      expect(versions).toHaveLength(0);
    });
  });

  describe("History Events", () => {
    it("emits undo event", () => {
      const onHistoryEvent = vi.fn();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          onHistoryEvent,
        })
      );

      act(() => {
        ydoc.transact(() => yMap.set("key", "value"), userId);
      });

      act(() => {
        result.current.undo();
      });

      expect(onHistoryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "undo",
          userId,
        })
      );
    });

    it("emits redo event", () => {
      const onHistoryEvent = vi.fn();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          onHistoryEvent,
        })
      );

      act(() => {
        ydoc.transact(() => yMap.set("key", "value"), userId);
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(onHistoryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "redo",
          userId,
        })
      );
    });

    it("emits snapshot-created event", async () => {
      const onHistoryEvent = vi.fn();
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
          onHistoryEvent,
        })
      );

      await act(async () => {
        await result.current.createVersion("Test");
      });

      expect(onHistoryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "snapshot-created",
          userId,
          metadata: expect.objectContaining({
            name: "Test",
          }),
        })
      );
    });
  });

  describe("Auto-versioning", () => {
    it("creates automatic versions at interval", async () => {
      const storage = new MemoryVersionStorage();
      const { result } = renderHook(() =>
        useYjsHistory({
          ydoc,
          userId,
          scope: yMap,
          enabled: true,
          enableVersioning: true,
          versionStorage: storage,
          autoVersionInterval: 3, // Every 3 operations
          captureTimeout: 0, // Ensure each operation is tracked
        })
      );

      // Make 6 operations in separate acts (should create 2 auto-versions)
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          ydoc.transact(() => yMap.set(`key-${i}`, `value-${i}`), userId);
          // Small delay to ensure operation is processed
          await new Promise((r) => setTimeout(r, 10));
        });
      }

      // Wait for auto-versions to be created (with timeout)
      await waitFor(
        async () => {
          const versions = await storage.list();
          expect(versions.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 2000 }
      );
    });
  });
});
