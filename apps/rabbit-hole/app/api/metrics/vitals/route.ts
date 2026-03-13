import { NextRequest, NextResponse } from "next/server";

/**
 * Anonymous Web Vitals collection endpoint
 * Privacy-first Core Web Vitals tracking without user identification
 */

interface WebVitalMetric {
  name: "CLS" | "INP" | "FCP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  route: string;
  timestamp: number;
}

// In-memory storage for development (production should use Redis/database)
const vitalsStore: Map<string, WebVitalMetric[]> = new Map();
const MAX_METRICS_PER_ROUTE = 1000; // Prevent memory overflow
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Store Web Vitals metric anonymously
 */
function storeVitalsMetric(metric: WebVitalMetric): void {
  const routeKey = metric.route;
  const existingMetrics = vitalsStore.get(routeKey) || [];

  // Add new metric
  existingMetrics.push(metric);

  // Keep only recent metrics to prevent memory issues
  if (existingMetrics.length > MAX_METRICS_PER_ROUTE) {
    existingMetrics.splice(0, existingMetrics.length - MAX_METRICS_PER_ROUTE);
  }

  vitalsStore.set(routeKey, existingMetrics);
}

/**
 * Get aggregated Web Vitals metrics for Prometheus
 */
export function getVitalsMetrics(): string[] {
  const metrics: string[] = [];
  const now = Date.now();

  // Aggregate metrics by route and type
  const aggregated: Record<string, Record<string, number[]>> = {};

  for (const [route, routeMetrics] of vitalsStore.entries()) {
    // Only include metrics from last 24 hours
    const recentMetrics = routeMetrics.filter(
      (m) => now - m.timestamp < CLEANUP_INTERVAL
    );

    if (!aggregated[route]) {
      aggregated[route] = {};
    }

    for (const metric of recentMetrics) {
      if (!aggregated[route][metric.name]) {
        aggregated[route][metric.name] = [];
      }
      aggregated[route][metric.name].push(metric.value);
    }
  }

  // Generate Prometheus metrics
  for (const [route, routeData] of Object.entries(aggregated)) {
    for (const [metricName, values] of Object.entries(routeData)) {
      if (values.length === 0) continue;

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const p95 =
        values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0;
      const max = Math.max(...values);

      // Clean route label for Prometheus
      const cleanRoute = route.replace(/[^a-zA-Z0-9_]/g, "_");
      const cleanMetric = metricName.toLowerCase();

      metrics.push(
        `# HELP web_vitals_${cleanMetric}_avg Average ${metricName} by route`,
        `# TYPE web_vitals_${cleanMetric}_avg gauge`,
        `web_vitals_${cleanMetric}_avg{route="${cleanRoute}"} ${avg.toFixed(2)}`
      );

      metrics.push(
        `# HELP web_vitals_${cleanMetric}_p95 95th percentile ${metricName} by route`,
        `# TYPE web_vitals_${cleanMetric}_p95 gauge`,
        `web_vitals_${cleanMetric}_p95{route="${cleanRoute}"} ${p95.toFixed(2)}`
      );

      metrics.push(
        `# HELP web_vitals_${cleanMetric}_max Maximum ${metricName} by route`,
        `# TYPE web_vitals_${cleanMetric}_max gauge`,
        `web_vitals_${cleanMetric}_max{route="${cleanRoute}"} ${max.toFixed(2)}`
      );

      metrics.push(
        `# HELP web_vitals_${cleanMetric}_count Count of ${metricName} measurements`,
        `# TYPE web_vitals_${cleanMetric}_count counter`,
        `web_vitals_${cleanMetric}_count{route="${cleanRoute}"} ${values.length}`
      );
    }
  }

  return metrics;
}

/**
 * POST endpoint for receiving Web Vitals metrics
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Privacy-first headers
    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };

    // Parse and validate the metric
    const rawMetric = await request.json();

    // Validate required fields
    if (!rawMetric.name || !rawMetric.value || !rawMetric.route) {
      return new NextResponse("Invalid metric data", {
        status: 400,
        headers,
      });
    }

    // Sanitize and validate the metric
    const metric: WebVitalMetric = {
      name: rawMetric.name,
      value: Math.round(parseFloat(rawMetric.value) || 0),
      rating: rawMetric.rating || "poor",
      route: String(rawMetric.route).substring(0, 100), // Limit route length
      timestamp: Date.now(), // Use server timestamp
    };

    // Validate metric name
    const validMetrics = ["CLS", "INP", "FCP", "LCP", "TTFB"];
    if (!validMetrics.includes(metric.name)) {
      return new NextResponse("Invalid metric name", {
        status: 400,
        headers,
      });
    }

    // Validate metric value
    if (isNaN(metric.value) || metric.value < 0 || metric.value > 60000) {
      return new NextResponse("Invalid metric value", {
        status: 400,
        headers,
      });
    }

    // Store the metric anonymously
    storeVitalsMetric(metric);

    return new NextResponse("OK", {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(
      "Web Vitals collection error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}

/**
 * GET endpoint for retrieving aggregated metrics (for internal use)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const aggregatedMetrics: Record<string, any> = {};

    for (const [route, metrics] of vitalsStore.entries()) {
      // Only include metrics from last hour for real-time monitoring
      const recentMetrics = metrics.filter(
        (m) => Date.now() - m.timestamp < 60 * 60 * 1000
      );

      if (recentMetrics.length === 0) continue;

      const routeMetrics: Record<string, any> = {};
      const metricsByType: Record<string, number[]> = {};

      // Group by metric type
      for (const metric of recentMetrics) {
        if (!metricsByType[metric.name]) {
          metricsByType[metric.name] = [];
        }
        metricsByType[metric.name].push(metric.value);
      }

      // Calculate statistics
      for (const [metricName, values] of Object.entries(metricsByType)) {
        if (values.length === 0) continue;

        const sorted = values.sort((a, b) => a - b);
        routeMetrics[metricName] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
          p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
          p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
        };
      }

      aggregatedMetrics[route] = routeMetrics;
    }

    return NextResponse.json(aggregatedMetrics, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Vitals metrics retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve metrics" },
      { status: 500 }
    );
  }
}

// Cleanup old metrics periodically (in production, use a proper job scheduler)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [route, metrics] of vitalsStore.entries()) {
      const recentMetrics = metrics.filter(
        (m) => now - m.timestamp < CLEANUP_INTERVAL
      );
      vitalsStore.set(route, recentMetrics);
    }
  }, CLEANUP_INTERVAL);
}
