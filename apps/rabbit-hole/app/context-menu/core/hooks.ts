"use client";

import * as React from "react";

import { useUIContextMenu } from "../../context/hooks/useUnifiedUI";

import type { ContextMenuHook } from "./types";

export function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Zustand store handles all state internally
  return React.createElement(React.Fragment, {}, children);
}

export function useContextMenu(): ContextMenuHook {
  const {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    setActions,
    actions,
  } = useUIContextMenu();

  return React.useMemo(
    () => ({
      contextMenu,
      openContextMenu,
      closeContextMenu,
      setActions,
      actions,
    }),
    [contextMenu, openContextMenu, closeContextMenu, setActions, actions]
  );
}
