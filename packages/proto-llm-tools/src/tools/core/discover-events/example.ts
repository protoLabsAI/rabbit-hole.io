/**
 * Example usage of discoverEventsTool
 *
 * Run with: tsx packages/proto-llm-tools/src/tools/core/discover-events/example.ts
 */

import { discoverEventsTool } from "./index";

async function basicEventDiscovery() {
  console.log("\n=== Basic Event Discovery ===\n");

  const content = `
    Donald Trump held a campaign rally in Des Moines, Iowa on January 15, 2024, 
    drawing thousands of supporters. The event focused on economic policy and 
    border security. Later that month, on January 28, he appeared in federal court 
    for a hearing related to classified documents. In March, Trump announced his 
    running mate at a major press conference in Mar-a-Lago.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "person:donald_trump",
    primaryEntityName: "Donald Trump",
    maxEvents: 50,
    includeSourceGrounding: true,
  });

  console.log("Success:", result.success);
  console.log(`\nDiscovered ${result.events.length} Events:`);

  result.events.forEach((event) => {
    console.log(`\n  ${event.name}`);
    console.log(`    Type: ${event.eventType || "unknown"}`);
    console.log(`    Date: ${event.date || "not specified"}`);
    console.log(`    Location: ${event.location || "not specified"}`);
    console.log(`    Significance: ${event.significance || "not specified"}`);
    console.log(`    Confidence: ${event.confidence.toFixed(2)}`);
    if (event.sourceText) {
      console.log(`    Source: "${event.sourceText.substring(0, 60)}..."`);
    }
  });

  console.log("\nMetadata:");
  console.log(`  Total found: ${result.metadata.totalFound}`);
  console.log(`  Returned: ${result.metadata.returned}`);
  console.log(`  Processing time: ${result.metadata.processingTime}ms`);
}

async function eventTypeFiltering() {
  console.log("\n=== Event Type Filtering ===\n");

  const content = `
    Tesla held its annual shareholder meeting on June 13, 2024, at the Gigafactory 
    in Austin, Texas. CEO Elon Musk announced several new product launches including 
    the Cybertruck production ramp-up. The company also reported a data security 
    breach on July 2, 2024, affecting customer payment information. Following the 
    breach, Tesla hosted an emergency all-hands meeting with employees. In August, 
    the company celebrated the production of its 5 millionth vehicle.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:tesla",
    primaryEntityName: "Tesla",
    eventTypes: ["meeting", "security_breach", "milestone"],
    maxEvents: 25,
  });

  console.log("Success:", result.success);
  console.log(
    `\nDiscovered ${result.events.length} Events (filtered by type):`
  );

  result.events.forEach((event) => {
    console.log(
      `  - ${event.name} (${event.eventType}) on ${event.date || "unknown date"}`
    );
  });

  console.log(
    `\nEvent types searched: ${result.metadata.eventTypes.join(", ")}`
  );
}

