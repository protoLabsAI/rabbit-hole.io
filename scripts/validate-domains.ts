/**
 * Domain Validation Tool - RAB-20
 *
 * Validates domain.config.json files for correctness and best practices.
 * Provides detailed error messages with line numbers and suggestions.
 */

import { readFileSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { glob } from "glob";

import { validateJSONDomain } from "../packages/types/src/domain-system/domain-json-schema.js";

// ==================== Validation Types ====================

interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  code: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  results: ValidationResult[];
}

// ==================== Format Validators ====================

/**
 * Validate domain name format (lowercase, underscores, no spaces)
 */
function validateDomainName(name: string, file: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_DOMAIN_NAME",
      message: `Domain name "${name}" must start with lowercase letter and contain only lowercase letters, numbers, underscores, and hyphens`,
      suggestion: `Use snake_case format, e.g., "${name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}"`,
    });
  }

  if (name.length < 3) {
    errors.push({
      file,
      severity: "error",
      code: "DOMAIN_NAME_TOO_SHORT",
      message: `Domain name "${name}" is too short (minimum 3 characters)`,
    });
  }

  if (name.length > 50) {
    errors.push({
      file,
      severity: "warning",
      code: "DOMAIN_NAME_TOO_LONG",
      message: `Domain name "${name}" is very long (${name.length} characters). Consider a shorter name.`,
    });
  }

  return errors;
}

/**
 * Validate entity type name format (PascalCase with underscores)
 */
function validateEntityTypeName(
  entityType: string,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!/^[A-Z][A-Za-z0-9_]*$/.test(entityType)) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_ENTITY_TYPE",
      message: `Entity type "${entityType}" must start with uppercase letter and contain only letters, numbers, and underscores`,
      suggestion: `Use PascalCase with underscores, e.g., "Car_Model" or "Product"`,
    });
  }

  return errors;
}

/**
 * Validate UID prefix format (lowercase with underscores)
 */
function validateUidPrefix(
  prefix: string,
  entityType: string,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!/^[a-z][a-z0-9_]*$/.test(prefix)) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_UID_PREFIX",
      message: `UID prefix "${prefix}" for ${entityType} must start with lowercase letter and contain only lowercase letters, numbers, and underscores`,
      suggestion: `Use snake_case format, e.g., "car_model" or "product"`,
    });
  }

  // Check that UID prefix loosely matches entity type
  const normalizedEntityType = entityType.toLowerCase().replace(/_/g, "");
  const normalizedPrefix = prefix.replace(/_/g, "");

  if (
    !normalizedEntityType.includes(normalizedPrefix) &&
    !normalizedPrefix.includes(normalizedEntityType)
  ) {
    errors.push({
      file,
      severity: "warning",
      code: "UID_PREFIX_MISMATCH",
      message: `UID prefix "${prefix}" doesn't match entity type "${entityType}"`,
      suggestion: `Consider using "${entityType.toLowerCase()}" or similar for clarity`,
    });
  }

  return errors;
}

/**
 * Validate property name format (snake_case)
 */
function validatePropertyName(
  propName: string,
  entityType: string,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!/^[a-z][a-z0-9_]*$/.test(propName)) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_PROPERTY_NAME",
      message: `Property "${propName}" in ${entityType} must start with lowercase letter and use snake_case`,
      suggestion: `Use snake_case format, e.g., "${propName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}"`,
    });
  }

  return errors;
}

/**
 * Validate hex color format
 */
function validateHexColor(
  color: string,
  context: string,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_HEX_COLOR",
      message: `Color "${color}" for ${context} is not a valid hex color`,
      suggestion: `Use 6-digit hex format, e.g., "#DC2626" or "#3B82F6"`,
    });
  }

  return errors;
}

/**
 * Validate regex pattern
 */
