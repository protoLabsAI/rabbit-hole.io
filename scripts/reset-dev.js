/**
 * Development Database Reset - Rabbit Hole Schema
 *
 * DESTRUCTIVE: Wipes all data for local development.
 * Use migrate-rabbit-hole-schema.js for production deployments.
 */

import neo4j from "neo4j-driver";

// const { applyMigrations } = require("./migrate-rabbit-hole-schema");

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", process.env.NEO4J_PASSWORD || ""),
  { disableLosslessIntegers: true }
);

async function resetDevDatabase() {
  const session = driver.session();

  try {
    console.log("🔥 DEVELOPMENT RESET - This will DELETE ALL DATA!\n");

    // Count current data
    const beforeStats = await session.run(`
      MATCH (n) 
      OPTIONAL MATCH ()-[r]->()
      RETURN count(n) as nodes, count(r) as relationships
    `);
    const nodesBefore = neo4j
      .int(beforeStats.records[0].get("nodes"))
      .toNumber();
    const relsBefore = neo4j
      .int(beforeStats.records[0].get("relationships"))
      .toNumber();
    console.log(
      `📊 Current data: ${nodesBefore} nodes, ${relsBefore} relationships`
    );

    // DESTRUCTIVE WIPE
    console.log("🗑️ Deleting ALL nodes and relationships...");
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("✅ Database wiped clean");

    // Verify empty
    const afterStats = await session.run(`
      MATCH (n) 
      OPTIONAL MATCH ()-[r]->()
      RETURN count(n) as nodes, count(r) as relationships
    `);
    const nodesAfter = neo4j.int(afterStats.records[0].get("nodes")).toNumber();
    const relsAfter = neo4j
      .int(afterStats.records[0].get("relationships"))
      .toNumber();
    console.log(
      `✅ Verified empty: ${nodesAfter} nodes, ${relsAfter} relationships`
    );

    console.log("\n🏗️ Applying million-scale migrations...");
    await session.close();
    await driver.close();

    // Reinitialize driver for schema creation
    const newDriver = neo4j.driver(
      "bolt://localhost:7687",
      neo4j.auth.basic("neo4j", process.env.NEO4J_PASSWORD || ""),
      { disableLosslessIntegers: true }
    );
    const newSession = newDriver.session();

    // Create core schema constraints
    console.log("📐 Creating schema constraints...");
    await newSession.run(
      "CREATE CONSTRAINT entity_uid_unique IF NOT EXISTS FOR (n:Entity) REQUIRE n.uid IS UNIQUE"
    );

    // Create core indexes
    console.log("📊 Creating indexes...");
    const indexes = [
      "CREATE INDEX entity_uid IF NOT EXISTS FOR (n:Entity) ON (n.uid)",
      "CREATE INDEX entity_name IF NOT EXISTS FOR (n:Entity) ON (n.name)",
      "CREATE INDEX entity_type IF NOT EXISTS FOR (n:Entity) ON (n.type)",
      "CREATE INDEX community_id IF NOT EXISTS FOR (n:Entity) ON (n.communityId)",
    ];

    for (const index of indexes) {
      await newSession.run(index);
    }
    console.log("✅ Schema constraints and indexes created");

    console.log("\n🌱 Creating template entities...");

    const templateEntities = [
      {
        uid: "platform:x_twitter",
        type: "Platform",
        name: "X (Twitter)",
        url: "https://x.com",
        founded: "2006",
      },
      {
        uid: "platform:truth_social",
        type: "Platform",
        name: "Truth Social",
        url: "https://truthsocial.com",
        founded: "2022",
      },
      {
        uid: "org:doj_opa",
        type: "Organization",
        name: "U.S. DOJ Office of Public Affairs",
        orgType: "GovAgency",
      },
      {
        uid: "org:the_guardian",
        type: "Organization",
        name: "The Guardian",
        orgType: "MediaOutlet",
      },
    ];

    for (const entity of templateEntities) {
      const { uid, type, ...props } = entity;
      const query = `
        CREATE (n:${type}:Entity {
          uid: $uid,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        SET n += $props
      `;

      await newSession.run(query, { uid, props });
      console.log(`✅ ${entity.name} (${uid})`);
    }

    // Final verification
    const finalStats = await newSession.run(`
      MATCH (n:Entity)
      OPTIONAL MATCH ()-[r]-()
      RETURN 
        count(DISTINCT n) as entities,
        count(r) as relationships,
        collect(DISTINCT labels(n)[0]) as types
    `);

    const finalRecord = finalStats.records[0];
    const entities = neo4j.int(finalRecord.get("entities")).toNumber();
    const relationships = neo4j
      .int(finalRecord.get("relationships"))
      .toNumber();
    const types = finalRecord.get("types");

    console.log("\n🎉 Development reset complete!");
    console.log(
      `📊 Fresh database: ${entities} entities, ${relationships} relationships`
    );
    console.log(`🏷️  Entity types: ${types.join(", ")}`);
    console.log("");
    console.log("🚀 Ready for development:");
    console.log("   • All constraints and indexes applied");
    console.log("   • Entity superlabel configured");
    console.log("   • Template entities created");
    console.log("   • Million-scale features enabled");

    await newSession.close();
    await newDriver.close();
  } catch (error) {
    console.error("❌ Development reset failed:", error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDevDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal reset error:", error);
      process.exit(1);
    });
}

export { resetDevDatabase };
