import { useEffect } from "react";

import { initWebVitals } from "../../lib/performance/webVitals";

/**
 * React hook for initializing Web Vitals monitoring
 * Privacy-first performance tracking without user identification
 */
export function useWebVitals(): void {
  useEffect(() => {
    // Only initialize in browser environment
    if (typeof window === "undefined") return;

    // Initialize Web Vitals monitoring
    initWebVitals();
  }, []); // Empty dependency array - initialize once
}

/**
 * Hook for monitoring specific route performance
 * Useful for page-specific performance tracking
 */
export function useRoutePerformance(routeName?: string): {
  measureStart: () => number;
  measureEnd: (startTime: number, eventName?: string) => void;
} {
  const measureStart = (): number => {
    return performance.now();
  };

  const measureEnd = (startTime: number, eventName = "route_load"): void => {
    try {
      const duration = performance.now() - startTime;
      const currentRoute = routeName || window.location.pathname;

      // Send custom timing measurement
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/metrics/vitals",
          JSON.stringify({
            name: "TTFB" as const, // Use TTFB type for custom timings
            value: Math.round(duration),
            rating:
              duration < 1000
                ? "good"
                : duration < 3000
                  ? "needs-improvement"
                  : "poor",
            route: currentRoute,
            timestamp: Date.now(),
            eventName,
          })
        );
      }
    } catch (error) {
      // Fail silently - performance monitoring should never break the app
      console.warn("Route performance measurement failed:", error);
    }
  };

  return { measureStart, measureEnd };
}

/**
 * Hook for measuring component render performance
 */
export function useComponentPerformance(componentName: string): {
  startRender: () => void;
  endRender: () => void;
} {
  let renderStart = 0;

  const startRender = (): void => {
    renderStart = performance.now();
  };

  const endRender = (): void => {
    try {
      if (renderStart === 0) return;

      const renderDuration = performance.now() - renderStart;

      // Only report slow renders (>16ms = 60fps threshold)
      if (renderDuration > 16) {
        if ("sendBeacon" in navigator) {
          navigator.sendBeacon(
            "/api/metrics/vitals",
            JSON.stringify({
              name: "INP" as const, // Use INP type for interaction delays
              value: Math.round(renderDuration),
              rating:
                renderDuration < 100
                  ? "good"
                  : renderDuration < 300
                    ? "needs-improvement"
                    : "poor",
              route: `component:${componentName}`,
              timestamp: Date.now(),
              eventName: "component_render",
            })
          );
        }
      }

      renderStart = 0; // Reset
    } catch (error) {
      console.warn("Component performance measurement failed:", error);
    }
  };

  return { startRender, endRender };
}

export default useWebVitals;
