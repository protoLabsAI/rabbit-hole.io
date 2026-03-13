/**
 * Y.Map-based Workspace Tab Helpers
 *
 * These utilities replace the Y.Array-based tab management with Y.Map.
 * Y.Map provides reliable property-level observation and better performance.
 *
 * Key changes from Y.Array:
 * - tabs: Y.Map<tabId, Y.Map<tab properties>>
 * - tabOrder: Y.Array<tabId> (maintains display order)
 * - Direct property access instead of delete+insert pattern
 */

import * as Y from "yjs";

import type { WorkspaceTab } from "../types/workspace";

/**
 * Check if workspace is using Y.Map structure (vs legacy Y.Array)
 */
export function isYMapWorkspace(ydoc: Y.Doc): boolean {
  const yWorkspace = ydoc.getMap("workspace");
  return yWorkspace.get("_usesYMap") === true;
}

/**
 * Mark workspace as using Y.Map structure
 */
export function markAsYMapWorkspace(ydoc: Y.Doc, userId: string): void {
  const yWorkspace = ydoc.getMap("workspace");
  ydoc.transact(() => {
    yWorkspace.set("_usesYMap", true);
    yWorkspace.set("_yMapMigrationDate", Date.now());
  }, userId);
}

/**
 * Get all tabs from Y.Map structure
 * Uses "tabsMap" key to avoid conflicts with legacy "tabs" Y.Array
 */
export function getTabsFromYMap(ydoc: Y.Doc): WorkspaceTab[] {
  const yTabsMap = ydoc.getMap("tabsMap");
  const yTabOrder = ydoc.getArray("tabOrder");

  const tabIds = yTabOrder.toArray() as string[];

  return tabIds
    .map((tabId) => {
      const tabMap = yTabsMap.get(tabId);
      if (!tabMap || !(tabMap instanceof Y.Map)) return null;

      return convertYMapToTab(tabMap);
    })
    .filter((tab): tab is WorkspaceTab => tab !== null);
}

/**
 * Convert Y.Map to WorkspaceTab object
 */
export function convertYMapToTab(tabMap: Y.Map<any>): WorkspaceTab {
  const entries = Array.from(tabMap.entries());
  return Object.fromEntries(entries) as WorkspaceTab;
}

/**
 * Convert WorkspaceTab to Y.Map
 */
export function convertTabToYMap(tab: WorkspaceTab): Y.Map<any> {
  const tabMap = new Y.Map();
  Object.entries(tab).forEach(([key, value]) => {
    tabMap.set(key, value);
  });
  return tabMap;
}

/**
 * Get a specific tab by ID
 */
export function getTabById(ydoc: Y.Doc, tabId: string): WorkspaceTab | null {
  const yTabsMap = ydoc.getMap("tabsMap");
  const tabMap = yTabsMap.get(tabId);

  if (!tabMap || !(tabMap instanceof Y.Map)) {
    return null;
  }

  return convertYMapToTab(tabMap);
}

/**
 * Add a new tab to Y.Map structure
 */
export function addTabToYMap(
  ydoc: Y.Doc,
  tab: WorkspaceTab,
  userId: string
): void {
  const yTabsMap = ydoc.getMap("tabsMap");
  const yTabOrder = ydoc.getArray("tabOrder");

  ydoc.transact(() => {
    // Create Y.Map for the tab
    const tabMap = convertTabToYMap(tab);
    yTabsMap.set(tab.id, tabMap);

    // Add to order array
    yTabOrder.push([tab.id]);

    console.log(`✅ Added tab ${tab.id} to Y.Map`);
  }, userId);
}

/**
 * Update canvas data for a specific tab
 */
export function updateTabCanvasData(
  ydoc: Y.Doc,
  tabId: string,
  canvasData: any,
  userId: string
): void {
  const yTabsMap = ydoc.getMap("tabsMap");
  const tabMap = yTabsMap.get(tabId);

  if (!tabMap || !(tabMap instanceof Y.Map)) {
    console.error(`❌ Tab ${tabId} not found in Y.Map`);
    return;
  }

  ydoc.transact(() => {
    tabMap.set("canvasData", canvasData);

    // Update metadata
    const metadata = tabMap.get("metadata") || {};
    tabMap.set("metadata", {
      ...metadata,
      updatedAt: Date.now(),
    });

    console.log(`✅ Updated canvas data for tab ${tabId}`);
  }, userId);
}

/**
 * Remove a tab from Y.Map structure
 */
export function removeTabFromYMap(
  ydoc: Y.Doc,
  tabId: string,
  userId: string
): void {
  const yTabsMap = ydoc.getMap("tabsMap");
  const yTabOrder = ydoc.getArray("tabOrder");

  ydoc.transact(() => {
    // Remove from map
    yTabsMap.delete(tabId);

    // Remove from order array
    const tabIds = yTabOrder.toArray() as string[];
    const index = tabIds.indexOf(tabId);
    if (index !== -1) {
      yTabOrder.delete(index, 1);
    }

    console.log(`✅ Removed tab ${tabId} from Y.Map`);
  }, userId);
}

