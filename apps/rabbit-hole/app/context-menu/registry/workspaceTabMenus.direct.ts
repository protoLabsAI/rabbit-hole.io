/**
 * Workspace Tab Context Menus
 *
 * Auto-registers on import (HMR-safe)
 */

import type { MenuConfig } from "../core/types";

import { contextMenuRegistry } from "./index";

// Register tab menu (all routes)
contextMenuRegistry.register({
  contextType: "workspace-tab",
  route: "*",
  menu: (context: any): MenuConfig => [
    {
      id: "duplicate-tab",
      label: "Duplicate Tab",
      icon: "copy",
      action: async (ctx, helpers) => {
        if (ctx.onDuplicate) {
          await ctx.onDuplicate();
          helpers.toast({
            title: "Coming Soon",
            description: "Tab duplication will be available soon.",
          });
        }
        helpers.closeMenu();
      },
      disabled: () => true, // Stubbed for now
    },
    {
      type: "divider",
      id: "divider-1",
    },
    {
      id: "delete-tab",
      label: (ctx) => (ctx.type === "session" ? "End Session" : "Delete Tab"),
      icon: "trash",
      variant: "destructive",
      action: async (ctx, helpers) => {
        if (ctx.onClose) {
          await ctx.onClose();
        }
        helpers.closeMenu();
      },
      visible: (ctx) => ctx.isOwner && !ctx.isViewMode,
    },
  ],
});

export {};
