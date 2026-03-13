/**
 * Storage Quota Hook
 *
 * Monitor browser IndexedDB quota for free tier users.
 * Provides warnings when approaching storage limits.
 */

import { useEffect, useState } from "react";

import { checkStorageAvailable } from "@proto/utils";

export interface StorageQuotaState {
  available: number;
  used: number;
  total: number;
  percentUsed: number;
  warning: boolean; // >80%
  critical: boolean; // >90%
  blocked: boolean; // >95%
  ready: boolean;
}

/**
 * Monitor browser storage quota
 */
export function useStorageQuota(refreshInterval = 30000): StorageQuotaState {
  const [state, setState] = useState<StorageQuotaState>({
    available: Infinity,
    used: 0,
    total: Infinity,
    percentUsed: 0,
    warning: false,
    critical: false,
    blocked: false,
    ready: false,
  });

  useEffect(() => {
    const updateQuota = async () => {
      const quota = await checkStorageAvailable();

      setState({
        ...quota,
        warning: quota.percentUsed >= 80,
        critical: quota.percentUsed >= 90,
        blocked: quota.percentUsed >= 95,
        ready: true,
      });
    };

    updateQuota();

    const interval = setInterval(updateQuota, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return state;
}
