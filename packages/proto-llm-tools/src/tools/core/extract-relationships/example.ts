/**
 * Example usage of extractRelationshipsTool
 *
 * Run with: tsx packages/proto-llm-tools/src/tools/core/extract-relationships/example.ts
 */

import { extractRelationshipsTool } from "./index";

async function basicRelationshipExtraction() {
  console.log("\n=== Basic Relationship Extraction ===\n");

  const content = `
    Albert Einstein worked at Princeton University from 1933 to 1955 as a professor 
    of theoretical physics. During his time there, he collaborated extensively with 
    Niels Bohr on quantum mechanics research. Einstein also worked closely with 
    Kurt Gödel, who was also at Princeton. The Institute for Advanced Study, 
    located in Princeton, provided the academic environment for their groundbreaking work.
  `.trim();

  const entities = [
    {
      uid: "person:albert_einstein",
      name: "Albert Einstein",
      type: "Person",
    },
    {
      uid: "org:princeton_university",
      name: "Princeton University",
      type: "Organization",
    },
    {
      uid: "person:niels_bohr",
      name: "Niels Bohr",
      type: "Person",
    },
    {
      uid: "person:kurt_godel",
      name: "Kurt Gödel",
      type: "Person",
    },
    {
      uid: "org:institute_advanced_study",
      name: "Institute for Advanced Study",
      type: "Organization",
    },
    {
      uid: "loc:princeton",
      name: "Princeton",
      type: "Location",
    },
  ];

  const result = await extractRelationshipsTool.invoke({
    content,
    entities,
    domains: ["social", "academic", "geographic"],
    modelId: "gpt-4o-mini", // Test with same model as working API route
  });

  console.log("Success:", result.success);
  console.log("\nRelationships:");
  result.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(
      `  ${source?.name} -[${rel.type}]-> ${target?.name} (confidence: ${rel.confidence.toFixed(2)})`
    );
    if (rel.properties && Object.keys(rel.properties).length > 0) {
      console.log(`    Properties:`, JSON.stringify(rel.properties));
    }
  });

  console.log("\nMetadata:");
  console.log(`  Total found: ${result.metadata.totalFound}`);
  console.log(`  Returned: ${result.metadata.returned}`);
  console.log(`  Batches processed: ${result.metadata.batchesProcessed}`);
}

async function focusEntityStrategy() {
  console.log("\n=== Focus Entity Strategy ===\n");

  const content = `
    Marie Curie conducted pioneering research on radioactivity at the Sorbonne in Paris. 
    She worked alongside her husband Pierre Curie. Together, they discovered the elements 
    polonium and radium. Marie Curie became the first woman to win a Nobel Prize. She was 
    awarded the Nobel Prize in Physics in 1903, shared with Pierre Curie and Henri Becquerel. 
    Later, she won the Nobel Prize in Chemistry in 1911. She also founded the Curie 
    Institute in Paris. Albert Einstein corresponded with Marie Curie and they became friends. 
    Ernest Rutherford also collaborated with Marie Curie on radioactivity research. The 
    University of Paris appointed her as the first female professor.
  `.trim();

  const entities = [
    { uid: "person:marie_curie", name: "Marie Curie", type: "Person" },
    { uid: "org:sorbonne", name: "Sorbonne", type: "Organization" },
    { uid: "loc:paris", name: "Paris", type: "Location" },
    { uid: "person:pierre_curie", name: "Pierre Curie", type: "Person" },
    { uid: "element:polonium", name: "polonium", type: "Element" },
    { uid: "element:radium", name: "radium", type: "Element" },
    {
      uid: "award:nobel_physics",
      name: "Nobel Prize in Physics",
      type: "Award",
    },
    {
      uid: "award:nobel_chemistry",
      name: "Nobel Prize in Chemistry",
      type: "Award",
    },
    { uid: "person:henri_becquerel", name: "Henri Becquerel", type: "Person" },
    {
      uid: "org:curie_institute",
      name: "Curie Institute",
      type: "Organization",
    },
    { uid: "person:albert_einstein", name: "Albert Einstein", type: "Person" },
    {
      uid: "person:ernest_rutherford",
      name: "Ernest Rutherford",
      type: "Person",
    },
    {
      uid: "org:university_paris",
      name: "University of Paris",
      type: "Organization",
    },
  ];

  // Focus on Marie Curie - only extract relationships involving her
  const result = await extractRelationshipsTool.invoke({
    content,
    entities,
    focusEntityUids: ["person:marie_curie"], // Only relationships involving Marie Curie
    domains: ["social", "academic", "geographic"],
    batchSize: 5, // Process other entities in batches of 5
  });

  console.log("Success:", result.success);
  console.log("\nRelationships (focused on Marie Curie):");
  result.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(
      `  ${source?.name} -[${rel.type}]-> ${target?.name} (confidence: ${rel.confidence.toFixed(2)})`
    );
  });

  console.log("\nMetadata:");
  console.log(`  Focus entities: ${result.metadata.focusEntitiesCount}`);
  console.log(`  Entities processed: ${result.metadata.entitiesProcessed}`);
  console.log(`  Batches processed: ${result.metadata.batchesProcessed}`);
  console.log(`  Relationships found: ${result.metadata.returned}`);
}

