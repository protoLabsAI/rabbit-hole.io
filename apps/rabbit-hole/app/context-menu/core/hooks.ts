"use client";

import * as React from "react";
import { create } from "zustand";

import type { ContextMenuHook, ContextMenuState, ContextType } from "./types";

/**
 * Self-contained context-menu store.
 *
 * The renderer ({@link ../components/ContextMenuRenderer}) is wired into the
 * root layout so right-click menus can be registered per-surface. The search
 * product does not currently open any menus, so this store stays closed by
 * default. It used to live in a larger unified UI store that was removed with
 * the Atlas/entity dead-code teardown — the menu state is kept local here so
 * the live renderer has no dependency on that removed subsystem.
 */
interface ContextMenuStore {
  contextMenu: ContextMenuState & { routeActions?: Record<string, any> };
  openContextMenu: (
    type: ContextType,
    x: number,
    y: number,
    context?: any
  ) => void;
  closeContextMenu: () => void;
  setContextMenuActions: (actions: Record<string, any>) => void;
}

const useContextMenuStore = create<ContextMenuStore>((set) => ({
  contextMenu: {
    isOpen: false,
    type: "background",
    x: 0,
    y: 0,
    context: undefined,
    routeActions: undefined,
  },
  openContextMenu: (type, x, y, context) =>
    set((state) => ({
      contextMenu: { ...state.contextMenu, isOpen: true, type, x, y, context },
    })),
  closeContextMenu: () =>
    set((state) => ({
      contextMenu: { ...state.contextMenu, isOpen: false },
    })),
  setContextMenuActions: (actions) =>
    set((state) => ({
      contextMenu: { ...state.contextMenu, routeActions: actions },
    })),
}));

export function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Zustand store handles all state internally
  return React.createElement(React.Fragment, {}, children);
}

export function useContextMenu(): ContextMenuHook {
  const contextMenu = useContextMenuStore((state) => state.contextMenu);
  const openContextMenu = useContextMenuStore(
    (state) => state.openContextMenu
  );
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  const setActions = useContextMenuStore(
    (state) => state.setContextMenuActions
  );

  return React.useMemo(
    () => ({
      contextMenu,
      openContextMenu,
      closeContextMenu,
      setActions,
      actions: contextMenu.routeActions,
    }),
    [contextMenu, openContextMenu, closeContextMenu, setActions]
  );
}
