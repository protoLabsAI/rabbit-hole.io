/**
 * Storage Estimation Utilities
 *
 * Estimate workspace storage usage and browser quota.
 */

/**
 * Check available browser storage
 */
export async function checkStorageAvailable(): Promise<{
  available: number;
  used: number;
  total: number;
  percentUsed: number;
}> {
  if (!navigator.storage?.estimate) {
    return { available: Infinity, used: 0, total: Infinity, percentUsed: 0 };
  }

  const { usage = 0, quota = Infinity } = await navigator.storage.estimate();

  return {
    available: quota - usage,
    used: usage,
    total: quota,
    percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
  };
}

/**
 * Estimate size of tab data
 */
export function estimateTabSize(tab: any): number {
  try {
    const serialized = JSON.stringify(tab.canvasData || {});
    return serialized.length * 2; // UTF-8 encoding approximation
  } catch {
    return 0;
  }
}