async function domainSpecificRelationships() {
  console.log("\n=== Domain-Specific Relationships (Medical) ===\n");

  const content = `
    The patient was diagnosed with Type 2 Diabetes Mellitus by Dr. Sarah Johnson 
    at Mayo Clinic. Treatment plan includes Metformin 500mg twice daily, which helps 
    control blood sugar levels. The patient was also prescribed Lisinopril for hypertension. 
    Regular monitoring at the Mayo Clinic Diabetes Center is recommended. The condition 
    can lead to complications including diabetic neuropathy if left untreated.
  `.trim();

  const entities = [
    { uid: "person:patient", name: "patient", type: "Person" },
    {
      uid: "condition:diabetes",
      name: "Type 2 Diabetes Mellitus",
      type: "Condition",
    },
    { uid: "person:dr_johnson", name: "Dr. Sarah Johnson", type: "Person" },
    { uid: "org:mayo_clinic", name: "Mayo Clinic", type: "Organization" },
    { uid: "med:metformin", name: "Metformin", type: "Medication" },
    { uid: "med:lisinopril", name: "Lisinopril", type: "Medication" },
    {
      uid: "condition:hypertension",
      name: "hypertension",
      type: "Condition",
    },
    {
      uid: "org:diabetes_center",
      name: "Mayo Clinic Diabetes Center",
      type: "Organization",
    },
    {
      uid: "condition:neuropathy",
      name: "diabetic neuropathy",
      type: "Condition",
    },
  ];

  const result = await extractRelationshipsTool.invoke({
    content,
    entities,
    domains: ["medical"], // Medical domain relationship types
  });

  console.log("Success:", result.success);
  console.log("\nMedical Relationships:");
  result.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(
      `  ${source?.name} -[${rel.type}]-> ${target?.name} (confidence: ${rel.confidence.toFixed(2)})`
    );
  });

  console.log("\nDomains used:", result.metadata.domains.join(", "));
}

