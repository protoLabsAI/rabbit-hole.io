/**
 * Domain Linting Tool - RAB-20
 *
 * Lints domain configurations for best practices and code quality.
 * Provides actionable suggestions for improvements.
 */

import { readFileSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { glob } from "glob";

import type { JSONDomainConfig } from "../packages/types/src/domain-system/domain-json-schema.js";
import { validateJSONDomain } from "../packages/types/src/domain-system/domain-json-schema.js";

// ==================== Lint Types ====================

interface LintIssue {
  file: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  autoFixable?: boolean;
}

interface LintResult {
  file: string;
  issues: LintIssue[];
  passed: number;
  failed: number;
}

interface LintSummary {
  totalFiles: number;
  totalIssues: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  results: LintResult[];
}

// ==================== Linting Rules ====================

/**
 * Rule: Domain names should use snake_case
 */
function lintDomainNaming(domain: JSONDomainConfig, file: string): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check for hyphens instead of underscores
  if (domain.name.includes("-")) {
    issues.push({
      file,
      rule: "domain-naming",
      severity: "warning",
      message: `Domain name "${domain.name}" uses hyphens. Prefer underscores for consistency.`,
      suggestion: `Rename to "${domain.name.replace(/-/g, "_")}"`,
      autoFixable: true,
    });
  }

  // Check for single-word domains
  if (
    !domain.name.includes("_") &&
    !domain.name.includes("-") &&
    domain.name.length > 15
  ) {
    issues.push({
      file,
      rule: "domain-naming",
      severity: "info",
      message: `Long single-word domain name "${domain.name}". Consider using underscores for readability.`,
      suggestion: `Example: "retail_store" instead of "retailstore"`,
    });
  }

  return issues;
}

/**
 * Rule: Entity types should use PascalCase with underscores
 */
function lintEntityNaming(domain: JSONDomainConfig, file: string): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    // Check for all caps (should be PascalCase)
    if (entityType === entityType.toUpperCase()) {
      issues.push({
        file,
        rule: "entity-naming",
        severity: "warning",
        message: `Entity type "${entityType}" is all caps. Use PascalCase instead.`,
        suggestion: `Example: "Car_Model" instead of "CAR_MODEL"`,
      });
    }

    // Check for lowercase (should start with capital)
    if (entityType[0] === entityType[0].toLowerCase()) {
      issues.push({
        file,
        rule: "entity-naming",
        severity: "error",
        message: `Entity type "${entityType}" starts with lowercase. Must start with uppercase letter.`,
        suggestion: `Use PascalCase, e.g., "${entityType.charAt(0).toUpperCase() + entityType.slice(1)}"`,
      });
    }

    // Check UID prefix consistency
    const expectedPrefix = entityType.toLowerCase().replace(/_/g, "_");
    if (entityDef.uidPrefix !== expectedPrefix) {
      issues.push({
        file,
        rule: "uid-prefix-consistency",
        severity: "info",
        message: `UID prefix "${entityDef.uidPrefix}" doesn't match entity type "${entityType}"`,
        suggestion: `Consider using "${expectedPrefix}" for consistency`,
      });
    }
  }

  return issues;
}

/**
 * Rule: Property names should use snake_case
 */
