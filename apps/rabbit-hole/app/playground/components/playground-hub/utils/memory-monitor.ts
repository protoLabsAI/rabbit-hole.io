/**
 * Memory Monitor Utility
 *
 * Optional utility for tracking memory usage (development only).
 * Only works in Chrome/Edge with performance.memory API.
 */

/**
 * Log current memory usage
 */
export function logMemoryUsage(label: string) {
  if (
    typeof window === "undefined" ||
    !("performance" in window) ||
    !("memory" in performance)
  ) {
    return;
  }

  const memory = (
    performance as {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }
  ).memory;
  if (!memory) return;
  console.log(`[Memory] ${label}:`, {
    usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
  });
}

/**
 * Wrap a function with memory logging
 */
export function withMemoryLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  label: string
): T {
  return ((...args: unknown[]) => {
    logMemoryUsage(`Before ${label}`);
    const result = fn(...args);

    // Log after async completion if promise
    if (result instanceof Promise) {
      return result.then((value) => {
        logMemoryUsage(`After ${label}`);
        return value;
      });
    }

    logMemoryUsage(`After ${label}`);
    return result;
  }) as T;
}