function validateRegexPattern(
  pattern: string,
  propName: string,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const MAX_REGEX_LENGTH = 1000;

  // Check pattern length to prevent ReDoS attacks
  if (pattern.length > MAX_REGEX_LENGTH) {
    errors.push({
      file,
      severity: "error",
      code: "REGEX_TOO_LONG",
      message: `Regex pattern in property "${propName}" is too long (${pattern.length} chars, max ${MAX_REGEX_LENGTH})`,
      suggestion: `Simplify the regex pattern or split validation into multiple simpler patterns`,
    });
    return errors;
  }

  try {
    new RegExp(pattern);
  } catch (error) {
    errors.push({
      file,
      severity: "error",
      code: "INVALID_REGEX",
      message: `Invalid regex pattern in property "${propName}": ${error instanceof Error ? error.message : String(error)}`,
      suggestion: `Check regex syntax at https://regex101.com/`,
    });
  }

  return errors;
}

// ==================== Semantic Validators ====================

/**
 * Validate that extendsFrom references an existing domain
 */
function validateExtendsFromExists(
  allDomains: Map<string, any>,
  file: string,
  base: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!allDomains.has(base)) {
    // Warning instead of error - might be extending from core domain
    errors.push({
      file,
      severity: "warning",
      code: "UNKNOWN_EXTENDS_FROM",
      message: `Domain extends from "${base}" which was not found in custom-domains/`,
      suggestion: `Ensure "${base}" is a valid core domain or exists in custom-domains/`,
    });
  }

  return errors;
}

/**
 * Detect circular dependencies in extendsFrom chain
 */
