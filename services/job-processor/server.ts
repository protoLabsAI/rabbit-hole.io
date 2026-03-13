#!/usr/bin/env node
/**
 * Job Processor Server
 *
 * Standalone server for running Sidequest.js background jobs
 * Run with: pnpm run jobs:start
 */

import http from "node:http";

import { createAPIServer } from "./api-server.js";

import { startJobProcessor, stopJobProcessor } from "./index.js";

// Simple HTTP server for health checks
function createHealthServer(port: number) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  // Handle port already in use error
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${port} is already in use. Please either:\n` +
          `   1. Change the port using HEALTH_PORT environment variable\n` +
          `   2. Kill the process using port ${port}: lsof -ti:${port} | xargs kill -9`
      );
      process.exit(1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`🏥 Health check server running on port ${port}`);
  });

  return server;
}

async function main() {
  console.log("🔧 Initializing job processor service...");

  try {
    // Start the job processor (job classes registered internally)
    const status = await startJobProcessor();

    console.log("🎉 Job processor is running!");
    console.log(JSON.stringify(status, null, 2));

    // Parse and validate ports
    const apiPortEnv = process.env.API_PORT
      ? parseInt(process.env.API_PORT, 10)
      : NaN;
    const apiPort =
      Number.isInteger(apiPortEnv) && apiPortEnv > 0 && apiPortEnv <= 65535
        ? apiPortEnv
        : 8680;

    const healthPortEnv = process.env.HEALTH_PORT
      ? parseInt(process.env.HEALTH_PORT, 10)
      : NaN;
    const healthPort =
      Number.isInteger(healthPortEnv) &&
      healthPortEnv > 0 &&
      healthPortEnv <= 65535
        ? healthPortEnv
        : 8679;

    // Validate ports are not the same
    if (apiPort === healthPort) {
      console.error(
        `❌ Port conflict: API_PORT and HEALTH_PORT cannot be the same (${apiPort})\n` +
          `   Set different ports using environment variables:\n` +
          `   - API_PORT=${apiPort}\n` +
          `   - HEALTH_PORT=${healthPort === 8679 ? 8678 : 8679}`
      );
      await stopJobProcessor();
      process.exit(1);
    }

    // Start servers with proper error handling
    let apiServer: http.Server;
    let healthServer: http.Server;

    try {
      apiServer = createAPIServer(apiPort);
      healthServer = createHealthServer(healthPort);
    } catch (error) {
      console.error("❌ Failed to start API/health servers:", error);
      await stopJobProcessor();
      process.exit(1);
    }

    // Graceful shutdown with idempotency guard
    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) {
        console.log("Shutdown already in progress, ignoring duplicate signal");
        return;
      }
      isShuttingDown = true;

      console.log("Shutting down gracefully...");

      try {
        // Close API server with promise wrapper
        await new Promise<void>((resolve, reject) => {
          apiServer.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Close health server with promise wrapper
        await new Promise<void>((resolve, reject) => {
          healthServer.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Stop job processor
        await stopJobProcessor();

        console.log("Shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Register signals with once() to prevent duplicate calls
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);

    // Keep process alive
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught exception:", error);
      shutdown();
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled rejection at:", promise, "reason:", reason);
      shutdown();
    });
  } catch (error) {
    console.error("💥 Failed to start job processor:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});

export { main };
