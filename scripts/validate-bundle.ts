/**
 * Validate Bundle
 *
 * Validates a Rabbit Hole bundle JSON file against registered domains
 */

import { readFileSync } from "fs";

// Direct import from source (not exported from main index due to Node.js fs/path deps)
import { allCustomDomainConfigs } from "../packages/types/src/custom-domains";
import { DomainRegistry } from "../packages/types/src/domain-system/domain-registry";

interface Bundle {
  evidence?: any[];
  files?: any[];
  content?: any[];
  entities?: Array<{
    uid: string;
    type: string;
    name: string;
    [key: string]: any;
  }>;
  relationships?: Array<{
    uid: string;
    type: string;
    source: string;
    target: string;
    [key: string]: any;
  }>;
}

function validateBundle(bundlePath: string): void {
  console.log(`🔍 Validating bundle: ${bundlePath}\n`);

  // Initialize domains - register all custom domains
  const domainRegistry = DomainRegistry.getInstance();
  allCustomDomainConfigs.forEach((config) => {
    domainRegistry.register(config);
  });

  // Read bundle
  const bundleJson = readFileSync(bundlePath, "utf-8");
  const bundle: Bundle = JSON.parse(bundleJson);

  // Normalize optional arrays to prevent undefined errors
  const entities = bundle.entities ?? [];
  const relationships = bundle.relationships ?? [];

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate entities
  console.log("📦 Validating entities...");
  const entityTypes = new Set<string>();

  for (const entity of entities) {
    entityTypes.add(entity.type);

    // Check if entity type is registered in any domain
    const domainName = domainRegistry.getDomainFromEntityType(entity.type);
    if (!domainName) {
      errors.push(
        `Unknown entity type: ${entity.type} (entity: ${entity.name})`
      );
    }
  }

  console.log(`   • ${entities.length} entities`);
  console.log(
    `   • ${entityTypes.size} unique entity types: ${Array.from(entityTypes).join(", ")}`
  );

  // Validate relationships
  console.log("\n🔗 Validating relationships...");
  const relationshipTypes = new Set<string>();

  // Create entity UID set for O(1) lookups instead of O(n) with Array.some()
  const entityUidSet = new Set(entities.map((e) => e.uid));

  for (const rel of relationships) {
    relationshipTypes.add(rel.type);

    // Check if source and target exist using O(1) Set lookups
    const sourceExists = entityUidSet.has(rel.source);
    const targetExists = entityUidSet.has(rel.target);

    if (!sourceExists) {
      errors.push(
        `Relationship ${rel.uid} references missing source: ${rel.source}`
      );
    }
    if (!targetExists) {
      errors.push(
        `Relationship ${rel.uid} references missing target: ${rel.target}`
      );
    }
  }

  console.log(`   • ${relationships.length} relationships`);
  console.log(
    `   • ${relationshipTypes.size} unique relationship types: ${Array.from(relationshipTypes).join(", ")}`
  );

  // Report results
  console.log("\n" + "=".repeat(60));

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Bundle is valid!");
    console.log("\n📊 Summary:");
    console.log(`   • ${entities.length} entities`);
    console.log(`   • ${relationships.length} relationships`);
    console.log(`   • ${entityTypes.size} entity types`);
    console.log(`   • ${relationshipTypes.size} relationship types`);
  } else {
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} error(s) found:\n`);
      errors.forEach((err) => console.log(`   • ${err}`));
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
      warnings.forEach((warn) => console.log(`   • ${warn}`));
    }

    process.exit(1);
  }
}

// Get bundle path from command line or use default
const bundlePath = process.argv[2] || "test-data/design-system-example.json";

try {
  validateBundle(bundlePath);
} catch (error) {
  console.error("❌ Validation failed:", error);
  process.exit(1);
}
