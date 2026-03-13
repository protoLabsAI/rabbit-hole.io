"use client";

import type { MenuConfig } from "../core/types";

import { contextMenuRegistry } from "./index";

// Direct action approach - no events, just call handlers from MenuHelpers.actions

// Node context menu for Atlas
contextMenuRegistry.register({
  contextType: "node",
  route: "/atlas",
  priority: 10,
  menu: (context): MenuConfig => [
    {
      id: "show-details",
      label: "Show Details",
      icon: "📊",
      action: (ctx, helpers) => {
        helpers.actions?.onShowNodeDetails?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "edit-node",
      label: `Edit ${context.label || "Node"}`,
      icon: "✏️",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onEditNode?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "div-1" },
    {
      id: "expand-connections",
      label: "Show Connections",
      icon: "🔍",
      action: (ctx, helpers) => {
        helpers.actions?.onExpandConnections?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "center-on-node",
      label: "Center on Node",
      icon: "🎯",
      action: (ctx, helpers) => {
        helpers.actions?.onCenterOnNode?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "div-2" },
    {
      id: "research-tools",
      label: "Research Tools",
      icon: "🔍",
      requiresAuth: true,
      items: [
        {
          id: "ego-network",
          label: "View Ego Network",
          icon: "🎯",
          action: (ctx, helpers) => {
            helpers.actions?.onViewEgoNetwork?.(ctx);
            helpers.closeMenu();
          },
        },
        {
          id: "timeline",
          label: "View Timeline",
          icon: "📅",
          action: (ctx, helpers) => {
            helpers.actions?.onViewTimeline?.(ctx);
            helpers.closeMenu();
          },
        },
        {
          id: "evidence-pack",
          label: "Evidence Pack",
          icon: "📦",
          action: (ctx, helpers) => {
            helpers.actions?.onViewEvidencePack?.(ctx);
            helpers.closeMenu();
          },
        },
        { type: "divider", id: "research-div" },
        {
          id: "add-relationship",
          label: "Add Relationship",
          icon: "🔗",
          action: (ctx, helpers) => {
            helpers.actions?.onCreateRelationship?.(ctx);
            helpers.closeMenu();
          },
        },
        { type: "divider", id: "research-mode-div" },
        {
          id: "research-mode",
          label: "Open in Research Mode",
          icon: "🔬",
          requiresAuth: true,
          action: (ctx, helpers) => {
            helpers.actions?.onOpenInResearchMode?.(ctx);
            helpers.closeMenu();
          },
        },
      ],
    },
    { type: "divider", id: "div-3" },
    {
      id: "advanced",
      label: "Advanced",
      icon: "⚡",
      requiresAuth: true,
      items: [
        {
          id: "duplicate",
          label: "Duplicate",
          icon: "📋",
          action: (ctx, helpers) => {
            helpers.actions?.onDuplicateNode?.(ctx);
            helpers.closeMenu();
          },
        },
        {
          id: "merge",
          label: "Merge with Entity",
          icon: "🔗",
          action: (ctx, helpers) => {
            helpers.actions?.onMergeWithEntity?.(ctx);
            helpers.closeMenu();
          },
        },
        { type: "divider", id: "advanced-div" },
        {
          id: "delete",
          label: "Delete Node",
          icon: "🗑️",
          variant: "destructive",
          action: (ctx, helpers) => {
            helpers.actions?.onDeleteNode?.(ctx);
            helpers.closeMenu();
          },
        },
      ],
    },
  ],
});

// Edge context menu for Atlas
contextMenuRegistry.register({
  contextType: "edge",
  route: "/atlas",
  priority: 10,
  menu: [
    {
      id: "show-edge-details",
      label: "Show Details",
      icon: "📊",
      action: (ctx, helpers) => {
        helpers.actions?.onShowEdgeDetails?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "edge-div-1" },
    {
      id: "edit-edge",
      label: "Edit Relationship",
      icon: "✏️",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onEditEdge?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "reverse-edge",
      label: "Reverse Direction",
      icon: "↩️",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onReverseEdge?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "edge-div-2" },
    {
      id: "delete-edge",
      label: "Delete Relationship",
      icon: "🗑️",
      variant: "destructive",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onDeleteEdge?.(ctx);
        helpers.closeMenu();
      },
    },
  ],
});

// Background context menu for Atlas
contextMenuRegistry.register({
  contextType: "background",
  route: "/atlas",
  priority: 10,
  menu: [
    {
      id: "add-entity",
      label: "Research & Add Person",
      icon: "🔍",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onAddEntity?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "bg-div-1" },
    {
      id: "view",
      label: "View",
      icon: "👁️",
      items: [
        {
          id: "reset-view",
          label: "Reset View",
          icon: "🔄",
          action: (ctx, helpers) => {
            helpers.actions?.onResetView?.();
            helpers.closeMenu();
          },
        },
        {
          id: "fit-to-screen",
          label: "Fit to Screen",
          icon: "📐",
          action: (ctx, helpers) => {
            helpers.actions?.onFitToScreen?.();
            helpers.closeMenu();
          },
        },
        {
          id: "toggle-layout",
          label: "Change Layout",
          icon: "🔀",
          action: (ctx, helpers) => {
            helpers.actions?.onToggleLayout?.();
            helpers.closeMenu();
          },
        },
      ],
    },
    { type: "divider", id: "bg-div-2" },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      action: (ctx, helpers) => {
        helpers.actions?.onShowSettings?.();
        helpers.closeMenu();
      },
    },
    {
      id: "export-bundle",
      label: "Export Bundle",
      icon: "📤",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onExportBundle?.();
        helpers.closeMenu();
      },
    },
    {
      id: "bulk-import",
      label: "Import Bundle",
      icon: "📥",
      requiresAuth: true,
      // Handler conditionally added for super_admin only in AtlasClient
      action: (ctx, helpers) => {
        helpers.actions?.onBulkImport?.();
        helpers.closeMenu();
      },
    },
  ],
});

// Legend context menu for Atlas
contextMenuRegistry.register({
  contextType: "legend",
  route: "/atlas",
  priority: 10,
  menu: (context): MenuConfig => {
    const items: MenuConfig = [];

    if (context.entityType) {
      items.push({
        id: "toggle-type",
        label: `Toggle ${context.entityType} visibility`,
        icon: "👁️‍🗨️",
        action: (ctx, helpers) => {
          helpers.actions?.onToggleEntityType?.(ctx.entityType);
          helpers.closeMenu();
        },
      });
      items.push({ type: "divider", id: "legend-div-1" });
    }

    items.push({
      id: "filter-sentiment",
      label: "Filter by Sentiment",
      icon: "🎨",
      items: [
        {
          id: "filter-hostile",
          label: "Hostile",
          action: (ctx, helpers) => {
            helpers.actions?.onFilterBySentiment?.("hostile");
            helpers.closeMenu();
          },
        },
        {
          id: "filter-supportive",
          label: "Supportive",
          action: (ctx, helpers) => {
            helpers.actions?.onFilterBySentiment?.("supportive");
            helpers.closeMenu();
          },
        },
        {
          id: "filter-neutral",
          label: "Neutral",
          action: (ctx, helpers) => {
            helpers.actions?.onFilterBySentiment?.("neutral");
            helpers.closeMenu();
          },
        },
      ],
    });

    items.push({ type: "divider", id: "legend-div-2" });
    items.push({
      id: "legend-settings",
      label: "Legend Settings",
      icon: "⚙️",
      action: (ctx, helpers) => {
        helpers.actions?.onShowLegendSettings?.();
        helpers.closeMenu();
      },
    });

    return items;
  },
});
