/**
 * Example usage of enrichEntityTool
 *
 * Run with: tsx packages/proto-llm-tools/src/tools/core/enrich-entity/example.ts
 */

import { enrichEntityTool } from "./index";

async function exampleSchemaBasedEnrichment() {
  console.log("\n=== Schema-Based Enrichment Example ===\n");

  const content = `
    Tesla Inc. is an American multinational automotive and clean energy company 
    headquartered in Austin, Texas. Founded in 2003 by Martin Eberhard and Marc Tarpenning, 
    the company is now led by CEO Elon Musk. Tesla specializes in electric vehicles, 
    battery energy storage, solar panels, and related products and services. 
    As of 2024, Tesla operates manufacturing facilities in California, Nevada, 
    Texas, New York, Shanghai, and Berlin.
  `.trim();

  const result = await enrichEntityTool.invoke({
    entityName: "Tesla Inc.",
    entityType: "Organization",
    content,
    schema: {
      description: {
        type: "string",
        description: "Brief description of the company",
      },
      founded: { type: "number", description: "Year founded" },
      headquarters: { type: "string", description: "Headquarters location" },
      ceo: { type: "string", description: "Current CEO name" },
      industries: {
        type: "array",
        items: { type: "string" },
        description: "Industries the company operates in",
      },
      manufacturing_locations: {
        type: "array",
        items: { type: "string" },
        description: "Manufacturing facility locations",
      },
    },
    fieldsToExtract: [
      "description",
      "founded",
      "headquarters",
      "ceo",
      "industries",
      "manufacturing_locations",
    ],
    modelId: "gemini-2.5-flash-lite",
    temperature: 0.3,
    includeSourceGrounding: true,
  });

  console.log("Success:", result.success);
  console.log("\nEnriched Data:");
  console.log(JSON.stringify(result.enrichedData, null, 2));
  console.log("\nMetadata:");
  console.log(JSON.stringify(result.metadata, null, 2));

  if (result.sourceGrounding && result.sourceGrounding.length > 0) {
    console.log("\nSource Grounding (first 3):");
    console.log(JSON.stringify(result.sourceGrounding.slice(0, 3), null, 2));
  }
}

async function exampleBasedEnrichment() {
  console.log("\n=== Example-Based Enrichment ===\n");

  const content = `
    Albert Einstein was a German-born theoretical physicist who is widely regarded 
    as one of the greatest scientists of all time. Born on March 14, 1879, in Ulm, 
    Germany, Einstein developed the theory of relativity, one of the two pillars of 
    modern physics. He received the Nobel Prize in Physics in 1921 for his discovery 
    of the law of the photoelectric effect. Einstein emigrated to the United States 
    in 1933 and became a professor at Princeton University, where he remained until 
    his death in 1955.
  `.trim();

  const result = await enrichEntityTool.invoke({
    entityName: "Albert Einstein",
    entityType: "Person",
    content,
    examples: [
      {
        input_text: `
          Marie Curie was a Polish-born physicist and chemist who conducted pioneering 
          research on radioactivity. Born on November 7, 1867, in Warsaw, Poland, she 
          was the first woman to win a Nobel Prize. She received the Nobel Prize in 
          Physics in 1903 and the Nobel Prize in Chemistry in 1911. Curie became a 
          professor at the University of Paris and passed away in 1934.
        `,
        expected_output: {
          birthDate: "November 7, 1867",
          birthPlace: "Warsaw, Poland",
          nationality: "Polish",
          occupation: "physicist and chemist",
          education: "University of Paris",
          awards: [
            "Nobel Prize in Physics (1903)",
            "Nobel Prize in Chemistry (1911)",
          ],
          major_contributions: ["pioneering research on radioactivity"],
          death_year: 1934,
        },
      },
    ],
    fieldsToExtract: [
      "birthDate",
      "birthPlace",
      "nationality",
      "occupation",
      "education",
      "awards",
      "major_contributions",
      "death_year",
    ],
    modelId: "gemini-2.5-flash-lite",
    temperature: 0.3,
  });

  console.log("Success:", result.success);
  console.log("\nEnriched Data:");
  console.log(JSON.stringify(result.enrichedData, null, 2));
  console.log("\nMetadata:");
  console.log(JSON.stringify(result.metadata, null, 2));
}

async function enrichmentWithCustomContent() {
  console.log("\n=== Enrichment with Custom Content Source ===\n");

  // Simulating content from a PDF, web scrape, or user input
  const customContent = `
    SpaceX, formally known as Space Exploration Technologies Corp., was founded 
    by Elon Musk in 2002 with the goal of reducing space transportation costs and 
    enabling the colonization of Mars. The company is headquartered in Hawthorne, 
    California. SpaceX has developed several launch vehicles including Falcon 9, 
    Falcon Heavy, and the Starship spacecraft. In 2020, SpaceX became the first 
    private company to send astronauts to the International Space Station.
  `.trim();

  const result = await enrichEntityTool.invoke({
    entityName: "SpaceX",
    entityType: "Organization",
    content: customContent,
    schema: {
      full_name: "string",
      founded_year: "number",
      founder: "string",
      headquarters: "string",
      mission: "string",
      products: "array<string>",
      achievements: "array<string>",
    },
    modelId: "gemini-2.5-flash-lite",
  });

  console.log("Success:", result.success);
  console.log("\nEnriched Data:");
  console.log(JSON.stringify(result.enrichedData, null, 2));
  console.log("\nFields Extracted:", result.metadata.fieldsExtracted);
  console.log("Schema Constraints Used:", result.metadata.useSchemaConstraints);
}

// Run examples
async function main() {
  console.log("🚀 Entity Enrichment Tool Examples\n");
  console.log("===================================");

  try {
    await exampleSchemaBasedEnrichment();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Rate limiting

    await exampleBasedEnrichment();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await enrichmentWithCustomContent();

    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("\n❌ Example failed:", error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  main();
}
