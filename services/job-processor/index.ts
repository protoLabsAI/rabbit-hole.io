/**
 * Sidequest.js Job Processor Service
 *
 * Background job processing for file processing, text extraction, and AI analysis
 */

import { Sidequest } from "sidequest";

import { registerJobClasses } from "./job-registry.js";

// Get dashboard port from environment or use default
const dashboardPort = process.env.DASHBOARD_PORT
  ? parseInt(process.env.DASHBOARD_PORT)
  : 8678;

// Sidequest configuration
const config = {
  backend: {
    driver: "@sidequest/postgres-backend",
    config:
      process.env.DATABASE_URL || process.env.JOB_QUEUE_DATABASE_URL || "",
  },
  dashboard: {
    enabled: true,
    port: dashboardPort,
  },
  workers: process.env.JOB_WORKERS ? parseInt(process.env.JOB_WORKERS) : 3,
  queues: [
    {
      name: "youtube-processing",
      concurrency: 2,
    },
    {
      name: "file-processing",
      concurrency: 3,
    },
    {
      name: "langextract-processing",
      concurrency: 5, // gemini-2.5-flash-lite supports 122 RPM (5 workers = ~60 req/min)
    },
    {
      name: "media-ingestion",
      concurrency: 3,
    },
  ],
  // Enable manual job resolution to fix Docker/ESM module resolution
  manualJobResolution: true,
  jobsFilePath: "./sidequest.jobs.js",
};

export async function startJobProcessor() {
  try {
    // Register job classes BEFORE starting Sidequest
    registerJobClasses();

    console.log("🚀 Starting Sidequest.js job processor...");
    console.log(`   Database: ${config.backend.config}`);
    console.log(`   Workers: ${config.workers}`);
    console.log(`   Queues: ${config.queues.map((q) => q.name).join(", ")}`);

    await Sidequest.start(config);

    console.log("✅ Job processor started successfully");
    console.log(`📊 Dashboard: http://localhost:${config.dashboard.port}`);

    return {
      status: "running",
      dashboard: `http://localhost:${config.dashboard.port}`,
      config: {
        backend: config.backend.driver,
        dashboard: config.dashboard.enabled,
        workers: config.workers,
        queues: config.queues.map((q) => q.name),
      },
    };
  } catch (error) {
    console.error("❌ Failed to start job processor:", error);
    throw error;
  }
}

export async function stopJobProcessor() {
  try {
    console.log("🛑 Stopping job processor...");
    await Sidequest.stop();
    console.log("✅ Job processor stopped");
  } catch (error) {
    console.error("❌ Error stopping job processor:", error);
  }
}
