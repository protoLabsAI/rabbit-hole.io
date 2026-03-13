import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";

import { useYjsUndo } from "../useYjsUndo";

describe.skip("useYjsUndo", () => {
  let ydoc: Y.Doc;
  let yArray: Y.Array<any>;
  const userId = "test-user-1";

  beforeEach(() => {
    ydoc = new Y.Doc();
    yArray = ydoc.getArray("test");
  });

  it("initializes with no undo/redo available", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.stackSize).toBe(0);
    expect(result.current.redoStackSize).toBe(0);
  });

  it("enables undo after user makes change", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    act(() => {
      ydoc.transact(() => {
        yArray.push(["item-1"]);
      }, userId);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.stackSize).toBe(1);
  });

  it("only tracks own user changes", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    // Another user makes change
    act(() => {
      ydoc.transact(() => {
        yArray.push(["item-from-other-user"]);
      }, "other-user");
    });

    // Should NOT be undoable
    expect(result.current.canUndo).toBe(false);
    expect(result.current.stackSize).toBe(0);
  });

  it("performs undo operation", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    // Add item
    act(() => {
      ydoc.transact(() => {
        yArray.push(["test-item"]);
      }, userId);
    });

    expect(yArray.length).toBe(1);

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(yArray.length).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("performs redo operation", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    // Add and undo
    act(() => {
      ydoc.transact(() => {
        yArray.push(["test-item"]);
      }, userId);
    });

    act(() => {
      result.current.undo();
    });

    expect(yArray.length).toBe(0);

    // Redo
    act(() => {
      result.current.redo();
    });

    expect(yArray.length).toBe(1);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it("clears undo stack", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    // Add items
    act(() => {
      ydoc.transact(() => {
        yArray.push(["item-1"]);
        yArray.push(["item-2"]);
      }, userId);
    });

    expect(result.current.canUndo).toBe(true);

    // Clear
    act(() => {
      result.current.clear();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.stackSize).toBe(0);
  });

  it("enforces stack size limit", () => {
    const maxStackSize = 5;
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
        maxStackSize,
      })
    );

    // Add 10 operations
    for (let i = 0; i < 10; i++) {
      act(() => {
        ydoc.transact(() => {
          yArray.push([`item-${i}`]);
        }, userId);
      });
    }

    // Should only keep last 5
    expect(result.current.stackSize).toBeLessThanOrEqual(maxStackSize);
    expect(result.current.stackSize).toBe(maxStackSize);
  });

  it("handles multiple undo/redo operations", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    // Add 3 items
    act(() => {
      ydoc.transact(() => yArray.push(["item-1"]), userId);
      ydoc.transact(() => yArray.push(["item-2"]), userId);
      ydoc.transact(() => yArray.push(["item-3"]), userId);
    });

    expect(yArray.length).toBe(3);

    // Undo 2 times
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(yArray.length).toBe(1);
    expect(result.current.redoStackSize).toBe(2);

    // Redo once
    act(() => {
      result.current.redo();
    });

    expect(yArray.length).toBe(2);
  });

  it("disables undo manager when enabled=false", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: false,
      })
    );

    // Try to add item
    act(() => {
      ydoc.transact(() => {
        yArray.push(["item-1"]);
      }, userId);
    });

    // Should not track
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoManager).toBe(null);
  });

  it("handles missing ydoc gracefully", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc: null,
        userId,
        scope: yArray,
        enabled: true,
      })
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoManager).toBe(null);
  });

  it("handles missing userId gracefully", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId: null,
        scope: yArray,
        enabled: true,
      })
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoManager).toBe(null);
  });

  it("respects custom capture timeout", () => {
    const { result } = renderHook(() =>
      useYjsUndo({
        ydoc,
        userId,
        scope: yArray,
        enabled: true,
        captureTimeout: 100,
      })
    );

    expect(result.current.undoManager).not.toBe(null);
  });
});
