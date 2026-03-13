/**
 * Debug Utilities - Global Development/Support Tools
 *
 * Exposes helpful debugging functions via window.__RABBIT_DEBUG__
 * Available in browser console for troubleshooting and testing.
 *
 * Usage:
 *   window.__RABBIT_DEBUG__.wipeLocal()
 *   window.__RABBIT_DEBUG__.storageStatus()
 */

export interface DebugUtils {
  // Storage Management
  wipeLocal: () => Promise<void>;
  wipeLocalAndReload: () => Promise<void>;
  storageStatus: () => Promise<void>;
  exportWorkspace: () => Promise<void>;

  // Sync Management
  forceSync: () => void;
  clearYjsCache: () => Promise<void>;

  // Diagnostics
  checkIndexedDB: () => Promise<void>;
  listDatabases: () => Promise<void>;

  // Help
  help: () => void;
}

/**
 * Wipe all local storage (localStorage + IndexedDB)
 * DOES NOT reload the page
 */
async function wipeLocal(): Promise<void> {
  console.group("🗑️ Wiping Local Storage");

  try {
    // 1. Clear localStorage
    const localStorageSize = localStorage.length;
    localStorage.clear();
    console.log(`✅ localStorage cleared (${localStorageSize} items)`);

    // 2. Delete all IndexedDB databases
    const dbs = await indexedDB.databases();
    console.log(
      `Found ${dbs.length} IndexedDB databases:`,
      dbs.map((d) => d.name)
    );

    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name!);
      console.log(`  ✅ Deleted: ${db.name}`);
    }

    console.log("✅ All local data wiped");
    console.log("⚠️ Reload page to apply changes: location.reload()");
  } catch (error) {
    console.error("❌ Error wiping local storage:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Wipe local storage AND reload page
 * NUCLEAR OPTION - Use with caution
 */
async function wipeLocalAndReload(): Promise<void> {
  console.log("🚨 NUCLEAR OPTION: Wiping all local data and reloading...");

  await wipeLocal();

  setTimeout(() => {
    console.log("🔄 Reloading page...");
    window.location.reload();
  }, 1000);
}

/**
 * Display storage usage status
 */
async function storageStatus(): Promise<void> {
  console.group("📊 Storage Status");

  try {
    // localStorage
    const localStorageSize = new Blob(Object.values(localStorage)).size;
    console.log(
      `localStorage: ${localStorage.length} items (~${Math.round(localStorageSize / 1024)}KB)`
    );

    // IndexedDB
    const dbs = await indexedDB.databases();
    console.log(`IndexedDB: ${dbs.length} databases`);

    for (const db of dbs) {
      console.log(`  - ${db.name} (v${db.version})`);
    }

    // Storage quota (if available)
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
      const percentUsed = (
        ((estimate.usage || 0) / (estimate.quota || 1)) *
        100
      ).toFixed(1);

      console.log(
        `Total Storage: ${usedMB}MB / ${quotaMB}MB (${percentUsed}%)`
      );
    }
  } catch (error) {
    console.error("Error checking storage:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Export current workspace data as JSON
 */
async function exportWorkspace(): Promise<void> {
  console.group("📤 Exporting Workspace");

  try {
    const dbs = await indexedDB.databases();
    const yjsDB = dbs.find((db) => db.name?.startsWith("y-"));

    if (!yjsDB) {
      console.warn("⚠️ No Yjs database found");
      console.groupEnd();
      return;
    }

    console.log(`Found database: ${yjsDB.name}`);
    console.log("⚠️ Export not yet implemented - coming soon!");
    console.log(
      "Workspace data is stored in IndexedDB and can be inspected via DevTools → Application → IndexedDB"
    );
  } catch (error) {
    console.error("Error exporting workspace:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Force Yjs sync (if provider is available)
 */
function forceSync(): void {
  console.log("🔄 Force sync not yet implemented");
  console.log("Yjs providers auto-sync on changes");
  console.log("To manually trigger: reload page or reconnect WebSocket");
}

/**
 * Clear Yjs cache (IndexedDB only, keep localStorage)
 */
async function clearYjsCache(): Promise<void> {
  console.group("🗑️ Clearing Yjs Cache");

  try {
    const dbs = await indexedDB.databases();
    const yjsDbs = dbs.filter((db) => db.name?.startsWith("y-"));

    if (yjsDbs.length === 0) {
      console.log("No Yjs databases found");
      console.groupEnd();
      return;
    }

    console.log(`Found ${yjsDbs.length} Yjs database(s)`);

    for (const db of yjsDbs) {
      indexedDB.deleteDatabase(db.name!);
      console.log(`  ✅ Deleted: ${db.name}`);
    }

    console.log("✅ Yjs cache cleared");
    console.log("🔄 Reload page: location.reload()");
  } catch (error) {
    console.error("Error clearing Yjs cache:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Check IndexedDB health
 */
async function checkIndexedDB(): Promise<void> {
  console.group("🔍 IndexedDB Health Check");

  try {
    // Test if IndexedDB is available
    if (!("indexedDB" in window)) {
      console.error("❌ IndexedDB not available");
      console.groupEnd();
      return;
    }

    console.log("✅ IndexedDB available");

    // List databases
    const dbs = await indexedDB.databases();
    console.log(`✅ Found ${dbs.length} database(s)`);

    for (const db of dbs) {
      console.log(`  - ${db.name} (v${db.version})`);
    }

    // Check Yjs databases
    const yjsDbs = dbs.filter((db) => db.name?.startsWith("y-"));
    if (yjsDbs.length > 0) {
      console.log(`✅ ${yjsDbs.length} Yjs database(s) detected`);

      // Check for old format (with BroadcastChannel)
      const hasOldFormat = yjsDbs.some(
        (db) => !db.name?.includes("(NO BroadcastChannel)")
      );
      if (hasOldFormat) {
        console.warn("⚠️ Old Yjs database format detected");
        console.warn(
          "Recommendation: Run __RABBIT_DEBUG__.wipeLocalAndReload()"
        );
      } else {
        console.log("✅ New Yjs format (NO BroadcastChannel)");
      }
    }

    console.log("\n📊 Run __RABBIT_DEBUG__.storageStatus() for detailed info");
  } catch (error) {
    console.error("Error checking IndexedDB:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * List all IndexedDB databases
 */
async function listDatabases(): Promise<void> {
  console.group("📁 IndexedDB Databases");

  try {
    const dbs = await indexedDB.databases();

    if (dbs.length === 0) {
      console.log("No databases found");
      console.groupEnd();
      return;
    }

    console.table(
      dbs.map((db) => ({
        name: db.name || "unknown",
        version: db.version || "unknown",
      }))
    );
  } catch (error) {
    console.error("Error listing databases:", error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Display help information
 */
function help(): void {
  console.log(`
┌──────────────────────────────────────────────────────────┐
│  🐰 Rabbit Hole Debug Utilities                          │
└──────────────────────────────────────────────────────────┘

Available commands (use via window.__RABBIT_DEBUG__):

📦 Storage Management:
  .wipeLocal()           - Clear localStorage + IndexedDB (no reload)
  .wipeLocalAndReload()  - 🚨 NUCLEAR: Wipe all + reload page
  .storageStatus()       - Show storage usage and quota
  .exportWorkspace()     - Export workspace data (coming soon)

🔄 Sync Management:
  .forceSync()           - Force Yjs sync (coming soon)
  .clearYjsCache()       - Clear Yjs IndexedDB only

🔍 Diagnostics:
  .checkIndexedDB()      - Run IndexedDB health check
  .listDatabases()       - List all IndexedDB databases

❓ Help:
  .help()                - Show this help message

Example:
  __RABBIT_DEBUG__.wipeLocalAndReload()  // Clean slate
  __RABBIT_DEBUG__.storageStatus()       // Check usage
  __RABBIT_DEBUG__.checkIndexedDB()      // Health check

⚠️  These utilities are for development/debugging only.
    Not available in production builds.
  `);
}

/**
 * Create and expose debug utilities
 */
export function createDebugUtils(): DebugUtils {
  return {
    // Storage
    wipeLocal,
    wipeLocalAndReload,
    storageStatus,
    exportWorkspace,

    // Sync
    forceSync,
    clearYjsCache,

    // Diagnostics
    checkIndexedDB,
    listDatabases,

    // Help
    help,
  };
}

/**
 * Initialize debug utilities on window object
 * Only available in development/staging
 */
export function initDebugUtils(): void {
  // Only expose in non-production environments
  const isDev = process.env.NODE_ENV === "development";
  const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";

  if (!isDev && !isStaging) {
    return; // Don't expose in production
  }

  if (typeof window === "undefined") {
    return; // Skip on server-side
  }

  // Create debug object
  const debugUtils = createDebugUtils();

  // Expose on window
  (window as any).__RABBIT_DEBUG__ = debugUtils;

  // Log availability
  console.log(
    "%c🐰 Rabbit Debug Utils Available",
    "background: #6366f1; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
  );
  console.log("Type __RABBIT_DEBUG__.help() for available commands");
}