async function dateRangeFiltering() {
  console.log("\n=== Date Range Filtering ===\n");

  const content = `
    Joe Biden held a town hall meeting in Philadelphia on March 5, 2023. 
    In June 2023, he met with NATO leaders at the annual summit in Brussels. 
    On January 10, 2024, Biden delivered his State of the Union address. 
    In March 2024, he held a press conference about infrastructure progress. 
    Biden attended the G7 summit in Japan in May 2024. Later in July 2024, 
    he participated in a climate change conference in Paris.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "person:joe_biden",
    primaryEntityName: "Joe Biden",
    dateRange: {
      from: "2024-01-01",
      to: "2024-12-31",
    },
    maxEvents: 50,
  });

  console.log("Success:", result.success);
  console.log(`\nEvents in 2024 only (${result.events.length} found):`);

  result.events.forEach((event) => {
    console.log(`  - ${event.name} on ${event.date}`);
  });

  console.log("\nAll dates are within 2024 range ✓");
}

async function significanceFiltering() {
  console.log("\n=== Significance Filtering ===\n");

  const content = `
    OpenAI announced a minor bug fix update to GPT-4 on March 1, 2024. 
    The company held an internal team meeting on March 15 to discuss 
    product roadmap. On May 13, 2024, OpenAI launched GPT-4o, a major 
    milestone in AI development that received global media coverage. 
    In June, the company faced a security breach affecting some user accounts. 
    On September 12, OpenAI announced a historic $6.6 billion funding round, 
    making it one of the most valuable AI companies in the world.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:openai",
    primaryEntityName: "OpenAI",
    significance: ["major", "historic"],
    confidenceThreshold: 0.75,
  });

  console.log("Success:", result.success);
  console.log(`\nMajor/Historic Events Only (${result.events.length} found):`);

  result.events.forEach((event) => {
    console.log(
      `  - ${event.name} (${event.significance}) - confidence: ${event.confidence.toFixed(2)}`
    );
    if (event.media_coverage) {
      console.log(`    Media coverage: ${event.media_coverage}`);
    }
  });
}

async function combinedFiltering() {
  console.log("\n=== Combined Filtering ===\n");

  const content = `
    Elon Musk's SpaceX launched the Starship test flight on April 20, 2023, 
    which ended in an explosion shortly after liftoff. The company held an 
    investigation meeting in May 2023 to analyze the failure. On November 18, 
    2023, SpaceX successfully launched Starship's second test flight, reaching 
    space for the first time. In March 2024, the third test flight achieved 
    significant milestones including orbital velocity. On June 6, 2024, Starship 
    completed its fourth test flight with a successful ocean landing. SpaceX 
    announced plans for the fifth test in August 2024. In September 2024, 
    SpaceX held a major conference to announce commercial lunar missions.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:spacex",
    primaryEntityName: "SpaceX",
    eventTypes: ["launch", "conference", "milestone"],
    dateRange: {
      from: "2024-01-01",
      to: "2024-12-31",
    },
    significance: ["major", "historic"],
    maxEvents: 10,
    confidenceThreshold: 0.8,
  });

  console.log("Success:", result.success);
  console.log(`\nFiltered Events (${result.events.length} found):`);
  console.log("  Filters applied:");
  console.log("    - Event types: launch, conference, milestone");
  console.log("    - Date range: 2024 only");
  console.log("    - Significance: major or historic");
  console.log("    - Confidence: >= 0.80");

  console.log("\nResults:");
  result.events.forEach((event) => {
    console.log(`\n  ${event.name}`);
    console.log(`    Type: ${event.eventType}`);
    console.log(`    Date: ${event.date}`);
    console.log(`    Significance: ${event.significance}`);
    console.log(`    Confidence: ${event.confidence.toFixed(2)}`);
  });
}

async function politicalEventsDiscovery() {
  console.log("\n=== Political Events Discovery ===\n");

  const content = `
    Kamala Harris announced her candidacy for president on July 21, 2024, 
    following President Biden's decision not to seek reelection. She held 
    her first campaign rally in Milwaukee on July 23, drawing over 15,000 
    supporters. In August, the Democratic National Convention nominated 
    Harris as the party's presidential candidate in Chicago. Throughout 
    September, Harris participated in numerous town halls and policy 
    announcement events. She attended three presidential debates with 
    her Republican opponent. In October, Harris faced a legal hearing 
    regarding campaign finance disclosures.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "person:kamala_harris",
    primaryEntityName: "Kamala Harris",
    eventTypes: ["rally", "election", "announcement", "legal_proceeding"],
    maxEvents: 50,
  });

  console.log("Success:", result.success);
  console.log(`\nPolitical Events (${result.events.length} found):`);

  type EventType = (typeof result.events)[number];
  const byType = result.events.reduce(
    (acc, event) => {
      const type = event.eventType || "unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(event);
      return acc;
    },
    {} as Record<string, EventType[]>
  );

  (Object.entries(byType) as Array<[string, EventType[]]>).forEach(
    ([type, events]) => {
      console.log(`\n  ${type.toUpperCase()}: ${events.length} events`);
      events.forEach((event) => {
        console.log(`    - ${event.name} (${event.date || "no date"})`);
      });
    }
  );
}

