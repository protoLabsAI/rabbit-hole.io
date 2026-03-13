/**
 * Suppress CopilotKit/GraphQL Yoga Debug Logs
 *
 * CopilotKit uses GraphQL Yoga internally which outputs verbose debug logs.
 * This utility patches the logging infrastructure to suppress these logs
 * while preserving other debug output.
 *
 * Import this at the top of any CopilotKit route file.
 */

// Patch console methods to filter CopilotKit debug logs
const suppressCopilotKitLogs = () => {
  // Track if already patched
  if ((global as any).__copilotkit_logs_suppressed) {
    return;
  }
  (global as any).__copilotkit_logs_suppressed = true;

  // Patch console.debug
  const originalDebug = console.debug;
  console.debug = (...args: any[]) => {
    const message = String(args[0] || "");
    if (
      message.includes("DEBUG:") &&
      (message.includes("GraphQL") ||
        message.includes("Yoga") ||
        message.includes("CopilotResolver") ||
        message.includes("Processing GraphQL") ||
        message.includes("Building GraphQL") ||
        message.includes("Creating GraphQL") ||
        message.includes("Parsing request"))
    ) {
      return;
    }
    originalDebug.apply(console, args);
  };

  // Patch console.log for structured logs
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const message = String(args[0] || "");
    if (
      message.includes("[DEBUG]") ||
      (message.includes("DEBUG:") &&
        (message.includes("GraphQL") ||
          message.includes("Yoga") ||
          message.includes("CopilotResolver") ||
          message.includes("component:")))
    ) {
      return;
    }
    originalLog.apply(console, args);
  };

  // Patch process.stdout.write for direct writes
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: any, ...args: any[]): any => {
    const message = String(chunk);
    if (
      message.includes("DEBUG:") &&
      (message.includes("GraphQL") ||
        message.includes("Yoga") ||
        message.includes("CopilotResolver") ||
        message.includes("component:") ||
        message.includes("Building GraphQL") ||
        message.includes("Creating GraphQL") ||
        message.includes("Parsing request") ||
        message.includes("Processing GraphQL"))
    ) {
      return true;
    }
    return originalStdoutWrite(chunk, ...args);
  }) as any;

  // Patch process.stderr.write for error stream
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: any, ...args: any[]): any => {
    const message = String(chunk);
    if (
      message.includes("DEBUG:") &&
      (message.includes("GraphQL") ||
        message.includes("Yoga") ||
        message.includes("CopilotResolver") ||
        message.includes("component:"))
    ) {
      return true;
    }
    return originalStderrWrite(chunk, ...args);
  }) as any;
};

// Only suppress in development (production doesn't log debug anyway)
if (process.env.NODE_ENV !== "production") {
  suppressCopilotKitLogs();
}

export { suppressCopilotKitLogs };
