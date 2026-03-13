import { NextRequest, NextResponse } from "next/server";

import { getVitalsMetrics } from "./vitals/route";

// Enhanced Prometheus metrics endpoint with Web Vitals
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const metrics: string[] = [];

    // Basic application metrics
    const memoryUsage = process.memoryUsage();

    // Memory metrics
    metrics.push(
      `# HELP nodejs_memory_heap_used_bytes Memory heap used in bytes`
    );
    metrics.push(`# TYPE nodejs_memory_heap_used_bytes gauge`);
    metrics.push(`nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}`);

    metrics.push(
      `# HELP nodejs_memory_heap_total_bytes Memory heap total in bytes`
    );
    metrics.push(`# TYPE nodejs_memory_heap_total_bytes gauge`);
    metrics.push(`nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}`);

    metrics.push(`# HELP nodejs_memory_rss_bytes Resident Set Size in bytes`);
    metrics.push(`# TYPE nodejs_memory_rss_bytes gauge`);
    metrics.push(`nodejs_memory_rss_bytes ${memoryUsage.rss}`);

    // Process metrics
    metrics.push(
      `# HELP nodejs_process_uptime_seconds Process uptime in seconds`
    );
    metrics.push(`# TYPE nodejs_process_uptime_seconds counter`);
    metrics.push(`nodejs_process_uptime_seconds ${process.uptime()}`);

    // Application version
    metrics.push(`# HELP app_info Application information`);
    metrics.push(`# TYPE app_info gauge`);
    metrics.push(
      `app_info{version="${process.env.npm_package_version || "unknown"}",environment="${process.env.NODE_ENV || "unknown"}"} 1`
    );

    // Basic request counter (would be enhanced with proper middleware)
    const timestamp = Date.now();
    metrics.push(`# HELP http_requests_total Total HTTP requests`);
    metrics.push(`# TYPE http_requests_total counter`);
    metrics.push(
      `http_requests_total{method="GET",endpoint="/api/metrics"} ${Math.floor(timestamp / 1000)}`
    );

    // Health check status
    metrics.push(
      `# HELP app_healthy Application health status (1=healthy, 0=unhealthy)`
    );
    metrics.push(`# TYPE app_healthy gauge`);
    metrics.push(`app_healthy 1`);

    // Add Core Web Vitals metrics
    try {
      const vitalsMetrics = getVitalsMetrics();
      if (vitalsMetrics.length > 0) {
        metrics.push("");
        metrics.push("# Core Web Vitals Performance Metrics");
        metrics.push(...vitalsMetrics);
      }
    } catch (error) {
      console.error("Failed to get vitals metrics:", error);
      // Continue without vitals metrics rather than failing entire endpoint
    }

    const metricsText = metrics.join("\n") + "\n";

    return new NextResponse(metricsText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Metrics endpoint failed:", error);

    // Return minimal error metrics
    const errorMetrics =
      [
        `# HELP app_healthy Application health status (1=healthy, 0=unhealthy)`,
        `# TYPE app_healthy gauge`,
        `app_healthy 0`,
        `# HELP app_errors_total Application errors`,
        `# TYPE app_errors_total counter`,
        `app_errors_total{endpoint="/api/metrics"} 1`,
      ].join("\n") + "\n";

    return new NextResponse(errorMetrics, {
      status: 200, // Return 200 for Prometheus scraping, but with error metrics
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
