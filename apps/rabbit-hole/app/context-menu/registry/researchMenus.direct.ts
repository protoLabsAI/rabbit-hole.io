"use client";

import { contextMenuRegistry } from "./index";

// Direct action approach - no events, just call handlers from MenuHelpers.actions

// Node context menu for Research route and Session pages
contextMenuRegistry.register({
  contextType: "node",
  route: /^\/(research|session)/, // Match /research and /session routes
  priority: 10,
  menu: [
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
      label: (ctx) => `Edit ${ctx.label || ctx.name || "Node"}`,
      icon: "✏️",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onEditNode?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "research-entity",
      label: "Research Entity",
      icon: "🔍",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onResearchEntity?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "delete-node",
      label: "Delete",
      icon: "🗑️",
      variant: "destructive",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onDeleteNode?.(ctx);
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "div-1" },
    {
      id: "create-relationship",
      label: "Add Relationship",
      icon: "🔗",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onCreateRelationship?.(ctx);
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
  ],
});

// Edge context menu for Research route and Session pages
contextMenuRegistry.register({
  contextType: "edge",
  route: /^\/(research|session)/, // Match /research and /session routes
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

// Background context menu for Research route and Session pages
contextMenuRegistry.register({
  contextType: "background",
  route: /^\/(research|session)/, // Match /research and /session routes
  priority: 10,
  menu: [
    {
      id: "add-entity",
      label: "Add Entity",
      icon: "➕",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onAddEntity?.(ctx);
        helpers.closeMenu();
      },
    },
    {
      id: "research",
      label: "Research",
      icon: "🔍",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onOpenResearchWizard?.();
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "bg-div-1" },
    {
      id: "session",
      label: "Session",
      icon: "💾",
      requiresAuth: true,
      items: [
        {
          id: "save-session",
          label: "Save Session",
          icon: "💾",
          action: (ctx, helpers) => {
            helpers.actions?.onSaveSession?.();
            helpers.closeMenu();
          },
        },
        {
          id: "load-session",
          label: "Load Session",
          icon: "📂",
          action: (ctx, helpers) => {
            helpers.actions?.onLoadSession?.();
            helpers.closeMenu();
          },
        },
      ],
    },
    {
      id: "data",
      label: "Data",
      icon: "📦",
      requiresAuth: true,
      items: [
        {
          id: "export-bundle",
          label: "Export Research Bundle",
          icon: "📤",
          action: (ctx, helpers) => {
            helpers.actions?.onExportBundle?.();
            helpers.closeMenu();
          },
        },
        {
          id: "bulk-import",
          label: "Import Bundle",
          icon: "📥",
          action: (ctx, helpers) => {
            helpers.actions?.onBulkImport?.();
            helpers.closeMenu();
          },
        },
        {
          id: "extract-from-file",
          label: "Extract Entities from File",
          icon: "📄",
          requiresAuth: true,
          action: (ctx, helpers) => {
            helpers.actions?.onExtractFromFile?.();
            helpers.closeMenu();
          },
        },
        {
          id: "merge-neo4j",
          label: "Merge to Neo4j",
          icon: "🔗",
          requiresAuth: true,
          requiredRole: "super_admin",
          action: (ctx, helpers) => {
            helpers.actions?.onMergeToNeo4j?.();
            helpers.closeMenu();
          },
        },
        { type: "divider", id: "data-div" },
        {
          id: "import-graph",
          label: "Import Graph",
          icon: "📂",
          action: (ctx, helpers) => {
            helpers.actions?.onImportData?.();
            helpers.closeMenu();
          },
        },
      ],
    },
    { type: "divider", id: "bg-div-2" },
    {
      id: "view",
      label: "View",
      icon: "👁️",
      items: [
        {
          id: "filter-entity-types",
          label: "Filter Entity Types",
          icon: "🔍",
          action: (ctx, helpers) => {
            helpers.actions?.onFilterEntityTypes?.();
            helpers.closeMenu();
          },
        },
        { type: "divider", id: "view-div-1" },
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
    { type: "divider", id: "bg-div-3" },
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
      id: "export-graph",
      label: "Export Graph",
      icon: "📁",
      action: (ctx, helpers) => {
        helpers.actions?.onExportGraph?.();
        helpers.closeMenu();
      },
    },
    { type: "divider", id: "bg-div-4" },
    {
      id: "reset-graph",
      label: "Reset Graph",
      icon: "⚠️",
      variant: "destructive",
      requiresAuth: true,
      action: (ctx, helpers) => {
        helpers.actions?.onResetGraph?.();
        helpers.closeMenu();
      },
    },
  ],
});
