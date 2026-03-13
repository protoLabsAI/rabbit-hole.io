/**
 * React Hook for Real-Time Job Completion Notifications
 *
 * Uses Server-Sent Events (SSE) via PostgreSQL LISTEN/NOTIFY
 * for sub-100ms job completion notifications.
 */

import { useEffect, useState } from "react";

export interface JobCompletionNotification {
  jobId: string;
  status: "completed" | "failed";
  userId: string;
  workspaceId: string;
  queue: string;
  completedAt?: string;
  error?: string;
}

interface UseJobNotificationsOptions {
  enabled?: boolean;
  onNotification?: (notification: JobCompletionNotification) => void;
}

/**
 * Subscribe to real-time job completion notifications
 *
 * @example
 * const { notifications, isConnected } = useJobNotifications({
 *   onNotification: (notif) => {
 *     toast.success(`Job ${notif.jobId} completed!`);
 *   },
 * });
 */
export function useJobNotifications(options: UseJobNotificationsOptions = {}) {
  const { enabled = true, onNotification } = options;

  const [notifications, setNotifications] = useState<
    JobCompletionNotification[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        eventSource = new EventSource("/api/jobs/subscribe");

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(
              event.data
            ) as JobCompletionNotification;

            setNotifications((prev) => [...prev, notification]);

            if (onNotification) {
              onNotification(notification);
            }
          } catch (err) {
            console.error("Failed to parse SSE message:", err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();

          // Auto-reconnect after 5s
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 5000);
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [enabled, onNotification]);

  return {
    notifications,
    isConnected,
    error,
  };
}

/**
 * Subscribe to a specific job's completion notification
 *
 * @example
 * useJobCompletionNotification(jobId, (result) => {
 *   console.log("Job completed with result:", result);
 * });
 */
export function useJobCompletionNotification(
  jobId: string | null,
  onComplete: (notification: JobCompletionNotification) => void
) {
  useJobNotifications({
    enabled: !!jobId,
    onNotification: (notification) => {
      if (notification.jobId === jobId) {
        onComplete(notification);
      }
    },
  });
}
