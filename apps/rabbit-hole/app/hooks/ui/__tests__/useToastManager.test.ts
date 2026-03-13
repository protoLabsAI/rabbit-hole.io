import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";

import { useUIStore } from "../../../context/store/useUIStore";
import { useToastManager } from "../useToastManager";

describe.skip("useToastManager", () => {
  beforeEach(() => {
    // Reset Zustand store between tests
    const store = useUIStore.getState();
    store.clearAllToasts();
  });

  test("returns empty notifications initially", () => {
    const { result } = renderHook(() => useToastManager());

    expect(result.current.notifications).toEqual([]);
    expect(typeof result.current.showToast).toBe("function");
    expect(typeof result.current.removeToast).toBe("function");
    expect(typeof result.current.clearAll).toBe("function");
    expect(typeof result.current.success).toBe("function");
    expect(typeof result.current.error).toBe("function");
    expect(typeof result.current.info).toBe("function");
    expect(typeof result.current.warning).toBe("function");
  });

  test("shows toast notification", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.showToast("success", "Test Title", "Test Message", 3000);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      id: 1,
      type: "success",
      title: "Test Title",
      message: "Test Message",
      duration: 3000,
    });
  });

  test("removes specific toast notification", () => {
    const { result } = renderHook(() => useToastManager());

    let toastId: number;

    // Add a toast
    act(() => {
      result.current.showToast("info", "Test Toast");
      toastId = result.current.notifications[0].id;
    });

    expect(result.current.notifications).toHaveLength(1);

    // Remove the toast
    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test("clears all toast notifications", () => {
    const { result } = renderHook(() => useToastManager());

    // Add multiple toasts
    act(() => {
      result.current.showToast("success", "Toast 1");
      result.current.showToast("error", "Toast 2");
      result.current.showToast("warning", "Toast 3");
    });

    expect(result.current.notifications).toHaveLength(3);

    // Clear all
    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test("success convenience method works", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.success("Success Title", "Success Message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("success");
    expect(result.current.notifications[0].title).toBe("Success Title");
    expect(result.current.notifications[0].message).toBe("Success Message");
  });

  test("error convenience method works", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.error("Error Title", "Error Message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("error");
    expect(result.current.notifications[0].title).toBe("Error Title");
    expect(result.current.notifications[0].message).toBe("Error Message");
  });

  test("info convenience method works", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.info("Info Title");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("info");
    expect(result.current.notifications[0].title).toBe("Info Title");
    expect(result.current.notifications[0].message).toBeUndefined();
  });

  test("warning convenience method works", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.warning("Warning Title", "Warning Message");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe("warning");
    expect(result.current.notifications[0].title).toBe("Warning Title");
    expect(result.current.notifications[0].message).toBe("Warning Message");
  });

  test("multiple toasts get unique IDs", () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.success("Toast 1");
      result.current.error("Toast 2");
      result.current.info("Toast 3");
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].id).toBe(1);
    expect(result.current.notifications[1].id).toBe(2);
    expect(result.current.notifications[2].id).toBe(3);
  });
});
