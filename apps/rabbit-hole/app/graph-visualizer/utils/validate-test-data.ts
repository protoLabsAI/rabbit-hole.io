/**
 * Test Data Validation Script
 *
 * Validates all test JSON files against domain schemas and reports issues.
 */

import { readFile } from "fs/promises";
import { join } from "path";

import { validateGraphData } from "./data-validation";

interface ValidationReport {
  file: string;
  success: boolean;
  errors?: string[];
  nodeCount?: number;
  edgeCount?: number;
  format?: string;
}

/**
 * Test data file paths
 */
const TEST_FILES = [
  "test-data/alex-jones.json",
  "test-data/alice-adventures-wonderland.json",
  "test-data/bernie-test-example.json",
  "test-data/comprehensive-domain-test.json",
  "test-data/domains/biological-domain-test.json",
  "test-data/domains/infrastructure-transportation-test.json",
  "test-data/domains/materials-environmental-test.json",
  "test-data/domains/mathematics-test.json",
  "test-data/domains/medical-healthcare-test.json",
  "test-data/domains/physics-chemistry-test.json",
  "test-data/domains/sports-entertainment-food-agriculture-test.json",
  "test-data/donald-trump-example.json",
  "test-data/elon-musk.json",
  "test-data/epstein-example.json",
  "test-data/ivanka-trump.json",
  "test-data/joe-biden.json",
  "test-data/joe-rogan.json",
  "test-data/maga.json",
  "test-data/nancy-pelosi-example.json",
  "test-data/paul-pelosi.json",
  "test-data/putin-example.json",
  "test-data/qanon.json",
  "test-data/rabbit-example.json",
  "test-data/second-trump-admin.json",
  "test-data/trump-putin-kissing.json",
];

/**
 * Determine test data format
 */
function detectDataFormat(data: any): string {
  if (data.evidence && Array.isArray(data.evidence)) {
    return "evidence";
  }
  if (data.entities && Array.isArray(data.entities)) {
    return "entities";
  }
  if (data.nodes && Array.isArray(data.nodes)) {
    return "graph-tiles";
  }
  return "unknown";
}

/**
 * Validate a single test file
 */
async function validateTestFile(filePath: string): Promise<ValidationReport> {
  try {
    const content = await readFile(join(process.cwd(), filePath), "utf-8");
    const data = JSON.parse(content);

    const format = detectDataFormat(data);
    const validation = await validateGraphData(data, {
      sourceFormat: format === "evidence" ? "evidence" : "test",
    });

    return {
      file: filePath,
      success: validation.success,
      errors: validation.errors,
      nodeCount: validation.data?.nodes?.length,
      edgeCount: validation.data?.edges?.length,
      format,
    };
  } catch (error) {
    return {
      file: filePath,
      success: false,
      errors: [
        `File error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      format: "error",
    };
  }
}

/**
 * Validate all test files
 */
export async function validateAllTestFiles(): Promise<ValidationReport[]> {
  const reports: ValidationReport[] = [];

  for (const file of TEST_FILES) {
    const report = await validateTestFile(file);
    reports.push(report);
  }

  return reports;
}

/**
 * Generate validation summary
 */
export function generateValidationSummary(reports: ValidationReport[]): {
  total: number;
  successful: number;
  failed: number;
  byFormat: Record<string, number>;
  failedFiles: string[];
} {
  const summary = {
    total: reports.length,
    successful: reports.filter((r) => r.success).length,
    failed: reports.filter((r) => !r.success).length,
    byFormat: {} as Record<string, number>,
    failedFiles: reports.filter((r) => !r.success).map((r) => r.file),
  };

  // Count by format
  reports.forEach((report) => {
    const format = report.format || "unknown";
    summary.byFormat[format] = (summary.byFormat[format] || 0) + 1;
  });

  return summary;
}

/**
 * Run validation and log results
 */
export async function runValidation(): Promise<void> {
  console.log("🔍 Validating test data files...\n");

  const reports = await validateAllTestFiles();
  const summary = generateValidationSummary(reports);

  // Print summary
  console.log("📊 Validation Summary:");
  console.log(`Total files: ${summary.total}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed}`);
  console.log("");

  console.log("📁 By Format:");
  Object.entries(summary.byFormat).forEach(([format, count]) => {
    console.log(`  ${format}: ${count}`);
  });
  console.log("");

  // Print failed files
  if (summary.failedFiles.length > 0) {
    console.log("❌ Failed Files:");
    reports
      .filter((r) => !r.success)
      .forEach((report) => {
        console.log(`  ${report.file}:`);
        if (report.errors) {
          report.errors.forEach((error) => {
            console.log(`    - ${error}`);
          });
        }
        console.log("");
      });
  }

  // Print successful files
  if (summary.successful > 0) {
    console.log("✅ Successful Files:");
    reports
      .filter((r) => r.success)
      .forEach((report) => {
        console.log(
          `  ${report.file} (${report.format}, nodes: ${report.nodeCount}, edges: ${report.edgeCount})`
        );
      });
    console.log("");
  }

  console.log(
    `🎯 Validation complete: ${summary.successful}/${summary.total} files passed`
  );
}

// Export for use in other modules
export { validateTestFile, TEST_FILES };
