"use client";

import { useEffect } from "react";

import { useWebVitals } from "../hooks/ui/useWebVitals";

/**
 * Web Vitals Monitor Component
 * Initializes privacy-first Core Web Vitals tracking
 * No user identification or tracking data collected
 */
export function WebVitalsMonitor(): null {
  // Initialize Web Vitals monitoring
  useWebVitals();

  useEffect(() => {
    // Additional performance monitoring setup
    if (typeof window !== "undefined") {
      // Monitor unhandled errors that might affect performance
      window.addEventListener("error", (event) => {
        // Report performance-impacting errors (without sensitive data)
        if ("sendBeacon" in navigator) {
          navigator.sendBeacon(
            "/api/metrics/vitals",
            JSON.stringify({
              name: "INP" as const,
              value: 1000, // High value to indicate error impact
              rating: "poor",
              route: window.location.pathname,
              timestamp: Date.now(),
              eventName: "javascript_error",
            })
          );
        }
      });

      // Monitor resource loading performance
      if ("PerformanceObserver" in window) {
        try {
          const resourceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            for (const entry of entries) {
              if (entry.entryType === "resource") {
                // Report slow resource loading (>3 seconds)
                if (entry.duration > 3000) {
                  if ("sendBeacon" in navigator) {
                    navigator.sendBeacon(
                      "/api/metrics/vitals",
                      JSON.stringify({
                        name: "TTFB" as const,
                        value: Math.round(entry.duration),
                        rating: "poor",
                        route: `resource:${entry.name.split("/").pop()?.split("?")[0] || "unknown"}`,
                        timestamp: Date.now(),
                        eventName: "slow_resource",
                      })
                    );
                  }
                }
              }
            }
          });

          resourceObserver.observe({ entryTypes: ["resource"] });

          // Cleanup observer on unmount
          return () => {
            resourceObserver.disconnect();
          };
        } catch (error) {
          // PerformanceObserver not supported or failed
          console.warn("Resource performance monitoring not available:", error);
        }
      }
    }
  }, []);

  // This component renders nothing but sets up monitoring
  return null;
}

export default WebVitalsMonitor;
