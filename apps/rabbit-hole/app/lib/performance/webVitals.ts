import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

/**
 * Core Web Vitals metric interface
 * Anonymized for privacy-first tracking
 */
export interface WebVitalsMetric {
  id: string;
  name: "CLS" | "INP" | "FCP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  route: string;
}

/**
 * Sanitize route for privacy compliance
 * Removes query parameters and sensitive identifiers
 */
function sanitizeRoute(route: string): string {
  return route
    .split("?")[0] // Remove query parameters
    .replace(/\/[a-f0-9-]{36}/g, "/[id]") // Replace UUIDs
    .replace(/\/\d+/g, "/[number]") // Replace numeric IDs
    .replace(/\/[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+/g, "/[slug]") // Replace slugs
    .toLowerCase();
}

/**
 * Send Web Vitals metric to server (anonymously)
 * No user identification or tracking data
 */
async function sendVitalsMetric(metric: WebVitalsMetric): Promise<void> {
  try {
    // Respect Do Not Track preference
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
      return;
    }

    // Create anonymous metric payload
    const anonymousMetric = {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      route: sanitizeRoute(metric.route),
      timestamp: Date.now(),
      // NO user identification, IP tracking, or personal data
    };

    // Use sendBeacon for reliable delivery (fallback to fetch)
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/metrics/vitals",
        JSON.stringify(anonymousMetric)
      );
    } else {
      // Fallback for environments without sendBeacon
      fetch("/api/metrics/vitals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(anonymousMetric),
        keepalive: true,
      }).catch(() => {
        // Fail silently - analytics should never break user experience
      });
    }
  } catch {
    // Silently fail - analytics should never break user experience
  }
}

/**
 * Get performance rating based on Core Web Vitals thresholds
 * Based on Google's official thresholds
 */
function getPerformanceRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const thresholds = {
    CLS: [0.1, 0.25], // Good: <= 0.1, Poor: > 0.25
    INP: [200, 500], // Good: <= 200ms, Poor: > 500ms
    FCP: [1800, 3000], // Good: <= 1.8s, Poor: > 3s
    LCP: [2500, 4000], // Good: <= 2.5s, Poor: > 4s
    TTFB: [800, 1800], // Good: <= 800ms, Poor: > 1.8s
  };

  const [good, poor] = thresholds[name as keyof typeof thresholds] || [0, 0];

  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

/**
 * Initialize Core Web Vitals monitoring
 * Collects and reports all vital metrics anonymously
 */
export function initWebVitals(): void {
  try {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    const currentRoute = window.location.pathname;

    // Cumulative Layout Shift
    onCLS((metric) => {
      const vitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: "CLS",
        value: metric.value,
        rating: getPerformanceRating("CLS", metric.value),
        timestamp: Date.now(),
        route: currentRoute,
      };
      sendVitalsMetric(vitalsMetric);
    });

    // Interaction to Next Paint (replaces FID)
    onINP((metric) => {
      const vitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: "INP",
        value: metric.value,
        rating: getPerformanceRating("INP", metric.value),
        timestamp: Date.now(),
        route: currentRoute,
      };
      sendVitalsMetric(vitalsMetric);
    });

    // First Contentful Paint
    onFCP((metric) => {
      const vitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: "FCP",
        value: metric.value,
        rating: getPerformanceRating("FCP", metric.value),
        timestamp: Date.now(),
        route: currentRoute,
      };
      sendVitalsMetric(vitalsMetric);
    });

    // Largest Contentful Paint
    onLCP((metric) => {
      const vitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: "LCP",
        value: metric.value,
        rating: getPerformanceRating("LCP", metric.value),
        timestamp: Date.now(),
        route: currentRoute,
      };
      sendVitalsMetric(vitalsMetric);
    });

    // Time to First Byte
    onTTFB((metric) => {
      const vitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: "TTFB",
        value: metric.value,
        rating: getPerformanceRating("TTFB", metric.value),
        timestamp: Date.now(),
        route: currentRoute,
      };
      sendVitalsMetric(vitalsMetric);
    });
  } catch {
    // Silently fail - performance monitoring should never break the app
  }
}

/**
 * React hook for Web Vitals monitoring
 * Can be used in components that need performance tracking
 */
export function useWebVitals(): void {
  if (typeof window !== "undefined") {
    // Initialize on mount
    initWebVitals();
  }
}

/**
 * Manual performance measurement utilities
 */
export const PerformanceUtils = {
  /**
   * Measure and report custom timing
   */
  measureTiming: (name: string, startTime: number): void => {
    try {
      const duration = performance.now() - startTime;
      const metric: WebVitalsMetric = {
        id: `custom-${Date.now()}`,
        name: "TTFB", // Use TTFB as closest match for custom timing
        value: duration,
        rating: getPerformanceRating("TTFB", duration),
        timestamp: Date.now(),
        route: window.location.pathname,
      };
      sendVitalsMetric(metric);
    } catch {
      // Silently fail
    }
  },

  /**
   * Get current Core Web Vitals performance summary
   */
  getPerformanceSummary: (): Promise<Record<string, number>> => {
    return new Promise((resolve) => {
      const summary: Record<string, number> = {};

      // Get navigation timing data
      if ("performance" in window && "timing" in performance) {
        const timing = performance.timing;
        summary.ttfb = timing.responseStart - timing.fetchStart;
        summary.domContentLoaded =
          timing.domContentLoadedEventEnd - timing.fetchStart;
        summary.windowLoad = timing.loadEventEnd - timing.fetchStart;
      }

      resolve(summary);
    });
  },
};

const webVitalsModule = {
  init: initWebVitals,
  useWebVitals,
  PerformanceUtils,
};

export default webVitalsModule;
