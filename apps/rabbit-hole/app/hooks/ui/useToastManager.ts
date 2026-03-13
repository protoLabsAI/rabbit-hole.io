/**
 * Toast Manager Hook
 *
 * Manages toast notifications with convenience methods for different types.
 * Provides access to the notification queue and control functions.
 */

import { useCallback } from "react";

import { useUIStore } from "../../context/store/useUIStore";

/**
 * Hook for managing toast notifications
 *
 * @returns Notification state and management functions
 */
export function useToastManager() {
  const notifications = useUIStore((s) => s.notifications.items);
  const showToast = useUIStore((s) => s.showToast);
  const removeToast = useUIStore((s) => s.dismissToast);
  const clearAllToasts = useUIStore((s) => s.clearAllToasts);

  // Convenience methods for different toast types
  const success = useCallback(
    (title: string, message?: string) => showToast("success", title, message),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => showToast("error", title, message),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => showToast("info", title, message),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => showToast("warning", title, message),
    [showToast]
  );

  return {
    notifications,
    showToast,
    removeToast,
    clearAll: clearAllToasts,

    // Convenience methods
    success,
    error,
    info,
    warning,
  };
}