function lintPropertyNaming(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    if (!entityDef.properties) continue;

    for (const [propName, propDef] of Object.entries(entityDef.properties)) {
      // Check for camelCase (should be snake_case)
      if (/[a-z][A-Z]/.test(propName)) {
        const snakeCase = propName.replace(
          /[A-Z]/g,
          (letter) => `_${letter.toLowerCase()}`
        );
        issues.push({
          file,
          rule: "property-naming",
          severity: "error",
          message: `Property "${propName}" in ${entityType} uses camelCase. Use snake_case.`,
          suggestion: `Rename to "${snakeCase}"`,
          autoFixable: true,
        });
      }

      // Check for all caps
      if (propName === propName.toUpperCase()) {
        issues.push({
          file,
          rule: "property-naming",
          severity: "error",
          message: `Property "${propName}" in ${entityType} is all caps. Use snake_case.`,
          suggestion: `Example: "max_speed" instead of "MAXSPEED"`,
        });
      }

      // Check for overly long names
      if (propName.length > 40) {
        issues.push({
          file,
          rule: "property-naming",
          severity: "warning",
          message: `Property "${propName}" in ${entityType} is very long (${propName.length} chars)`,
          suggestion: `Consider a shorter, more concise name`,
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: Colors should use consistent format and follow palette
 */
function lintColorConsistency(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check uppercase vs lowercase
  const hasLowercase = /[a-f]/.test(domain.ui.color);
  const hasUppercase = /[A-F]/.test(domain.ui.color);

  if (hasLowercase && hasUppercase) {
    issues.push({
      file,
      rule: "color-consistency",
      severity: "warning",
      message: `Color "${domain.ui.color}" mixes uppercase and lowercase. Use consistent case.`,
      suggestion: `Prefer uppercase: "${domain.ui.color.toUpperCase()}"`,
      autoFixable: true,
    });
  }

  // Check for pure black/white (often unintentional)
  if (domain.ui.color === "#000000") {
    issues.push({
      file,
      rule: "color-palette",
      severity: "info",
      message: `Using pure black #000000 as domain color`,
      suggestion: `Consider a dark gray like #1F2937 for better visual design`,
    });
  }

  if (domain.ui.color === "#FFFFFF") {
    issues.push({
      file,
      rule: "color-palette",
      severity: "warning",
      message: `Using pure white #FFFFFF as domain color (may be invisible on light backgrounds)`,
      suggestion: `Use a darker color for visibility`,
    });
  }

  return issues;
}

/**
 * Rule: Icons should be single emoji or valid references
 */
function lintIconUsage(domain: JSONDomainConfig, file: string): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check domain icon
  const icon = domain.ui.icon;

  if (icon.length > 2) {
    // Likely multiple emojis or text
    issues.push({
      file,
      rule: "icon-format",
      severity: "warning",
      message: `Icon "${icon}" is longer than expected. Use single emoji.`,
      suggestion: `Example: "🚗" or "🏥"`,
    });
  }

  if (icon.includes(" ")) {
    issues.push({
      file,
      rule: "icon-format",
      severity: "error",
      message: `Icon "${icon}" contains spaces. Use single emoji.`,
    });
  }

  // Check entity icons
  if (domain.ui.entityIcons) {
    for (const [entityType, entityIcon] of Object.entries(
      domain.ui.entityIcons
    )) {
      if (entityIcon.length > 2) {
        issues.push({
          file,
          rule: "icon-format",
          severity: "warning",
          message: `Entity icon for ${entityType} ("${entityIcon}") is longer than expected`,
          suggestion: `Use single emoji`,
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: Descriptions should be meaningful and complete
 */
function lintDescriptions(domain: JSONDomainConfig, file: string): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check domain description
  if (domain.description.length < 20) {
    issues.push({
      file,
      rule: "description-quality",
      severity: "warning",
      message: `Domain description is very short (${domain.description.length} chars)`,
      suggestion: `Provide a more detailed description of the domain scope and purpose`,
    });
  }

  if (!domain.description.endsWith(".") && !domain.description.endsWith("!")) {
    issues.push({
      file,
      rule: "description-format",
      severity: "info",
      message: `Domain description doesn't end with punctuation`,
      suggestion: `Add period for proper formatting`,
      autoFixable: true,
    });
  }

  // Check property descriptions
  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    if (!entityDef.properties) continue;

    const propsWithDescriptions = Object.values(entityDef.properties).filter(
      (p) => p.description
    ).length;
    const totalProps = Object.keys(entityDef.properties).length;

    if (totalProps > 5 && propsWithDescriptions < totalProps * 0.5) {
      issues.push({
        file,
        rule: "description-coverage",
        severity: "info",
        message: `Entity ${entityType} has only ${propsWithDescriptions}/${totalProps} properties documented`,
        suggestion: `Add descriptions to help users understand property purposes`,
      });
    }
  }

  return issues;
}

/**
 * Rule: Property validation should be appropriate
 */
function lintPropertyValidation(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    if (!entityDef.properties) continue;

    for (const [propName, propDef] of Object.entries(entityDef.properties)) {
      // Check for overly permissive string lengths
      if (propDef.type === "string") {
        if (!propDef.maxLength) {
          issues.push({
            file,
            rule: "validation-completeness",
            severity: "info",
            message: `String property "${propName}" in ${entityType} has no maxLength`,
            suggestion: `Add maxLength constraint for data validation`,
          });
        }

        if (propDef.maxLength && propDef.maxLength > 10000) {
          issues.push({
            file,
            rule: "validation-quality",
            severity: "warning",
            message: `String property "${propName}" in ${entityType} has very large maxLength (${propDef.maxLength})`,
            suggestion: `Consider using a more reasonable limit or switch to "text" type`,
          });
        }
      }

      // Check for unvalidated numbers
      if (propDef.type === "number") {
        if (propDef.min === undefined && propDef.max === undefined) {
          issues.push({
            file,
            rule: "validation-completeness",
            severity: "info",
            message: `Number property "${propName}" in ${entityType} has no min/max constraints`,
            suggestion: `Add reasonable min/max values for data validation`,
          });
        }

        // Check for suspiciously large ranges
        if (
          propDef.min !== undefined &&
          propDef.max !== undefined &&
          propDef.max - propDef.min > 1000000
        ) {
          issues.push({
            file,
            rule: "validation-quality",
            severity: "info",
            message: `Number property "${propName}" in ${entityType} has very large range (${propDef.max - propDef.min})`,
            suggestion: `Consider if this range is realistic for your use case`,
          });
        }
      }

      // Check for empty enums
      if (propDef.type === "enum" && propDef.values.length < 2) {
        issues.push({
          file,
          rule: "enum-quality",
          severity: "warning",
          message: `Enum property "${propName}" in ${entityType} has only ${propDef.values.length} value(s)`,
          suggestion: `Enums should have at least 2 values, or use boolean type`,
        });
      }

      // Check for large enums
      if (propDef.type === "enum" && propDef.values.length > 50) {
        issues.push({
          file,
          rule: "enum-quality",
          severity: "warning",
          message: `Enum property "${propName}" in ${entityType} has ${propDef.values.length} values`,
          suggestion: `Consider using string type with pattern validation instead`,
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: Domain structure should be well-organized
 */
function lintDomainStructure(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  const entityCount = Object.keys(domain.entities).length;

  // Check for minimal domains
  if (entityCount === 1) {
    issues.push({
      file,
      rule: "domain-structure",
      severity: "info",
      message: `Domain has only 1 entity type`,
      suggestion: `Consider if this entity could be part of a larger domain`,
    });
  }

  // Check for metadata completeness
  if (!domain.version) {
    issues.push({
      file,
      rule: "metadata-completeness",
      severity: "info",
      message: `Domain missing version field`,
      suggestion: `Add version field for tracking changes (e.g., "1.0.0")`,
    });
  }

  if (!domain.author) {
    issues.push({
      file,
      rule: "metadata-completeness",
      severity: "info",
      message: `Domain missing author field`,
      suggestion: `Add author field for maintainer information`,
    });
  }

  if (!domain.tags || domain.tags.length === 0) {
    issues.push({
      file,
      rule: "metadata-completeness",
      severity: "info",
      message: `Domain has no tags`,
      suggestion: `Add tags for categorization and searchability`,
    });
  }

  // Check for relationships
  if (!domain.relationships || domain.relationships.length === 0) {
    if (entityCount > 1) {
      issues.push({
        file,
        rule: "relationships",
        severity: "info",
        message: `Domain with ${entityCount} entities has no relationships defined`,
        suggestion: `Consider defining relationships between entities`,
      });
    }
  }

  return issues;
}

/**
 * Rule: Card configuration should be complete
 */
function lintCardConfiguration(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    if (!entityDef.displayName) {
      issues.push({
        file,
        rule: "card-display",
        severity: "warning",
        message: `Entity ${entityType} missing displayName (will show technical name in UI)`,
        suggestion: `Add displayName for better user experience`,
      });
    }

    // Check if entity has icon override
    if (domain.ui.entityIcons && !domain.ui.entityIcons[entityType]) {
      issues.push({
        file,
        rule: "card-display",
        severity: "info",
        message: `Entity ${entityType} has no custom icon (will use domain icon)`,
        suggestion: `Consider adding entity-specific icon in ui.entityIcons`,
      });
    }
  }

  return issues;
}

/**
 * Rule: Check for common naming mistakes
 */
function lintCommonMistakes(
  domain: JSONDomainConfig,
  file: string
): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check for "id" vs "uid" confusion
  for (const [entityType, entityDef] of Object.entries(domain.entities)) {
    if (!entityDef.properties) continue;

    if ("id" in entityDef.properties) {
      issues.push({
        file,
        rule: "common-mistakes",
        severity: "warning",
        message: `Entity ${entityType} has property named "id". System uses "uid" for identifiers.`,
        suggestion: `Rename to avoid confusion with system UID field`,
      });
    }

    if ("type" in entityDef.properties) {
      issues.push({
        file,
        rule: "common-mistakes",
        severity: "error",
        message: `Entity ${entityType} has property named "type". This conflicts with system field.`,
        suggestion: `Rename to avoid conflict (e.g., "category", "kind", "classification")`,
      });
    }

    if ("name" in entityDef.properties) {
      issues.push({
        file,
        rule: "common-mistakes",
        severity: "warning",
        message: `Entity ${entityType} has property named "name". This conflicts with system field.`,
        suggestion: `Use more specific name (e.g., "display_name", "title", "label")`,
      });
    }
  }

  return issues;
}

// ==================== Lint Orchestration ====================

/**
 * Lint a single domain file
 */
function lintDomainFile(file: string): LintResult {
  const issues: LintIssue[] = [];

  try {
    const content = readFileSync(file, "utf-8");
    const domain = JSON.parse(content);

    // Validate first
    const validation = validateJSONDomain(domain);
    if (!validation.success) {
      return {
        file,
        issues: [
          {
            file,
            rule: "validation",
            severity: "error",
            message: `Domain must pass validation before linting. Run 'pnpm run validate:domains' first.`,
          },
        ],
        passed: 0,
        failed: 1,
      };
    }

    const validatedDomain = validation.data;

    // Run all lint rules
    issues.push(...lintDomainNaming(validatedDomain, file));
    issues.push(...lintEntityNaming(validatedDomain, file));
    issues.push(...lintPropertyNaming(validatedDomain, file));
    issues.push(...lintColorConsistency(validatedDomain, file));
    issues.push(...lintIconUsage(validatedDomain, file));
    issues.push(...lintDescriptions(validatedDomain, file));
    issues.push(...lintPropertyValidation(validatedDomain, file));
    issues.push(...lintDomainStructure(validatedDomain, file));
    issues.push(...lintCardConfiguration(validatedDomain, file));
    issues.push(...lintCommonMistakes(validatedDomain, file));

    return {
      file,
      issues,
      passed: issues.filter((i) => i.severity !== "error").length,
      failed: issues.filter((i) => i.severity === "error").length,
    };
  } catch (error) {
    return {
      file,
      issues: [
        {
          file,
          rule: "parsing",
          severity: "error",
          message: `Failed to parse domain file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      passed: 0,
      failed: 1,
    };
  }
}

/**
 * Lint all domain files
 */
async function lintAllDomains(): Promise<LintSummary> {
  console.log("🔍 Linting domain configurations...\n");

  const domainFiles = await glob("custom-domains/**/domain.config.json", {
    cwd: process.cwd(),
    absolute: false,
  });

  if (domainFiles.length === 0) {
    console.log("⚠️  No domain configurations found in custom-domains/\n");
    return {
      totalFiles: 0,
      totalIssues: 0,
      totalErrors: 0,
      totalWarnings: 0,
      totalInfo: 0,
      results: [],
    };
  }

  const results: LintResult[] = [];
  for (const file of domainFiles) {
    const result = lintDomainFile(file);
    results.push(result);
  }

  const allIssues = results.flatMap((r) => r.issues);

  return {
    totalFiles: results.length,
    totalIssues: allIssues.length,
    totalErrors: allIssues.filter((i) => i.severity === "error").length,
    totalWarnings: allIssues.filter((i) => i.severity === "warning").length,
    totalInfo: allIssues.filter((i) => i.severity === "info").length,
    results,
  };
}

/**
 * Print lint results
 */
function printResults(summary: LintSummary): void {
  for (const result of summary.results) {
    const errorCount = result.issues.filter(
      (i) => i.severity === "error"
    ).length;
    const warningCount = result.issues.filter(
      (i) => i.severity === "warning"
    ).length;
    const infoCount = result.issues.filter((i) => i.severity === "info").length;

    if (result.issues.length === 0) {
      console.log(`✅ ${result.file} - No issues`);
    } else if (errorCount > 0) {
      console.log(
        `❌ ${result.file} - ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info`
      );
    } else if (warningCount > 0) {
      console.log(
        `⚠️  ${result.file} - ${warningCount} warning(s), ${infoCount} info`
      );
    } else {
      console.log(`ℹ️  ${result.file} - ${infoCount} suggestion(s)`);
    }

    // Group issues by severity
    const errors = result.issues.filter((i) => i.severity === "error");
    const warnings = result.issues.filter((i) => i.severity === "warning");
    const infos = result.issues.filter((i) => i.severity === "info");

    // Print errors
    for (const issue of errors) {
      console.log(`   ❌ [${issue.rule}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`      💡 ${issue.suggestion}`);
      }
      if (issue.autoFixable) {
        console.log(`      🔧 Auto-fixable`);
      }
    }

    // Print warnings
    for (const issue of warnings) {
      console.log(`   ⚠️  [${issue.rule}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`      💡 ${issue.suggestion}`);
      }
      if (issue.autoFixable) {
        console.log(`      🔧 Auto-fixable`);
      }
    }

    // Print info (only first 5 to avoid clutter)
    const displayedInfos = infos.slice(0, 5);
    for (const issue of displayedInfos) {
      console.log(`   ℹ️  [${issue.rule}] ${issue.message}`);
      if (issue.suggestion) {
        console.log(`      💡 ${issue.suggestion}`);
      }
    }

    if (infos.length > 5) {
      console.log(`   ... and ${infos.length - 5} more suggestions`);
    }

    if (result.issues.length > 0) {
      console.log("");
    }
  }

  // Print summary
  console.log(`\n📊 Lint Summary:`);
  console.log(`   Files: ${summary.totalFiles}`);
  console.log(`   Issues: ${summary.totalIssues}`);
  if (summary.totalErrors > 0) {
    console.log(`   ❌ Errors: ${summary.totalErrors}`);
  }
  if (summary.totalWarnings > 0) {
    console.log(`   ⚠️  Warnings: ${summary.totalWarnings}`);
  }
  if (summary.totalInfo > 0) {
    console.log(`   ℹ️  Info: ${summary.totalInfo}`);
  }

  if (summary.totalIssues === 0) {
    console.log("\n✅ All domains follow best practices!\n");
  } else {
    console.log("");
  }
}

// ==================== CLI Entry Point ====================

async function main(): Promise<void> {
  try {
    const summary = await lintAllDomains();
    printResults(summary);

    // Exit with error only if there are actual errors (not warnings/info)
    if (summary.totalErrors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Linting failed:", error);
    process.exit(1);
  }
}

// Run if called directly
const currentFile = path.resolve(fileURLToPath(import.meta.url));
const calledFile = path.resolve(process.argv[1]);
if (currentFile === calledFile) {
  main();
}

export { lintAllDomains, lintDomainFile, type LintResult, type LintSummary };