async function confidenceFiltering() {
  console.log("\n=== Confidence Filtering ===\n");

  const content = `
    Elon Musk is the CEO of Tesla and SpaceX. He previously founded PayPal. 
    Tesla is headquartered in Austin, Texas. There are rumors that Musk might 
    be involved with other companies, but this is unconfirmed. SpaceX operates 
    facilities in Hawthorne, California.
  `.trim();

  const entities = [
    { uid: "person:elon_musk", name: "Elon Musk", type: "Person" },
    { uid: "org:tesla", name: "Tesla", type: "Organization" },
    { uid: "org:spacex", name: "SpaceX", type: "Organization" },
    { uid: "org:paypal", name: "PayPal", type: "Organization" },
    { uid: "loc:austin", name: "Austin", type: "Location" },
    { uid: "loc:texas", name: "Texas", type: "Location" },
    { uid: "loc:hawthorne", name: "Hawthorne", type: "Location" },
    { uid: "loc:california", name: "California", type: "Location" },
  ];

  // High confidence threshold
  const highConfResult = await extractRelationshipsTool.invoke({
    content,
    entities,
    confidenceThreshold: 0.85,
  });

  // Lower confidence threshold
  const lowConfResult = await extractRelationshipsTool.invoke({
    content,
    entities,
    confidenceThreshold: 0.6,
  });

  console.log("High Confidence (>= 0.85):");
  highConfResult.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(
      `  ${source?.name} -[${rel.type}]-> ${target?.name} (${rel.confidence.toFixed(2)})`
    );
  });

  console.log("\nLower Confidence (>= 0.6):");
  lowConfResult.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(
      `  ${source?.name} -[${rel.type}]-> ${target?.name} (${rel.confidence.toFixed(2)})`
    );
  });

  console.log(
    `\nHigh threshold: ${highConfResult.relationships.length} relationships`
  );
  console.log(
    `Lower threshold: ${lowConfResult.relationships.length} relationships`
  );
}

async function batchProcessing() {
  console.log("\n=== Batch Processing (Large Entity Set) ===\n");

  const content = `
    The conference on quantum computing brought together leading researchers from 
    around the world. Professor Alice Zhang from MIT presented her work on quantum 
    algorithms. Dr. Bob Williams from Stanford discussed quantum error correction. 
    Professor Carol Chen from Berkeley shared insights on quantum cryptography. 
    The event was hosted at the California Institute of Technology. Google and IBM 
    were major sponsors. Microsoft also participated as a technology partner.
  `.trim();

  const entities = [
    {
      uid: "person:alice_zhang",
      name: "Professor Alice Zhang",
      type: "Person",
    },
    { uid: "org:mit", name: "MIT", type: "Organization" },
    { uid: "person:bob_williams", name: "Dr. Bob Williams", type: "Person" },
    { uid: "org:stanford", name: "Stanford", type: "Organization" },
    { uid: "person:carol_chen", name: "Professor Carol Chen", type: "Person" },
    { uid: "org:berkeley", name: "Berkeley", type: "Organization" },
    {
      uid: "org:caltech",
      name: "California Institute of Technology",
      type: "Organization",
    },
    { uid: "org:google", name: "Google", type: "Organization" },
    { uid: "org:ibm", name: "IBM", type: "Organization" },
    { uid: "org:microsoft", name: "Microsoft", type: "Organization" },
    {
      uid: "event:conference",
      name: "conference on quantum computing",
      type: "Event",
    },
    { uid: "topic:algorithms", name: "quantum algorithms", type: "Concept" },
    {
      uid: "topic:error_correction",
      name: "quantum error correction",
      type: "Concept",
    },
    {
      uid: "topic:cryptography",
      name: "quantum cryptography",
      type: "Concept",
    },
  ];

  const result = await extractRelationshipsTool.invoke({
    content,
    entities,
    batchSize: 5, // Process in smaller batches
    domains: ["social", "academic", "technology"],
  });

  console.log("Success:", result.success);
  console.log("\nRelationships (from large entity set):");
  result.relationships.forEach((rel) => {
    const source = entities.find((e) => e.uid === rel.source);
    const target = entities.find((e) => e.uid === rel.target);
    console.log(`  ${source?.name} -[${rel.type}]-> ${target?.name}`);
  });

  console.log("\nProcessing Details:");
  console.log(`  Entities processed: ${result.metadata.entitiesProcessed}`);
  console.log(`  Batches processed: ${result.metadata.batchesProcessed}`);
  console.log(`  Relationships found: ${result.metadata.returned}`);
}

// Run examples
async function main() {
  console.log("🔗 Relationship Extraction Tool Examples\n");
  console.log("==========================================");

  try {
    await basicRelationshipExtraction();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Rate limiting

    await focusEntityStrategy();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await domainSpecificRelationships();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await confidenceFiltering();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await batchProcessing();

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
