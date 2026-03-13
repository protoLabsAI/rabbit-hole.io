/**
 * Dashboard Panel Registry
 *
 * Central registry of all dashboard management panels.
 * Uses dynamic imports for memory-efficient loading.
 */

import type { PanelHubConfig } from "@proto/ui";

export const dashboardPanelConfig: PanelHubConfig = {
  categories: {
    management: {
      label: "Management",
      icon: "settings",
      description: "System and data management tools",
    },
    collaboration: {
      label: "Collaboration",
      icon: "users",
      description: "Collaboration and sharing tools",
    },
    system: {
      label: "System",
      icon: "wrench",
      description: "System administration and monitoring",
    },
  },

  panels: [
    // Management
    {
      id: "files",
      name: "Files",
      description: "File management and processing states",
      category: "management",
      icon: "folder",
      importFn: () =>
        import("../components/FilesManagementTab").then((m) => ({
          default: m.FilesManagementTab,
        })),
      status: "active",
      tags: ["files", "uploads", "processing", "storage"],
      estimatedSize: 85,
    },
    {
      id: "entities",
      name: "Entities",
      description: "Entity monitoring and tier limits",
      category: "management",
      icon: "box",
      importFn: () =>
        import("../components/EntitiesManagementTab").then((m) => ({
          default: m.EntitiesManagementTab,
        })),
      status: "active",
      tags: ["entities", "neo4j", "graph", "limits"],
      estimatedSize: 90,
    },

    // Collaboration
    {
      id: "shares",
      name: "Share Links",
      description: "Manage timeline share links and tokens",
      category: "collaboration",
      icon: "link",
      importFn: () =>
        import("../components/ShareLinksManagementTab").then((m) => ({
          default: m.ShareLinksManagementTab,
        })),
      status: "active",
      tags: ["sharing", "tokens", "public-access"],
      estimatedSize: 70,
    },
    {
      id: "sessions",
      name: "Sessions",
      description: "Active collaboration sessions",
      category: "collaboration",
      icon: "radio",
      importFn: () =>
        import("../components/SessionsManagementTab").then((m) => ({
          default: m.SessionsManagementTab,
        })),
      status: "active",
      tags: ["sessions", "yjs", "real-time"],
      estimatedSize: 60,
    },

    // System (Admin only)
    {
      id: "integrity",
      name: "Data Integrity",
      description: "Database integrity checks and repairs",
      category: "system",
      icon: "shield-check",
      importFn: () =>
        import("../components/IntegrityCheckTab").then((m) => ({
          default: m.IntegrityCheckTab,
        })),
      status: "active",
      tags: ["admin", "database", "integrity", "monitoring"],
      estimatedSize: 75,
      adminOnly: true,
    },
  ],
};
