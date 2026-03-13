#!/usr/bin/env node

/**
 * Test Data Validation Script
 *
 * Validates all JSON files in the test-data directory against the
 * RabbitHole schema to ensure data integrity and consistency.
 */

const fs = require("fs");
const path = require("path");

const { validateRabbitHoleBundle } = require("../packages/types/dist/index.js");

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

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatFileResult(filename, result) {
  const status = result.isValid
    ? colorize("✅ VALID", "green")
    : colorize("❌ INVALID", "red");

  console.log(`${status} ${colorize(filename, "blue")}`);

  if (!result.isValid && result.errors.length > 0) {
    result.errors.forEach((error, index) => {
      const errorNum = colorize(`  ${index + 1}.`, "yellow");
      const errorMsg = colorize(error.message, "red");
      console.log(`${errorNum} ${errorMsg}`);

      if (error.field) {
        console.log(`     ${colorize("Field:", "cyan")} ${error.field}`);
      }
      if (error.itemId) {
        console.log(`     ${colorize("Item:", "cyan")} ${error.itemId}`);
      }
    });
    console.log(""); // Empty line for spacing
  }
}

function validateTestData() {
  const testDataDir = path.join(__dirname, "../test-data");

  console.log(colorize("🔍 Rabbit Hole Test Data Validation", "bright"));
  console.log(colorize("=".repeat(50), "cyan"));
  console.log("");

  // Get all JSON files in test-data directory
  let jsonFiles;
  try {
    const allFiles = fs.readdirSync(testDataDir);
    jsonFiles = allFiles.filter(
      (file) =>
        file.endsWith(".json") &&
        fs.statSync(path.join(testDataDir, file)).isFile()
    );
  } catch (error) {
    console.error(
      colorize(`❌ Error reading test-data directory: ${error.message}`, "red")
    );
    process.exit(1);
  }

  if (jsonFiles.length === 0) {
    console.log(
      colorize("⚠️  No JSON files found in test-data directory", "yellow")
    );
    return;
  }

  console.log(
    colorize(`Found ${jsonFiles.length} JSON files to validate`, "blue")
  );
  console.log("");

  let validCount = 0;
  let invalidCount = 0;
  const validationResults = [];

  // Validate each file
  for (const filename of jsonFiles.sort()) {
    const filePath = path.join(testDataDir, filename);

    try {
      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, "utf8");
      let jsonData;

      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        const result = {
          filename,
          isValid: false,
          errors: [
            {
              type: "validation",
              message: `JSON parse error: ${parseError.message}`,
            },
          ],
        };

        formatFileResult(filename, result);
        validationResults.push(result);
        invalidCount++;
        continue;
      }

      // Validate against schema
      const result = validateRabbitHoleBundle(jsonData);
      result.filename = filename;

      formatFileResult(filename, result);
      validationResults.push(result);

      if (result.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    } catch (error) {
      const result = {
        filename,
        isValid: false,
        errors: [
          {
            type: "validation",
            message: `File read error: ${error.message}`,
          },
        ],
      };

      formatFileResult(filename, result);
      validationResults.push(result);
      invalidCount++;
    }
  }

  // Summary
  console.log("");
  console.log(colorize("📊 Validation Summary", "bright"));
  console.log(colorize("-".repeat(50), "cyan"));
  console.log(`${colorize("Total files:", "blue")} ${jsonFiles.length}`);
  console.log(`${colorize("Valid files:", "green")} ${validCount}`);
  console.log(`${colorize("Invalid files:", "red")} ${invalidCount}`);

  if (invalidCount > 0) {
    console.log("");
    console.log(colorize("❌ Some files have validation errors", "red"));
    console.log(
      colorize("Fix the errors above and re-run validation", "yellow")
    );
    process.exit(1);
  } else {
    console.log("");
    console.log(colorize("🎉 All test data files are valid!", "green"));
    process.exit(0);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  if (command === "--help" || command === "-h") {
    console.log("Test Data Validation Script");
    console.log("");
    console.log("Usage: node validate-test-data.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --help, -h    Show this help message");
    console.log("  --version, -v Show version information");
    console.log("");
    console.log(
      "This script validates all JSON files in the test-data directory"
    );
    console.log("against the RabbitHole schema to ensure data integrity.");
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log("Test Data Validation Script v1.0.0");
    process.exit(0);
  }
}

// Run validation
validateTestData();