/**
 * Reorder tabs in Y.Map structure
 */
export function reorderTabsInYMap(
  ydoc: Y.Doc,
  fromIndex: number,
  toIndex: number,
  userId: string
): void {
  const yTabOrder = ydoc.getArray("tabOrder");
  const tabIds = yTabOrder.toArray() as string[];

  if (
    fromIndex < 0 ||
    fromIndex >= tabIds.length ||
    toIndex < 0 ||
    toIndex >= tabIds.length
  ) {
    console.error("❌ Invalid reorder indices");
    return;
  }

  const reordered = [...tabIds];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  ydoc.transact(() => {
    // Clear and repopulate order array
    yTabOrder.delete(0, tabIds.length);
    yTabOrder.push(reordered);

    console.log(`✅ Reordered tabs: ${fromIndex} → ${toIndex}`);
  }, userId);
}

/**
 * Check if a tab exists in Y.Map
 */
export function tabExistsInYMap(ydoc: Y.Doc, tabId: string): boolean {
  const yTabsMap = ydoc.getMap("tabsMap");
  return yTabsMap.has(tabId);
}

/**
 * Initialize empty Y.Map tab structure
 */
export function initializeYMapTabs(ydoc: Y.Doc, userId: string): void {
  const yWorkspace = ydoc.getMap("workspace");

  ydoc.transact(() => {
    // Ensure maps exist (use "tabsMap" to avoid conflict)
    if (!ydoc.getMap("tabsMap").size) {
      console.log("🆕 Initializing Y.Map tabsMap structure");
    }

    // Ensure order array exists
    if (!ydoc.getArray("tabOrder").length) {
      console.log("🆕 Initializing Y.Array tabOrder");
    }

    // Mark as Y.Map workspace
    yWorkspace.set("_usesYMap", true);
    yWorkspace.set("_yMapMigrationDate", Date.now());
  }, userId);
}

/**
 * Migrate legacy Y.Array tabs to Y.Map structure
 *
 * This function converts existing Y.Array tabs to the new Y.Map structure.
 * It's safe to call multiple times - it will skip if already migrated.
 */
export function migrateLegacyTabsToYMap(
  ydoc: Y.Doc,
  userId: string
): {
  success: boolean;
  migratedCount: number;
  error?: string;
} {
  // Check if already migrated
  if (isYMapWorkspace(ydoc)) {
    console.log("✅ Workspace already using Y.Map structure");
    return { success: true, migratedCount: 0 };
  }

  try {
    // Try to get Y.Array - will throw if Y.Map with "tabs" key exists
    let yTabs: Y.Array<any>;
    let tabs: WorkspaceTab[] = [];

    try {
      yTabs = ydoc.getArray("tabs");
      tabs = yTabs.toArray() as WorkspaceTab[];
    } catch (typeError) {
      // Type conflict: Y.Map "tabs" already exists
      console.warn(
        "⚠️ Type conflict - Y.Map 'tabs' already exists, skipping migration"
      );

      // Check if Y.Map has data
      const yTabsMap = ydoc.getMap("tabsMap");
      if (yTabsMap.size > 0) {
        // Y.Map already populated, mark as migrated
        markAsYMapWorkspace(ydoc, userId);
        return { success: true, migratedCount: 0 };
      }

      // Y.Map exists but is empty - can't recover
      return {
        success: false,
        migratedCount: 0,
        error: "Type conflict with empty Y.Map - clear workspace data",
      };
    }

    if (tabs.length === 0) {
      // No tabs to migrate, just mark as Y.Map
      initializeYMapTabs(ydoc, userId);
      return { success: true, migratedCount: 0 };
    }

    console.log(`🔄 Migrating ${tabs.length} tabs from Y.Array to Y.Map...`);

    // Use "tabsMap" key to avoid conflict with legacy "tabs" Y.Array
    const yTabsMap = ydoc.getMap("tabsMap");
    const yTabOrder = ydoc.getArray("tabOrder");

    ydoc.transact(() => {
      tabs.forEach((tab) => {
        // Convert to Y.Map
        const tabMap = convertTabToYMap(tab);
        yTabsMap.set(tab.id, tabMap);

        // Add to order
        yTabOrder.push([tab.id]);
      });

      // Archive old array (keep for potential rollback)
      const yArchive = ydoc.getArray(`tabs_legacy_${Date.now()}`);
      yArchive.push(tabs);

      // Clear old array
      yTabs.delete(0, yTabs.length);

      // Mark as migrated
      markAsYMapWorkspace(ydoc, userId);

      console.log(`✅ Migration complete: ${tabs.length} tabs migrated`);
    }, userId);

    return { success: true, migratedCount: tabs.length };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("❌ Migration failed:", error);
    return { success: false, migratedCount: 0, error };
  }
}
