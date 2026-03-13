/**
 * IndexedDB Storage Quota Utilities
 *
 * Monitor and manage browser storage for offline-first workspaces.
 */

export interface StorageQuotaInfo {
  usage: number;
  quota: number;
  usagePercent: number;
  available: number;
  isAvailable: boolean;
}

/**
 * Get current storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (!navigator.storage?.estimate) {
    return {
      usage: 0,
      quota: 0,
      usagePercent: 0,
      available: 0,
      isAvailable: false,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
    const available = quota - usage;

    return {
      usage,
      quota,
      usagePercent,
      available,
      isAvailable: true,
    };
  } catch (error) {
    console.error("Failed to estimate storage:", error);
    return {
      usage: 0,
      quota: 0,
      usagePercent: 0,
      available: 0,
      isAvailable: false,
    };
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes === Infinity || bytes === -1) return "Unlimited";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Check if storage is approaching quota limit
 */
export function isStorageWarningLevel(usagePercent: number): boolean {
  return usagePercent >= 80;
}

/**
 * Check if storage is critically full
 */
export function isStorageCritical(usagePercent: number): boolean {
  return usagePercent >= 95;
}

/**
 * Get storage status message
 */
export function getStorageStatusMessage(info: StorageQuotaInfo): string | null {
  if (!info.isAvailable) {
    return null;
  }

  if (isStorageCritical(info.usagePercent)) {
    return `Storage critically full: ${formatBytes(info.usage)} / ${formatBytes(info.quota)} (${info.usagePercent.toFixed(1)}%)`;
  }

  if (isStorageWarningLevel(info.usagePercent)) {
    return `Storage almost full: ${formatBytes(info.usage)} / ${formatBytes(info.quota)} (${info.usagePercent.toFixed(1)}%)`;
  }

  return null;
}

/**
 * Clear workspace from IndexedDB
 */
export async function clearWorkspaceStorage(roomId: string): Promise<void> {
  try {
    const dbName = `y-${roomId}`;
    await indexedDB.deleteDatabase(dbName);
    console.log(`🗑️ Cleared workspace storage: ${roomId}`);
  } catch (error) {
    console.error("Failed to clear workspace storage:", error);
    throw error;
  }
}

/**
 * List all y-indexeddb databases
 */
export async function listWorkspaceDatabases(): Promise<string[]> {
  if (!indexedDB.databases) {
    console.warn("IndexedDB.databases() not supported");
    return [];
  }

  try {
    const databases = await indexedDB.databases();
    return databases
      .filter((db) => db.name?.startsWith("y-"))
      .map((db) => db.name!)
      .sort();
  } catch (error) {
    console.error("Failed to list databases:", error);
    return [];
  }
}

/**
 * Estimate workspace storage size (approximate)
 */
export async function estimateWorkspaceSize(
  roomId: string
): Promise<number | null> {
  try {
    const dbName = `y-${roomId}`;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction(["updates"], "readonly");
    const store = transaction.objectStore("updates");
    const allKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let totalSize = 0;
    for (const key of allKeys) {
      const value = await new Promise<any>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (value instanceof Uint8Array) {
        totalSize += value.byteLength;
      } else if (value) {
        // Rough estimate for other types
        totalSize += JSON.stringify(value).length;
      }
    }

    db.close();
    return totalSize;
  } catch (error) {
    console.error("Failed to estimate workspace size:", error);
    return null;
  }
}
