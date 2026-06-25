"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Bring-your-own-key store. The visitor's LLM key lives only in localStorage
 * and is attached as the `x-llm-api-key` header on chat requests (see
 * useChatSearch). It is never sent to or stored by our server.
 */

const STORAGE_KEY = "rh:llm-key";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useByokKey() {
  const key = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setKey = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    emit();
  }, []);

  const clearKey = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    emit();
  }, []);

  return { key, hasKey: Boolean(key), setKey, clearKey };
}

/** Read the stored key once (non-reactive) — used by the request transport. */
export function readByokKey(): string | null {
  return getSnapshot();
}
