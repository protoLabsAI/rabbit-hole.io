#!/usr/bin/env node

/**
 * Neo4j Batch Processing Validation Script
 *
 * Tests batch processing performance and memory efficiency.
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";

async function testBatchProcessing() {
  console.log("🧪 Neo4j Batch Processing Validation");
  console.log("=====================================");

  const tests = [
    {
      name: "Atlas V2 Pagination",
      url: `${API_BASE}/api/atlas-v2?pageSize=100`,
      test: validatePagination,
    },
    {
      name: "Batch API Memory Target",
      url: `${API_BASE}/api/graph-batch?targetMemory=50`,
      test: validateBatchOptimization,
    },
    {
      name: "Progressive Loading",
      url: `${API_BASE}/api/graph-batch?progressive=true&targetMemory=75`,
      test: validateProgressiveMode,
    },
    {
      name: "Entity Type Filtering",
      url: `${API_BASE}/api/atlas-v2?pageSize=200&entityTypes=Person,Organization`,
      test: validateEntityFiltering,
    },
    {
      name: "Cursor Pagination",
      url: `${API_BASE}/api/atlas-v2?pageSize=50`,
      test: validateCursorPagination,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log(`📡 URL: ${test.url}`);

      const startTime = Date.now();
      const response = await fetch(test.url);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = await test.test(data, responseTime);

      if (result.success) {
        console.log(`✅ ${test.name}: ${result.message}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log("\n📊 Test Results");
  console.log("===============");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed === 0) {
    console.log("\n🎉 All batch processing tests passed!");
  } else {
    console.log(`\n⚠️  ${failed} tests failed - check implementation`);
    process.exit(1);
  }
}

async function validatePagination(data, responseTime) {
  if (!data.success) {
    return { success: false, message: `API error: ${data.error}` };
  }

  const meta = data.data?.meta;
  if (!meta) {
    return { success: false, message: "Missing meta object" };
  }

  if (responseTime > 2000) {
    return { success: false, message: `Slow response: ${responseTime}ms` };
  }

  const hasNodes = data.data.nodes?.length > 0;
  const hasPageSize = meta.pagination?.pageSize > 0;

  return {
    success: hasNodes && hasPageSize,
    message: `${data.data.nodes.length} nodes, ${responseTime}ms, pagination: ${hasPageSize}`,
  };
}

async function validateBatchOptimization(data, responseTime) {
  if (!data.success) {
    return { success: false, message: `API error: ${data.error}` };
  }

  const performance = data.data?.meta?.performance;
  if (!performance?.batchOptimized) {
    return { success: false, message: "Not batch optimized" };
  }

  const memoryEfficient = data.data.nodes.length <= 2000; // Reasonable batch size

  return {
    success: memoryEfficient,
    message: `${data.data.nodes.length} nodes, batch optimized, ${responseTime}ms`,
  };
}

async function validateProgressiveMode(data, responseTime) {
  if (!data.success) {
    return { success: false, message: `API error: ${data.error}` };
  }

  const progressive = data.data?.meta?.progressive;
  if (!progressive?.enabled) {
    return { success: false, message: "Progressive mode not enabled" };
  }

  return {
    success: true,
    message: `Progressive mode active, batch ${progressive.batchIndex || 0}, ${responseTime}ms`,
  };
}

async function validateEntityFiltering(data, responseTime) {
  if (!data.success) {
    return { success: false, message: `API error: ${data.error}` };
  }

  const nodes = data.data?.nodes || [];
  const validTypes = nodes.every((node) =>
    ["person", "organization"].includes(node.type?.toLowerCase())
  );

  return {
    success: validTypes && nodes.length > 0,
    message: `${nodes.length} filtered nodes, types valid: ${validTypes}, ${responseTime}ms`,
  };
}

async function validateCursorPagination(data, responseTime) {
  if (!data.success) {
    return { success: false, message: `API error: ${data.error}` };
  }

  const pagination = data.data?.meta?.pagination;
  if (!pagination) {
    return { success: false, message: "No pagination metadata" };
  }

  // Test second page if cursor available
  if (pagination.cursor && pagination.hasMore) {
    const secondPageUrl = `${API_BASE}/api/atlas-v2?pageSize=50&cursor=${pagination.cursor}`;
    const secondResponse = await fetch(secondPageUrl);
    const secondData = await secondResponse.json();

    if (!secondData.success) {
      return { success: false, message: "Cursor pagination failed" };
    }

    const hasNewNodes = secondData.data.nodes.length > 0;
    return {
      success: hasNewNodes,
      message: `Cursor pagination working, page 2 has ${secondData.data.nodes.length} nodes`,
    };
  }

  return {
    success: true,
    message: `Pagination metadata present, pageSize: ${pagination.pageSize}`,
  };
}

// Run tests
testBatchProcessing().catch(console.error);