async function techEventsDiscovery() {
  console.log("\n=== Tech Events Discovery ===\n");

  const content = `
    Microsoft announced the acquisition of Activision Blizzard for $68.7 billion 
    on January 18, 2022, the largest gaming acquisition in history. The deal 
    faced regulatory scrutiny throughout 2022 and 2023. In July 2023, the UK 
    Competition and Markets Authority blocked the merger. Microsoft appealed 
    the decision. On October 13, 2023, the acquisition was finally approved 
    and completed. Following the merger, Microsoft held an integration summit 
    in November 2023. In February 2024, the company announced layoffs affecting 
    1,900 employees from the gaming division. Microsoft launched a new cloud 
    gaming service in March 2024 leveraging Activision titles.
  `.trim();

  const result = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:microsoft",
    primaryEntityName: "Microsoft",
    eventTypes: ["acquisition", "merger", "launch", "announcement"],
    significance: ["major", "historic"],
  });

  console.log("Success:", result.success);
  console.log(`\nTech Events (${result.events.length} found):`);

  result.events.forEach((event) => {
    console.log(`\n  ${event.name}`);
    console.log(`    Date: ${event.date || "unknown"}`);
    console.log(`    Type: ${event.eventType}`);
    console.log(`    Significance: ${event.significance}`);
    if (event.economic_impact) {
      console.log(
        `    Economic impact: $${(event.economic_impact / 1e9).toFixed(1)}B`
      );
    }
  });
}

async function confidenceThresholdComparison() {
  console.log("\n=== Confidence Threshold Comparison ===\n");

  const content = `
    Apple held its annual WWDC conference in June 2024. The company 
    announced new products and software updates. There were reports 
    of a possible event in September but it wasn't confirmed. Tim Cook 
    mentioned in passing that Apple might have a special announcement 
    later in the year. A major product launch event definitely occurred 
    on September 12, 2024, where Apple unveiled the iPhone 16.
  `.trim();

  // Low threshold
  const lowThreshold = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:apple",
    primaryEntityName: "Apple",
    confidenceThreshold: 0.5,
  });

  // High threshold
  const highThreshold = await discoverEventsTool.invoke({
    content,
    primaryEntityUid: "org:apple",
    primaryEntityName: "Apple",
    confidenceThreshold: 0.9,
  });

  console.log(`With 0.5 threshold: ${lowThreshold.events.length} events`);
  lowThreshold.events.forEach((e) => {
    console.log(`  - ${e.name} (confidence: ${e.confidence.toFixed(2)})`);
  });

  console.log(`\nWith 0.9 threshold: ${highThreshold.events.length} events`);
  highThreshold.events.forEach((e) => {
    console.log(`  - ${e.name} (confidence: ${e.confidence.toFixed(2)})`);
  });

  console.log("\nNote: Higher thresholds filter out uncertain event mentions");
}

// Run all examples
async function runAllExamples() {
  try {
    await basicEventDiscovery();
    await eventTypeFiltering();
    await dateRangeFiltering();
    await significanceFiltering();
    await combinedFiltering();
    await politicalEventsDiscovery();
    await techEventsDiscovery();
    await confidenceThresholdComparison();

    console.log("\n✅ All examples completed successfully\n");
  } catch (error) {
    console.error("\n❌ Error running examples:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

// Export for use in other files
export {
  basicEventDiscovery,
  eventTypeFiltering,
  dateRangeFiltering,
  significanceFiltering,
  combinedFiltering,
  politicalEventsDiscovery,
  techEventsDiscovery,
  confidenceThresholdComparison,
};
