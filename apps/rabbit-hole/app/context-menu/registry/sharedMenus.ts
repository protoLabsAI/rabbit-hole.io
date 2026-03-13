"use client";

import type { MenuItemConfig, MenuSectionConfig } from "../core/types";

/**
 * Shared Menu Fragments
 *
 * Reusable menu items and sections that can be imported
 * and used across different route-specific menus
 */

// Common view controls
export const viewControls: MenuSectionConfig = {
  id: "view",
  label: "View",
  icon: "👁️",
  items: [
    {
      id: "reset-view",
      label: "Reset View",
      icon: "🔄",
      action: (ctx, helpers) => {
        window.dispatchEvent(new CustomEvent("graph:resetView"));
        helpers.closeMenu();
      },
    },
    {
      id: "fit-to-screen",
      label: "Fit to Screen",
      icon: "📐",
      action: (ctx, helpers) => {
        window.dispatchEvent(new CustomEvent("graph:fitToScreen"));
        helpers.closeMenu();
      },
    },
    {
      id: "toggle-layout",
      label: "Change Layout",
      icon: "🔀",
      action: (ctx, helpers) => {
        window.dispatchEvent(new CustomEvent("graph:toggleLayout"));
        helpers.closeMenu();
      },
    },
  ],
};

// Common node details item
export const showNodeDetails: MenuItemConfig = {
  id: "show-details",
  label: "Show Details",
  icon: "📊",
  action: (ctx, helpers) => {
    window.dispatchEvent(
      new CustomEvent("graph:showNodeDetails", { detail: ctx })
    );
    helpers.closeMenu();
  },
};

// Common center on node item
export const centerOnNode: MenuItemConfig = {
  id: "center-on-node",
  label: "Center on Node",
  icon: "🎯",
  action: (ctx, helpers) => {
    window.dispatchEvent(
      new CustomEvent("graph:centerOnNode", { detail: ctx })
    );
    helpers.closeMenu();
  },
};

// Common delete node item
export const deleteNode: MenuItemConfig = {
  id: "delete-node",
  label: "Delete Node",
  icon: "🗑️",
  variant: "destructive",
  requiresAuth: true,
  action: (ctx, helpers) => {
    window.dispatchEvent(new CustomEvent("graph:deleteNode", { detail: ctx }));
    helpers.closeMenu();
  },
};

// Common edit node item (dynamic label)
export const createEditNodeItem = (
  eventName = "graph:editNode"
): MenuItemConfig => ({
  id: "edit-node",
  label: (ctx) => `Edit ${ctx.label || ctx.name || "Node"}`,
  icon: "✏️",
  requiresAuth: true,
  action: (ctx, helpers) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: ctx }));
    helpers.closeMenu();
  },
});

// Common export/import section
export const dataManagement: MenuSectionConfig = {
  id: "data",
  label: "Data",
  icon: "📦",
  requiresAuth: true,
  items: [
    {
      id: "export-bundle",
      label: "Export Bundle",
      icon: "📤",
      action: (ctx, helpers) => {
        window.dispatchEvent(new CustomEvent("graph:exportBundle"));
        helpers.closeMenu();
      },
    },
    {
      id: "bulk-import",
      label: "Import Bundle",
      icon: "📥",
      action: (ctx, helpers) => {
        window.dispatchEvent(new CustomEvent("graph:bulkImport"));
        helpers.closeMenu();
      },
    },
  ],
};

// Divider helper
export const divider = (id: string) => ({ type: "divider" as const, id });
