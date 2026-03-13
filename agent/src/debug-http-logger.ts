/**
 * HTTP Request Logger for LangGraph Server Debugging
 *
 * Intercepts HTTP requests to log config parameters being sent to LangGraph Server.
 * Useful for debugging CopilotKit → LangGraph Server communication.
 *
 * ## Usage
 *
 * **Terminal 1:** Start LangGraph Server
 * ```bash
 * cd agent && pnpm dev  # Runs on port 8123
 * ```
 *
 * **Terminal 2:** Start HTTP Proxy Logger
 * ```bash
 * cd agent && pnpm dev:proxy-logger  # Runs on port 8124, forwards to 8123
 * ```
 *
 * **Terminal 3:** Update API route to use proxy
 * ```typescript
 * // In apps/rabbit-hole/app/api/research/deep-agent/route.ts
 * deploymentUrl: "http://localhost:8124"  // Temporarily use proxy instead of 8123
 * ```
 *
 * **Terminal 4:** Start Next.js
 * ```bash
 * pnpm dev
 * ```
 *
 * ## What It Logs
 *
 * - All HTTP requests (method, URL, headers)
 * - Request body with highlighted `config` object
 * - Checks for `recursionLimit` or `recursion_limit` parameters
 * - Full request/response flow
 *
 * ## Use Cases
 *
 * - Verify config parameters are being forwarded
 * - Debug LangGraph Server API communication
 * - Inspect request payloads from CopilotKit runtime
 * - Troubleshoot streaming or state issues
 *
 * ## Notes
 *
 * - Proxy adds minimal latency (~1-5ms)
 * - All requests are forwarded transparently
 * - Remember to revert deploymentUrl back to port 8123 when done
 */

import http from "http";

const TARGET_PORT = 8123;
const PROXY_PORT = 8124;

const server = http.createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    // Log the request
    console.log("\n========== HTTP REQUEST INTERCEPTED ==========");
    console.log(`${req.method} ${req.url}`);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log("Body:", JSON.stringify(parsed, null, 2));

        // Highlight config if present
        if (parsed.config) {
          console.log(
            "\n🔍 CONFIG OBJECT:",
            JSON.stringify(parsed.config, null, 2)
          );

          if (parsed.config.recursionLimit || parsed.config.recursion_limit) {
            console.log(
              "✅ recursionLimit FOUND:",
              parsed.config.recursionLimit || parsed.config.recursion_limit
            );
          } else {
            console.log("❌ recursionLimit NOT FOUND in config");
          }
        } else {
          console.log("❌ NO CONFIG OBJECT in request");
        }
      } catch (e) {
        console.log("Body (raw):", body);
      }
    }
    console.log("==============================================\n");

    // Forward to actual LangGraph Server
    const options = {
      hostname: "localhost",
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error("Proxy error:", err);
      res.writeHead(500);
      res.end("Proxy error");
    });

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`\n🔍 HTTP Logger Proxy running on port ${PROXY_PORT}`);
  console.log(`   Forwarding to LangGraph Server on port ${TARGET_PORT}`);
  console.log(
    `   Update LANGGRAPH_API_URL to http://localhost:${PROXY_PORT}\n`
  );
});