function detectCircularDependencies(
  domains: Map<string, any>,
  file: string,
  currentDomain: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const visited = new Set<string>();
  const chain: string[] = [];

  function traverse(domainName: string): boolean {
    if (visited.has(domainName)) {
      // Found circular dependency
      const cycleStart = chain.indexOf(domainName);
      const cycle = [...chain.slice(cycleStart), domainName];
      errors.push({
        file,
        severity: "error",
        code: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency detected in extendsFrom chain: ${cycle.join(" → ")}`,
        suggestion: `Remove extendsFrom or restructure inheritance to break the cycle`,
      });
      return true;
    }

    const domain = domains.get(domainName);
    if (!domain || !domain.extendsFrom) {
      return false;
    }

    visited.add(domainName);
    chain.push(domainName);

    const hasCircular = traverse(domain.extendsFrom);

    chain.pop();
    visited.delete(domainName);

    return hasCircular;
  }

  traverse(currentDomain);
  return errors;
}

/**
 * Check for duplicate UID prefixes across all domains (global validation)
 * Returns map of file -> errors for that file
 */
function validateUniqueUidPrefixesGlobal(
  domains: Map<string, any>
): Map<string, ValidationError[]> {
  const fileErrors = new Map<string, ValidationError[]>();
  const prefixMap = new Map<
    string,
    { file: string; domain: string; entity: string }
  >();

  // Build map of all UID prefixes
  for (const [domainName, domain] of domains.entries()) {
    if (!domain.entities || !domain._file) continue;

    for (const [entityType, entityDef] of Object.entries(domain.entities)) {
      const prefix = (entityDef as any).uidPrefix;
      if (!prefix) continue;

      const existing = prefixMap.get(prefix);
      if (existing) {
        // Duplicate found - add error to the current domain's file
        const error: ValidationError = {
          file: domain._file,
          severity: "error",
          code: "DUPLICATE_UID_PREFIX",
          message: `UID prefix "${prefix}" is already used by ${existing.entity} in ${existing.domain} (${existing.file})`,
          suggestion: `Choose a unique UID prefix for this entity type`,
        };

        if (!fileErrors.has(domain._file)) {
          fileErrors.set(domain._file, []);
        }
        fileErrors.get(domain._file)!.push(error);
      } else {
        prefixMap.set(prefix, {
          file: domain._file,
          domain: domainName,
          entity: entityType,
        });
      }
    }
  }

  return fileErrors;
}

/**
 * Check for duplicate entity types across all domains (global validation)
 * Returns map of file -> warnings for that file
 */
function validateUniqueEntityTypesGlobal(
  domains: Map<string, any>
): Map<string, ValidationError[]> {
  const fileWarnings = new Map<string, ValidationError[]>();
  const entityMap = new Map<string, { file: string; domain: string }>();

  // Build map of all entity types
  for (const [domainName, domain] of domains.entries()) {
    if (!domain.entities || !domain._file) continue;

    for (const entityType of Object.keys(domain.entities)) {
      const existing = entityMap.get(entityType);
      if (existing && existing.domain !== domainName) {
        // Duplicate found - add warning to current domain's file
        const warning: ValidationError = {
          file: domain._file,
          severity: "warning",
          code: "DUPLICATE_ENTITY_TYPE",
          message: `Entity type "${entityType}" is already defined in domain "${existing.domain}" (${existing.file})`,
          suggestion: `Consider using a domain-specific prefix or different name`,
        };

        if (!fileWarnings.has(domain._file)) {
          fileWarnings.set(domain._file, []);
        }
        fileWarnings.get(domain._file)!.push(warning);
      } else if (!existing) {
        entityMap.set(entityType, { file: domain._file, domain: domainName });
      }
    }
  }

  return fileWarnings;
}

// ==================== Best Practice Validators ====================

/**
 * Validate domain size and complexity
 */
function validateDomainSize(domain: any, file: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const entityCount = Object.keys(domain.entities || {}).length;

  if (entityCount === 0) {
    errors.push({
      file,
      severity: "error",
      code: "NO_ENTITIES",
      message: `Domain has no entities defined`,
      suggestion: `Add at least one entity to the domain`,
    });
  }

  if (entityCount > 20) {
    errors.push({
      file,
      severity: "warning",
      code: "TOO_MANY_ENTITIES",
      message: `Domain has ${entityCount} entities (>20). Consider splitting into multiple domains.`,
      suggestion: `Group related entities into separate domains for better maintainability`,
    });
  }

  // Check property count per entity
  for (const [entityType, entityDef] of Object.entries(domain.entities || {})) {
    const propCount = Object.keys((entityDef as any).properties || {}).length;
    if (propCount > 50) {
      errors.push({
        file,
        severity: "warning",
        code: "TOO_MANY_PROPERTIES",
        message: `Entity "${entityType}" has ${propCount} properties (>50). Consider refactoring.`,
        suggestion: `Split into multiple entity types or use nested objects`,
      });
    }
  }

  return errors;
}

/**
 * Validate that displayNames are provided
 */
function validateDisplayNames(domain: any, file: string): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities || {})) {
    if (!(entityDef as any).displayName) {
      errors.push({
        file,
        severity: "warning",
        code: "MISSING_DISPLAY_NAME",
        message: `Entity "${entityType}" is missing displayName`,
        suggestion: `Add a human-readable displayName, e.g., "Car Model"`,
      });
    }
  }

  return errors;
}

/**
 * Validate property descriptions
 */
function validatePropertyDescriptions(
  domain: any,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [entityType, entityDef] of Object.entries(domain.entities || {})) {
    const properties = (entityDef as any).properties || {};
    const propCount = Object.keys(properties).length;
    let descriptionsCount = 0;

    for (const [propName, propDef] of Object.entries(properties)) {
      if ((propDef as any).description) {
        descriptionsCount++;
      }
    }

    if (propCount > 0 && descriptionsCount === 0) {
      errors.push({
        file,
        severity: "warning",
        code: "NO_PROPERTY_DESCRIPTIONS",
        message: `Entity "${entityType}" has no property descriptions`,
        suggestion: `Add descriptions to help users understand property purposes`,
      });
    }
  }

  return errors;
}

/**
 * Validate version format
 */
function validateVersion(domain: any, file: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (domain.version && !/^\d+\.\d+\.\d+$/.test(domain.version)) {
    errors.push({
      file,
      severity: "warning",
      code: "INVALID_VERSION_FORMAT",
      message: `Version "${domain.version}" should follow semantic versioning (X.Y.Z)`,
      suggestion: `Use format like "1.0.0" or "2.1.3"`,
    });
  }

  return errors;
}

// ==================== Validation Orchestration ====================

/**
 * Validate a single domain file
 */
function validateDomainFile(
  file: string,
  allDomains: Map<string, any>,
  crossDomainErrors: ValidationError[] = [],
  crossDomainWarnings: ValidationError[] = []
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Read and parse JSON
    const content = readFileSync(file, "utf-8");
    let domain: any;

    try {
      domain = JSON.parse(content);
    } catch (error) {
      return {
        file,
        valid: false,
        errors: [
          {
            file,
            severity: "error",
            code: "INVALID_JSON",
            message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
            suggestion: `Check for syntax errors at https://jsonlint.com/`,
          },
        ],
        warnings: [],
      };
    }

    // 1. Schema validation (RAB-14)
    const schemaValidation = validateJSONDomain(domain);
    if (!schemaValidation.success) {
      const zodErrors = schemaValidation.error.issues.map((err: any) => ({
        file,
        severity: "error" as const,
        code: "SCHEMA_VALIDATION_FAILED",
        message: `${err.path.join(".")}: ${err.message}`,
      }));
      return {
        file,
        valid: false,
        errors: zodErrors,
        warnings: [],
      };
    }

    const validatedDomain = schemaValidation.data;

    // 2. Format validations
    errors.push(...validateDomainName(validatedDomain.name, file));
    errors.push(...validateVersion(validatedDomain, file));

    // Validate UI colors
    errors.push(...validateHexColor(validatedDomain.ui.color, "domain", file));
    if (validatedDomain.ui.entityColors) {
      for (const [entityType, color] of Object.entries(
        validatedDomain.ui.entityColors
      )) {
        errors.push(...validateHexColor(color, `entity ${entityType}`, file));
      }
    }

    // 3. Entity validations
    for (const [entityType, entityDef] of Object.entries(
      validatedDomain.entities
    )) {
      errors.push(...validateEntityTypeName(entityType, file));
      errors.push(...validateUidPrefix(entityDef.uidPrefix, entityType, file));

      // Property validations
      if (entityDef.properties) {
        for (const [propName, propDef] of Object.entries(
          entityDef.properties
        )) {
          errors.push(...validatePropertyName(propName, entityType, file));

          // Validate regex patterns
          if (
            propDef.type === "string" &&
            "pattern" in propDef &&
            propDef.pattern
          ) {
            errors.push(
              ...validateRegexPattern(propDef.pattern, propName, file)
            );
          }
        }
      }
    }

    // 4. Semantic validations
    if (validatedDomain.extendsFrom) {
      warnings.push(
        ...validateExtendsFromExists(
          allDomains,
          file,
          validatedDomain.extendsFrom
        )
      );
      errors.push(
        ...detectCircularDependencies(allDomains, file, validatedDomain.name)
      );
    }

    // Add pre-computed cross-domain errors and warnings
    errors.push(...crossDomainErrors);
    warnings.push(...crossDomainWarnings);

    // 5. Best practice validations
    errors.push(...validateDomainSize(validatedDomain, file));
    warnings.push(...validateDisplayNames(validatedDomain, file));
    warnings.push(...validatePropertyDescriptions(validatedDomain, file));

    // Separate errors and warnings
    const allIssues = [...errors, ...warnings];
    const finalErrors = allIssues.filter((e) => e.severity === "error");
    const finalWarnings = allIssues.filter((e) => e.severity === "warning");

    return {
      file,
      valid: finalErrors.length === 0,
      errors: finalErrors,
      warnings: finalWarnings,
    };
  } catch (error) {
    return {
      file,
      valid: false,
      errors: [
        {
          file,
          severity: "error",
          code: "UNEXPECTED_ERROR",
          message: `Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Validate all domain files
 */
async function validateAllDomains(): Promise<ValidationSummary> {
  console.log("🔍 Validating domain configurations...\n");

  // Find all domain files
  const domainFiles = await glob("custom-domains/**/domain.config.json", {
    cwd: process.cwd(),
    absolute: false,
  });

  if (domainFiles.length === 0) {
    console.log("⚠️  No domain configurations found in custom-domains/\n");
    return {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      results: [],
    };
  }

  // First pass: load all domains for cross-domain validation
  const allDomains = new Map<string, any>();
  for (const file of domainFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const domain = JSON.parse(content);
      if (domain.name) {
        domain._file = file; // Store file path for cross-domain error attribution
        allDomains.set(domain.name, domain);
      }
    } catch {
      // Will be caught in detailed validation
    }
  }

  // Run global cross-domain validations once
  const globalUidPrefixErrors = validateUniqueUidPrefixesGlobal(allDomains);
  const globalEntityTypeWarnings = validateUniqueEntityTypesGlobal(allDomains);

  // Second pass: detailed per-file validation
  const results: ValidationResult[] = [];
  for (const file of domainFiles) {
    const crossDomainErrors = globalUidPrefixErrors.get(file) || [];
    const crossDomainWarnings = globalEntityTypeWarnings.get(file) || [];
    const result = validateDomainFile(
      file,
      allDomains,
      crossDomainErrors,
      crossDomainWarnings
    );
    results.push(result);
  }

  // Generate summary
  const summary: ValidationSummary = {
    totalFiles: results.length,
    validFiles: results.filter((r) => r.valid).length,
    invalidFiles: results.filter((r) => !r.valid).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    results,
  };

  return summary;
}

/**
 * Print validation results
 */
function printResults(summary: ValidationSummary): void {
  console.log("Validating domain configs...\n");

  // Print file-by-file results
  for (const result of summary.results) {
    if (result.valid && result.warnings.length === 0) {
      console.log(`✅ ${result.file} - Valid`);
    } else if (result.valid && result.warnings.length > 0) {
      console.log(`⚠️  ${result.file} - Valid with warnings`);
    } else {
      console.log(`❌ ${result.file} - Invalid`);
    }

    // Print errors
    for (const error of result.errors) {
      console.log(`   - ${error.message}`);
      if (error.suggestion) {
        console.log(`     💡 ${error.suggestion}`);
      }
    }

    // Print warnings
    for (const warning of result.warnings) {
      console.log(`   ⚠️  ${warning.message}`);
      if (warning.suggestion) {
        console.log(`     💡 ${warning.suggestion}`);
      }
    }

    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log("");
    }
  }

  // Print summary
  console.log(`\n${summary.validFiles}/${summary.totalFiles} domains valid\n`);

  if (summary.totalErrors > 0) {
    console.log(`❌ ${summary.totalErrors} error(s) found`);
  }

  if (summary.totalWarnings > 0) {
    console.log(`⚠️  ${summary.totalWarnings} warning(s) found`);
  }

  if (
    summary.validFiles === summary.totalFiles &&
    summary.totalWarnings === 0
  ) {
    console.log("✅ All domains valid!\n");
  }
}

// ==================== CLI Entry Point ====================

async function main(): Promise<void> {
  try {
    const summary = await validateAllDomains();
    printResults(summary);

    // Exit with error if any domains are invalid
    if (summary.invalidFiles > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

// Run if called directly
const currentFile = path.resolve(fileURLToPath(import.meta.url));
const calledFile = path.resolve(process.argv[1]);
if (currentFile === calledFile) {
  main();
}

export {
  validateAllDomains,
  validateDomainFile,
  type ValidationResult,
  type ValidationSummary,
};
