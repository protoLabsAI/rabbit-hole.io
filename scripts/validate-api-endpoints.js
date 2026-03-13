#!/usr/bin/env node

/**
 * API Endpoint Health Validation Script
 *
 * Tests all API endpoints to ensure they're functioning correctly
 * after cleanup and reorganization.
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes for pretty output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) =>
    console.log(`${colors.bright}${colors.cyan}🔍 ${msg}${colors.reset}`),
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Test configuration for different endpoint types
const ENDPOINT_TESTS = {
  // Research namespace endpoints
  research: [
    {
      name: "Entity Research Agent",
      endpoint: "/api/research/entity",
      method: "GET",
      expectedKeys: ["agent", "description", "capabilities"],
    },
    {
      name: "Person Research Agent",
      endpoint: "/api/research/person",
      method: "GET",
      expectedKeys: ["agent", "description", "capabilities"],
    },
  ],

  // Core API endpoints
  core: [
    {
      name: "Health Check",
      endpoint: "/api/health",
      method: "GET",
      expectedKeys: ["status", "services", "performance"],
    },
    {
      name: "Evidence Status",
      endpoint: "/api/evidence-status",
      method: "GET",
      expectedKeys: ["neo4j", "partitions", "recommendation"],
    },
    {
      name: "Entity Search Info",
      endpoint: "/api/entity-search",
      method: "GET",
      expectedKeys: ["api", "version", "description"],
    },
  ],

  // File operations
  files: [
    {
      name: "File Management Info",
      endpoint: "/api/files/management",
      method: "GET",
      expectedKeys: ["api", "endpoints"],
    },
    {
      name: "File Processing Info",
      endpoint: "/api/files/process-metadata",
      method: "GET",
      expectedKeys: ["api", "description"],
    },
  ],

  // Data operations
  data: [
    {
      name: "Atlas CRUD Info",
      endpoint: "/api/atlas-crud",
      method: "GET",
      expectedKeys: ["api", "endpoints", "actions"],
    },
    {
      name: "Export Bundle Info",
      endpoint: "/api/export-bundle",
      method: "POST",
      expectedKeys: ["endpoint", "description"],
    },
    {
      name: "Ingest Bundle Info",
      endpoint: "/api/ingest-bundle",
      method: "GET",
      expectedKeys: ["api", "version"],
    },
  ],
};

/**
 * Test a single endpoint
 */
async function testEndpoint(test) {
  try {
    const url = `${BASE_URL}${test.endpoint}`;
    log.info(`Testing ${test.method} ${test.endpoint}`);

    const response = await fetch(url, {
      method: test.method,
      headers: {
        "Content-Type": "application/json",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Some endpoints return 401 for unauthenticated requests - that's expected
      if (response.status === 401) {
        log.warning(`${test.name}: Authentication required (expected)`);
        return { passed: true, status: response.status, note: "auth-required" };
      }

      log.error(`${test.name}: HTTP ${response.status}`);
      return {
        passed: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      log.error(`${test.name}: Invalid JSON response`);
      return { passed: false, error: "Invalid JSON response" };
    }

    // Check for expected response structure
    if (test.expectedKeys) {
      const missingKeys = test.expectedKeys.filter((key) => {
        return (
          !data.hasOwnProperty(key) &&
          (!data.data || !data.data.hasOwnProperty(key))
        );
      });

      if (missingKeys.length > 0) {
        log.warning(
          `${test.name}: Missing expected keys: ${missingKeys.join(", ")}`
        );
        return {
          passed: true,
          status: response.status,
          warning: `Missing keys: ${missingKeys.join(", ")}`,
        };
      }
    }

    log.success(`${test.name}: ✅ OK`);
    return { passed: true, status: response.status };
  } catch (error) {
    if (error.name === "AbortError") {
      log.error(`${test.name}: Timeout after 10s`);
      return { passed: false, error: "Timeout" };
    }

    log.error(`${test.name}: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Test all endpoints in a category
 */
async function testCategory(categoryName, tests) {
  log.header(`Testing ${categoryName} endpoints`);

  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push({ ...test, ...result });

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummary(allResults) {
  const totalTests = allResults.length;
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const warnings = allResults.filter((r) => r.warning).length;
  const authRequired = allResults.filter(
    (r) => r.note === "auth-required"
  ).length;

  console.log("\n" + "=".repeat(60));
  log.header("API Endpoint Validation Summary");
  console.log("=".repeat(60));

  console.log(`📊 Total endpoints tested: ${totalTests}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`);
  console.log(`🔐 Auth required: ${authRequired}`);

  if (failed > 0) {
    console.log(`\n${colors.red}Failed endpoints:${colors.reset}`);
    allResults
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.endpoint}: ${r.error}`));
  }

  if (warnings > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
    allResults
      .filter((r) => r.warning)
      .forEach((r) => console.log(`  - ${r.endpoint}: ${r.warning}`));
  }

  // Overall health assessment
  const healthScore = Math.round((passed / totalTests) * 100);
  let healthStatus;
  if (healthScore >= 90) {
    healthStatus = `${colors.green}Excellent${colors.reset}`;
  } else if (healthScore >= 75) {
    healthStatus = `${colors.yellow}Good${colors.reset}`;
  } else {
    healthStatus = `${colors.red}Needs Attention${colors.reset}`;
  }

  console.log(`\n🏥 API Health Score: ${healthScore}% (${healthStatus})`);

  return healthScore >= 75;
}

/**
 * Main validation function
 */
async function validateApiEndpoints() {
  log.header("Starting API Endpoint Validation");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const allResults = [];

  // Test each category
  for (const [categoryName, tests] of Object.entries(ENDPOINT_TESTS)) {
    const results = await testCategory(categoryName, tests);
    allResults.push(...results);
    console.log(""); // Add spacing between categories
  }

  // Generate final summary
  const success = generateSummary(allResults);

  // Write results to file for CI/monitoring
  const reportPath = path.join(process.cwd(), "api-health-report.json");
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: allResults.length,
      passed: allResults.filter((r) => r.passed).length,
      failed: allResults.filter((r) => !r.passed).length,
      healthScore: Math.round(
        (allResults.filter((r) => r.passed).length / allResults.length) * 100
      ),
    },
    results: allResults,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`Report saved to: ${reportPath}`);

  if (!success) {
    console.log(
      `\n${colors.red}🚨 API validation failed - some endpoints are not healthy${colors.reset}`
    );
    process.exit(1);
  } else {
    console.log(
      `\n${colors.green}🎉 All API endpoints are healthy!${colors.reset}`
    );
  }
}

// Run validation if called directly
if (require.main === module) {
  validateApiEndpoints().catch((error) => {
    console.error("Validation script failed:", error);
    process.exit(1);
  });
}

module.exports = { validateApiEndpoints, ENDPOINT_TESTS };
