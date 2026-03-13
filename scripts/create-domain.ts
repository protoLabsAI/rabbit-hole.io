#!/usr/bin/env tsx
/**
 * Domain Generator CLI (RAB-18)
 *
 * Interactive tool to create custom domains from templates
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { stdin as input, stdout as output } from "process";
import * as readline from "readline/promises";

const rl = readline.createInterface({ input, output });

const TEMPLATES_DIR = "custom-domains/_templates";
const OUTPUT_DIR = "custom-domains";

const TEMPLATES = {
  minimal: {
    file: "minimal.domain.json",
    description: "Minimal domain with single entity (fastest setup)",
  },
  complete: {
    file: "complete.domain.json",
    description: "Complete example with all property types (reference)",
  },
  multiEntity: {
    file: "multi-entity.domain.json",
    description: "Domain with 2 entities and relationships",
  },
  retail: {
    file: "retail.domain.json",
    description: "Ready-to-use retail/e-commerce domain",
  },
  healthcare: {
    file: "healthcare.domain.json",
    description: "Ready-to-use healthcare domain",
  },
  education: {
    file: "education.domain.json",
    description: "Ready-to-use education domain",
  },
};

interface TemplateValues {
  DOMAIN_NAME: string;
  DOMAIN_DISPLAY_NAME: string;
  DOMAIN_DESCRIPTION: string;
  DOMAIN_COLOR: string;
  DOMAIN_ICON: string;
  AUTHOR?: string;
  ENTITY_NAME?: string;
  ENTITY_PREFIX?: string;
  ENTITY_DISPLAY_NAME?: string;
  ENTITY_ICON?: string;
  ENTITY_COLOR?: string;
  ENTITY_1_NAME?: string;
  ENTITY_1_PREFIX?: string;
  ENTITY_1_DISPLAY_NAME?: string;
  ENTITY_1_ICON?: string;
  ENTITY_2_NAME?: string;
  ENTITY_2_PREFIX?: string;
  ENTITY_2_DISPLAY_NAME?: string;
  ENTITY_2_ICON?: string;
}

async function main(): Promise<void> {
  console.log("\n🚀 Domain Generator - Create Custom Domains from Templates\n");

  // 1. Select template
  console.log("Available templates:\n");
  Object.entries(TEMPLATES).forEach(([key, template]) => {
    console.log(`  ${key.padEnd(12)} - ${template.description}`);
  });

  const templateKey = await rl.question(
    "\nSelect template [minimal/complete/multiEntity/retail/healthcare/education]: "
  );

  if (!TEMPLATES[templateKey as keyof typeof TEMPLATES]) {
    console.error(`❌ Invalid template: ${templateKey}`);
    process.exit(1);
  }

  const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];

  // 2. Gather domain info
  console.log("\n--- Domain Configuration ---\n");

  const domainName = await rl.question("Domain name (snake_case): ");
  if (!domainName || !/^[a-z][a-z0-9_]*$/.test(domainName)) {
    console.error(
      "❌ Invalid domain name. Use snake_case (e.g., retail_store)"
    );
    process.exit(1);
  }

  const displayName = await rl.question("Display name: ");
  const description = await rl.question("Description: ");
  const color = await rl.question("Color (hex, e.g. #F59E0B): ");

  if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
    console.error("❌ Invalid color. Use hex format (e.g., #F59E0B)");
    process.exit(1);
  }

  const icon = await rl.question("Icon (emoji): ");

  const values: TemplateValues = {
    DOMAIN_NAME: domainName,
    DOMAIN_DISPLAY_NAME: displayName,
    DOMAIN_DESCRIPTION: description,
    DOMAIN_COLOR: color.toUpperCase(),
    DOMAIN_ICON: icon,
  };

  // 3. Template-specific prompts
  if (templateKey === "minimal" || templateKey === "complete") {
    console.log("\n--- Entity Configuration ---\n");
    const entityName = await rl.question(
      "Entity name (PascalCase, e.g. Product): "
    );
    const entityPrefix = await rl.question(
      "Entity UID prefix (snake_case, e.g. product): "
    );

    values.ENTITY_NAME = entityName;
    values.ENTITY_PREFIX = entityPrefix;
    values.ENTITY_DISPLAY_NAME = entityName;
    values.ENTITY_ICON = await rl.question("Entity icon (emoji): ");

    if (templateKey === "complete") {
      values.ENTITY_COLOR = await rl.question(
        "Entity color (hex, optional, press enter to skip): "
      );
      values.AUTHOR = await rl.question(
        "Author (optional, press enter to skip): "
      );
    }
  }

  if (templateKey === "multiEntity") {
    console.log("\n--- Entity 1 Configuration ---\n");
    values.ENTITY_1_NAME = await rl.question("Entity 1 name (PascalCase): ");
    values.ENTITY_1_PREFIX = await rl.question(
      "Entity 1 UID prefix (snake_case): "
    );
    values.ENTITY_1_DISPLAY_NAME = values.ENTITY_1_NAME;
    values.ENTITY_1_ICON = await rl.question("Entity 1 icon (emoji): ");

    console.log("\n--- Entity 2 Configuration ---\n");
    values.ENTITY_2_NAME = await rl.question("Entity 2 name (PascalCase): ");
    values.ENTITY_2_PREFIX = await rl.question(
      "Entity 2 UID prefix (snake_case): "
    );
    values.ENTITY_2_DISPLAY_NAME = values.ENTITY_2_NAME;
    values.ENTITY_2_ICON = await rl.question("Entity 2 icon (emoji): ");
  }

  // 4. Generate domain
  console.log("\n📝 Generating domain...\n");

  const templatePath = join(TEMPLATES_DIR, template.file);
  let templateContent = readFileSync(templatePath, "utf-8");

  // Replace placeholders
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      const placeholder = `{{${key}}}`;
      templateContent = templateContent.replace(
        new RegExp(placeholder, "g"),
        value
      );
    }
  });

  // Check for remaining placeholders
  const remainingPlaceholders = templateContent.match(/\{\{[A-Z_]+\}\}/g);
  if (remainingPlaceholders) {
    console.warn(
      `⚠️  Placeholders not filled: ${remainingPlaceholders.join(", ")}`
    );
    console.warn(
      "   These will need to be manually updated in the generated file.\n"
    );
  }

  // 5. Save domain
  const domainDir = join(OUTPUT_DIR, domainName);
  const outputFile = join(domainDir, "domain.config.json");

  if (existsSync(outputFile)) {
    const overwrite = await rl.question(
      `⚠️  ${outputFile} already exists. Overwrite? [y/N]: `
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log("❌ Cancelled");
      rl.close();
      process.exit(0);
    }
  }

  mkdirSync(domainDir, { recursive: true });
  writeFileSync(outputFile, templateContent, "utf-8");

  console.log(`✅ Created: ${outputFile}\n`);

  // 6. Run scanner
  const runScanner = await rl.question("Run domain scanner now? [Y/n]: ");
  if (runScanner.toLowerCase() !== "n") {
    console.log("\n🔍 Running domain scanner...\n");
    try {
      execSync("pnpm run scan:domains", { stdio: "inherit" });
      console.log("\n✅ Domain registered successfully!");
    } catch (error) {
      console.error("\n❌ Scanner failed. Check your domain configuration.");
      console.error("   Run 'pnpm run scan:domains' to see detailed errors.");
    }
  }

  console.log("\n📋 Next steps:");
  console.log(`   1. Review: ${outputFile}`);
  console.log("   2. Customize entity properties as needed");
  console.log("   3. Update relationships if applicable");
  console.log("   4. Run 'pnpm run scan:domains' to validate");
  console.log("   5. Run 'pnpm run dev' to test in application\n");

  rl.close();
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
