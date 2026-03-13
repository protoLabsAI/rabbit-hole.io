/**
 * Example usage of discoverEntitiesTool
 *
 * Run with: tsx packages/proto-llm-tools/src/tools/core/discover-entities/example.ts
 */

import { fileURLToPath } from "url";

import { discoverEntitiesTool } from "./index";

async function basicDiscovery() {
  console.log("\n=== Basic Entity Discovery ===\n");

  const content = `
    Marie Curie was a Polish-French physicist and chemist who conducted pioneering 
    research on radioactivity. She was the first woman to win a Nobel Prize, the 
    first person to win the Nobel Prize twice, and the only person to win the Nobel 
    Prize in two scientific fields. She worked at the Sorbonne in Paris alongside 
    her husband Pierre Curie. Their research led to the discovery of the elements 
    polonium and radium.
  `.trim();

  const result = await discoverEntitiesTool.invoke({
    content,
    domains: ["social", "academic", "geographic"],
    maxEntities: 25,
    includeSourceGrounding: true,
  });

  console.log("Success:", result.success);
  console.log("\nDiscovered Entities:");
  result.entities.forEach((entity) => {
    console.log(
      `  - ${entity.type}: ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
    if (entity.sourceText) {
      console.log(`    Source: "${entity.sourceText.substring(0, 50)}..."`);
    }
  });
  console.log("\nMetadata:");
  console.log(`  Total found: ${result.metadata.totalFound}`);
  console.log(`  Returned: ${result.metadata.returned}`);
  console.log(`  Domains: ${result.metadata.domains.join(", ")}`);
}

async function domainSpecificDiscovery() {
  console.log("\n=== Domain-Specific Discovery (Medical) ===\n");

  const content = `
    The patient was diagnosed with Type 2 Diabetes Mellitus and hypertension. 
    Treatment plan includes Metformin 500mg twice daily and Lisinopril 10mg once daily. 
    Patient was referred to the Mayo Clinic Diabetes Center for specialized care. 
    Regular monitoring of HbA1c levels and blood pressure is recommended. The patient 
    should follow a low-carbohydrate diet and engage in regular physical exercise.
  `.trim();

  const result = await discoverEntitiesTool.invoke({
    content,
    domains: ["medical"],
    maxEntities: 15,
    confidenceThreshold: 0.75,
  });

  console.log("Success:", result.success);
  console.log("\nMedical Entities:");
  result.entities.forEach((entity) => {
    console.log(
      `  - ${entity.type}: ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
  });
  console.log(
    "\nEntity Types Extracted:",
    result.metadata.entityTypes.join(", ")
  );
}

async function entityTypeFiltering() {
  console.log("\n=== Entity Type Filtering ===\n");

  const content = `
    Elon Musk is the CEO of Tesla and SpaceX. Tesla is headquartered in Austin, Texas, 
    while SpaceX operates from Hawthorne, California. Both companies are at the 
    forefront of innovation in the electric vehicle and space exploration industries 
    respectively. Musk previously founded PayPal and is also involved with Neuralink 
    and The Boring Company.
  `.trim();

  const result = await discoverEntitiesTool.invoke({
    content,
    entityTypes: ["Person", "Organization"], // Only extract people and organizations
    maxEntities: 20,
  });

  console.log("Success:", result.success);
  console.log("\nEntities (People and Organizations only):");

  const people = result.entities.filter((e) => e.type === "Person");
  const orgs = result.entities.filter((e) => e.type === "Organization");

  console.log("\nPeople:");
  people.forEach((entity) => {
    console.log(
      `  - ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
  });

  console.log("\nOrganizations:");
  orgs.forEach((entity) => {
    console.log(
      `  - ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
  });
}

async function focusEntityPrioritization() {
  console.log("\n=== Focus Entity Prioritization ===\n");

  const content = `
    The history of physics includes many brilliant scientists. Isaac Newton developed 
    classical mechanics in the 17th century. Albert Einstein revolutionized physics 
    with his theory of relativity in the early 20th century. Marie Curie made 
    groundbreaking discoveries in radioactivity. Stephen Hawking contributed to our 
    understanding of black holes. Richard Feynman advanced quantum mechanics. 
    Niels Bohr developed the Bohr model of the atom. Max Planck is considered the 
    father of quantum theory. Werner Heisenberg formulated the uncertainty principle. 
    And many others made significant contributions to the field.
  `.trim();

  const result = await discoverEntitiesTool.invoke({
    content,
    domains: ["social", "academic"],
    focusEntityNames: ["Albert Einstein", "Marie Curie"], // Ensure these are included
    maxEntities: 5, // Very low limit to demonstrate prioritization
  });

  console.log("Success:", result.success);
  console.log("\nDiscovered Entities (limit: 5, focus on Einstein and Curie):");
  result.entities.forEach((entity) => {
    const isFocus = result.metadata.focusEntityUids?.includes(entity.uid);
    const marker = isFocus ? "⭐" : "  ";
    console.log(
      `${marker} ${entity.name} (${entity.type}, confidence: ${entity.confidence.toFixed(2)})`
    );
  });

  if (result.metadata.focusEntityUids) {
    console.log(
      "\nFocus entities found:",
      result.metadata.focusEntityUids.length
    );
    console.log("Total entities found:", result.metadata.totalFound);
    console.log("Entities returned:", result.metadata.returned);
  }
}

async function confidenceFiltering() {
  console.log("\n=== Confidence Filtering ===\n");

  const content = `
    The article mentions several companies in passing, including some vague 
    references. Tesla is definitely a major electric vehicle manufacturer. 
    There might be a company called XYZ Corp mentioned, though it's unclear. 
    Apple is a well-known technology company. Some startups are mentioned 
    but not named clearly.
  `.trim();

  // High confidence threshold
  const highConfResult = await discoverEntitiesTool.invoke({
    content,
    domains: ["technology"],
    confidenceThreshold: 0.85, // Only high-confidence entities
  });

  // Low confidence threshold
  const lowConfResult = await discoverEntitiesTool.invoke({
    content,
    domains: ["technology"],
    confidenceThreshold: 0.5, // Include lower-confidence entities
  });

  console.log("High Confidence (>= 0.85):");
  highConfResult.entities.forEach((entity) => {
    console.log(
      `  - ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
  });

  console.log("\nLow Confidence (>= 0.5):");
  lowConfResult.entities.forEach((entity) => {
    console.log(
      `  - ${entity.name} (confidence: ${entity.confidence.toFixed(2)})`
    );
  });

  console.log(
    `\nHigh threshold found: ${highConfResult.entities.length} entities`
  );
  console.log(`Low threshold found: ${lowConfResult.entities.length} entities`);
}

async function multiDomainDiscovery() {
  console.log("\n=== Multi-Domain Discovery ===\n");

  const content = `
    The research project on climate change involved collaboration between Harvard 
    University, MIT, and Stanford University. The study was published in the journal 
    Nature Climate Change. Researchers analyzed data from weather stations across 
    North America, Europe, and Asia. The findings suggest significant warming trends 
    in the Arctic region. The research was funded by the National Science Foundation 
    and the European Research Council. Lead researcher Dr. Sarah Johnson presented 
    the findings at a conference in Geneva, Switzerland.
  `.trim();

  const result = await discoverEntitiesTool.invoke({
    content,
    domains: ["social", "academic", "geographic"],
    maxEntities: 30,
  });

  console.log("Success:", result.success);
  console.log("\nEntities by Type:");

  // Define entity type for strong typing
  type Entity = (typeof result.entities)[number];

  // Group entities by type
  const entitiesByType = result.entities.reduce(
    (acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  Object.entries(entitiesByType).forEach(
    ([type, entities]: [string, Entity[]]) => {
      console.log(`\n${type} (${entities.length}):`);
      entities.forEach((entity) => {
        console.log(`  - ${entity.name}`);
      });
    }
  );
}

// Run examples
async function main() {
  console.log("🔍 Entity Discovery Tool Examples\n");
  console.log("==================================");

  // Helper function for rate limiting
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    await basicDiscovery();
    await delay(2000);

    await domainSpecificDiscovery();
    await delay(2000);

    await entityTypeFiltering();
    await delay(2000);

    await focusEntityPrioritization();
    await delay(2000);

    await confidenceFiltering();
    await delay(2000);

    await multiDomainDiscovery();

    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("\n❌ Example failed:", error);
    process.exit(1);
  }
}

// Only run if executed directly
const currentFile = fileURLToPath(import.meta.url);
const runtimeScript = process.argv[1];
if (currentFile === runtimeScript || runtimeScript.endsWith("example.ts")) {
  main();
}
