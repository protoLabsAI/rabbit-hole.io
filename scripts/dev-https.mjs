#!/usr/bin/env node

/**
 * HTTPS Development Server for Next.js
 *
 * Runs Next.js dev server with HTTPS using local SSL certificates.
 * Certificates must be generated first using: pnpm run ssl:setup
 */

import fs from "fs";
import { createServer } from "https";
import path from "path";
import { parse, fileURLToPath } from "url";

import next from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Path to SSL certificates
const certDir = path.join(__dirname, "..", "certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");

// Check if certificates exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error("");
  console.error("❌ SSL certificates not found!");
  console.error("");
  console.error("📁 Expected location:");
  console.error(`   - ${certPath}`);
  console.error(`   - ${keyPath}`);
  console.error("");
  console.error("🔧 Generate certificates by running:");
  console.error("   pnpm run ssl:setup");
  console.error("");
  process.exit(1);
}

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;

    console.log("");
    console.log("🔐 HTTPS Development Server");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log(`✅ Server ready at:`);
    console.log(`   🏠 https://localhost:${port}`);
    console.log(`   🌐 https://192.168.4.234:${port}`);
    console.log("");
    console.log(`📝 Environment: ${dev ? "development" : "production"}`);
    console.log(`🔒 SSL certificates: ${certDir}`);
    console.log("");
    console.log("Press Ctrl+C to stop");
    console.log("");
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("");
    console.log("🛑 Shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });
});
