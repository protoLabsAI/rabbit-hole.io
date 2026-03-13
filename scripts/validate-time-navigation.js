#!/usr/bin/env node

/**
 * Time Navigation Validation Script
 * Quick QA validation for all time navigation components
 */

const { performance } = require("perf_hooks");

const BASE_URL = "http://localhost:3000";

async function validateEndpoint(name, url, expectedFields = []) {
  console.log(`🧪 Validating: ${name}`);

  try {
    const start = performance.now();
    const response = await fetch(url);
    const data = await response.json();
    const time = Math.round(performance.now() - start);

    if (data.success) {
      console.log(`✅ ${name}: ${time}ms`);

      // Validate expected fields
      for (const field of expectedFields) {
        if (!data[field]) {
          console.log(`⚠️  Missing field: ${field}`);
        }
      }

      return true;
    } else {
      console.log(`❌ ${name}: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${name}: ${error.message}`);
    return false;
  }
}

async function validatePage(name, url, expectedContent = []) {
  console.log(`🌐 Validating: ${name}`);

  try {
    const start = performance.now();
    const response = await fetch(url);
    const html = await response.text();
    const time = Math.round(performance.now() - start);

    if (response.ok) {
      // Check if main content is present (indicates working page)
      const hasMainContent =
        expectedContent.length === 0 ||
        expectedContent.some((content) => html.includes(content));

      if (hasMainContent) {
        console.log(`✅ ${name}: ${time}ms`);

        // Check for expected content (informational)
        let contentFound = 0;
        for (const content of expectedContent) {
          if (html.includes(content)) {
            contentFound++;
          }
        }

        if (expectedContent.length > 0) {
          console.log(
            `   Content: ${contentFound}/${expectedContent.length} found`
          );
        }

        return true;
      } else {
        console.log(`❌ ${name}: Main content not found`);
        return false;
      }
    } else {
      console.log(`❌ ${name}: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${name}: ${error.message}`);
    return false;
  }
}

async function runValidation() {
  console.log("🚀 Time Navigation Validation\n");

  const results = [];

  // API Validation
  console.log("📡 API Endpoints:");
  results.push(
    await validateEndpoint(
      "Enhanced Timeslice API",
      `${BASE_URL}/api/graph-tiles/timeslice-enhanced?from=2024-01-01&to=2024-01-31&aggregate=true`,
      ["data", "pagination", "aggregation", "performance"]
    )
  );

  results.push(
    await validateEndpoint(
      "Entity-Specific Query",
      `${BASE_URL}/api/graph-tiles/timeslice-enhanced?entityUid=person:joe_rogan&pageSize=1000`,
      ["data", "pagination", "performance"]
    )
  );

  results.push(
    await validateEndpoint(
      "Original Timeslice API",
      `${BASE_URL}/api/graph-tiles/timeslice?from=2024-01-01&to=2024-01-31`,
      ["data"]
    )
  );

  console.log("\n🌐 UI Pages:");
  results.push(
    await validatePage(
      "Time Navigation Demo",
      `${BASE_URL}/time-navigation-demo`,
      ["Time Navigation Demo", "Entity Focus", "Quick Ranges"]
    )
  );

  results.push(
    await validatePage("Atlas Page", `${BASE_URL}/atlas`, [
      "rabbit-hole.io",
      "Graph Settings",
    ])
  );

  // Summary
  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\n📊 Validation Summary: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log(
      "🎉 All validations passed! Time navigation system is ready for QA."
    );
  } else {
    console.log("⚠️  Some validations failed. Check the issues above.");
  }

  return passed === total;
}

// Run validation if called directly
if (require.main === module) {
  runValidation()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error("💥 Validation failed:", error);
      process.exit(1);
    });
}

module.exports = { runValidation };
