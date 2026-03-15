/**
 * Next.js Instrumentation - Server Startup Hooks
 *
 * Runs once when the Next.js server starts (before any requests).
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

/**
 * Register server startup hook
 * Runs once per server instance initialization
 */
export async function register() {
  // Only run on server (not in edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initializeDomains } = await import("./app/domain-loader");

      // Initialize custom domains from auto-discovery system (RAB-15/16)
      // Must run before application starts handling requests
      // Synchronous registration with pre-compiled TypeScript configs
      await initializeDomains();
    } catch (error) {
      // Swallow errors to allow server startup even if domain init fails
      // During build: generated files may not exist yet (prebuild runs scanner)
      // During runtime: bad domain configs should not crash the server

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Always log domain initialization failures
      console.error("⚠️  Domain initialization failed:", errorMessage);

      if (process.env.NODE_ENV === "production") {
        // Production: Log full error for debugging
        console.error("   Error details:", error);
      } else {
        // Development/Build: Include stack trace
        const errorStack = error instanceof Error ? error.stack : "";
        console.error("   Stack:", errorStack);

        // Only show build message during actual build/prebuild
        if (
          process.env.PREBUILD === "true" ||
          process.env.npm_lifecycle_event?.includes("build")
        ) {
          console.log(
            "   ℹ️  This is expected during build - scanner runs in prebuild hook"
          );
        }
      }

      // Do not rethrow - server continues without custom domains
    }
  }
}
