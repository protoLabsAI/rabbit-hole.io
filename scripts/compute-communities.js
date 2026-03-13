/**
 * Community Detection - Rabbit Hole Schema
 *
 * Uses Neo4j Graph Data Science (GDS) to compute communities
 * and store communityId on nodes for million-scale rendering.
 *
 * Requires: Neo4j GDS plugin installed
 */

import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "evidencegraph2024"),
  { disableLosslessIntegers: true }
);

async function computeCommunities() {
  const session = driver.session();

  try {
    console.log("🤖 Computing communities for million-scale graph...\n");

    // Check if there are entities to process
    const entityCheck = await session.run(`
      MATCH (n:Entity)
      RETURN count(n) as entityCount
    `);
    const entityCount = neo4j
      .int(entityCheck.records[0].get("entityCount"))
      .toNumber();

    if (entityCount === 0) {
      console.log(
        "⚪ No entities found in database. Skipping community detection."
      );
      console.log("💡 Hint: Add entities first via API or seeding scripts");
      return;
    }

    console.log(`📊 Found ${entityCount} entities`);

    // Check if GDS is available
    console.log("🔍 Checking GDS plugin availability...");
    try {
      await session.run("RETURN gds.version() as version");
      console.log("✅ Neo4j Graph Data Science plugin detected");
    } catch (error) {
      console.error("❌ GDS plugin not found. Install with:");
      console.error("   • Neo4j Desktop: Add GDS plugin from Graph Apps");
      console.error(
        "   • Docker: Use neo4j:enterprise or neo4j/neo4j-arm64-experimental"
      );
      console.error(
        "   • Manual: Download from https://neo4j.com/graph-data-science/"
      );
      return;
    }

    // Check if there are relationships to process
    const relCheck = await session.run(`
      MATCH ()-[r]->()
      RETURN count(r) as relCount
    `);
    const relCount = neo4j.int(relCheck.records[0].get("relCount")).toNumber();

    if (relCount === 0) {
      console.log(
        "⚪ No relationships found in database. Skipping community detection."
      );
      console.log(
        "💡 Hint: Communities require relationships between entities"
      );
      console.log("   Add relationships via API, then run this script again");
      return;
    }

    console.log(`📊 Found ${relCount} relationships`);

    // Drop existing projection if it exists
    console.log("\n🗑️ Cleaning up previous projections...");
    try {
      await session.run(
        "CALL gds.graph.drop('rabbit-hole-kg') YIELD graphName"
      );
      console.log("✅ Dropped existing projection");
    } catch (error) {
      console.log("⚪ No existing projection to drop");
    }

    // Create graph projection with all relationship types
    console.log("\n🎯 Creating graph projection...");
    const projectionQuery = `
      CALL gds.graph.project(
        'rabbit-hole-kg',
        'Entity',
        '*'
      ) YIELD
        graphName,
        nodeCount,
        relationshipCount
    `;

    const projectionResult = await session.run(projectionQuery);
    const projectionRecord = projectionResult.records[0];
    const nodeCount = neo4j.int(projectionRecord.get("nodeCount")).toNumber();
    const relationshipCount = neo4j
      .int(projectionRecord.get("relationshipCount"))
      .toNumber();

    console.log(`✅ Graph projection created:`);
    console.log(`   📊 Nodes: ${nodeCount}`);
    console.log(`   🔗 Relationships: ${relationshipCount}`);

    // Run Louvain community detection
    console.log("\n🔍 Running Louvain community detection...");
    const louvainQuery = `
      CALL gds.louvain.write(
        'rabbit-hole-kg',
        {
          writeProperty: 'communityId',
          includeIntermediateCommunities: false,
          maxLevels: 10,
          maxIterations: 50,
          tolerance: 0.0001,
          relationshipWeightProperty: 'confidence'
        }
      ) YIELD
        communityCount,
        modularity,
        ranLevels
    `;

    const louvainResult = await session.run(louvainQuery);
    const louvainRecord = louvainResult.records[0];
    const communityCount = neo4j
      .int(louvainRecord.get("communityCount"))
      .toNumber();
    const modularity = louvainRecord.get("modularity");
    const ranLevels = neo4j.int(louvainRecord.get("ranLevels")).toNumber();

    console.log(`✅ Community detection completed:`);
    console.log(`   🎯 Communities: ${communityCount}`);
    console.log(`   📊 Modularity: ${modularity.toFixed(4)}`);
    console.log(`   🔄 Levels: ${ranLevels}`);

    // Compute community statistics
    console.log("\n📊 Computing community statistics...");
    const statsQuery = `
      MATCH (n) 
      WHERE n.communityId IS NOT NULL
      WITH n.communityId as communityId, count(n) as size, collect(labels(n)[0]) as types
      RETURN 
        communityId,
        size,
        types,
        size(apoc.coll.toSet(types)) as typeCount
      ORDER BY size DESC
      LIMIT 10
    `;

    try {
      const statsResult = await session.run(statsQuery);
      console.log("🏆 Top 10 communities by size:");
      statsResult.records.forEach((record, i) => {
        const communityId = record.get("communityId");
        const size = record.get("size");
        const types = record.get("types");
        const typeCount = record.get("typeCount");
        const uniqueTypes = [...new Set(types)].slice(0, 3).join(", ");
        console.log(
          `   ${i + 1}. Community ${communityId}: ${size} nodes (${typeCount} types: ${uniqueTypes})`
        );
      });
    } catch (error) {
      // Fallback without APOC
      const simpleStatsResult = await session.run(`
        MATCH (n) 
        WHERE n.communityId IS NOT NULL
        RETURN n.communityId as communityId, count(n) as size
        ORDER BY size DESC
        LIMIT 5
      `);
      console.log("🏆 Top communities by size:");
      simpleStatsResult.records.forEach((record, i) => {
        const communityId = record.get("communityId");
        const size = record.get("size");
        console.log(`   ${i + 1}. Community ${communityId}: ${size} nodes`);
      });
    }

    // Add precomputed aggregates for UI performance
    console.log("\n⚡ Computing node aggregates for UI performance...");

    // Speech act counts per node (using individual properties, not maps)
    const speechActsQuery = `
      MATCH (n)-[r:SPEECH_ACT]->()
      WITH n.uid as uid, 
           sum(CASE WHEN r.sentiment = 'hostile' THEN 1 ELSE 0 END) as hostile,
           sum(CASE WHEN r.sentiment = 'supportive' THEN 1 ELSE 0 END) as supportive,
           sum(CASE WHEN r.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
           max(r.at) as lastActiveAt
      MATCH (entity {uid: uid})
      SET 
        entity.speechActs_hostile = hostile,
        entity.speechActs_supportive = supportive,
        entity.speechActs_neutral = neutral,
        entity.speechActs_total = hostile + supportive + neutral,
        entity.lastActiveAt = lastActiveAt
      RETURN count(entity) as updated
    `;

    const speechActsResult = await session.run(speechActsQuery);
    const speechActsUpdated = neo4j
      .int(speechActsResult.records[0].get("updated"))
      .toNumber();
    console.log(
      `✅ Updated speech act aggregates for ${speechActsUpdated} nodes`
    );

    // Degree centrality (connection counts using individual properties)
    const degreeQuery = `
      MATCH (n)
      WHERE n:Person OR n:Organization OR n:Platform OR n:Movement
      OPTIONAL MATCH (n)-[out]->()
      OPTIONAL MATCH ()-[in]->(n)
      WITH n, count(DISTINCT out) as outDegree, count(DISTINCT in) as inDegree
      SET 
        n.degree_in = inDegree,
        n.degree_out = outDegree,
        n.degree_total = inDegree + outDegree
      RETURN count(n) as updated
    `;

    const degreeResult = await session.run(degreeQuery);
    const degreeUpdated = neo4j
      .int(degreeResult.records[0].get("updated"))
      .toNumber();
    console.log(`✅ Updated degree centrality for ${degreeUpdated} nodes`);

    // Clean up graph projection
    console.log("\n🗑️ Cleaning up graph projection...");
    await session.run("CALL gds.graph.drop('rabbit-hole-kg') YIELD graphName");
    console.log("✅ Graph projection cleaned up");

    console.log("\n🎉 Community detection completed successfully!");
    console.log("");
    console.log("🚀 Ready for million-scale features:");
    console.log("   • Communities stored as communityId on nodes");
    console.log("   • Speech act aggregates cached for UI");
    console.log("   • Degree centrality precomputed");
    console.log("   • Graph tiles API can now use bounded queries");
    console.log("");
    console.log(
      "💡 Next: Run graph tiles APIs for ego/community/timeslice views"
    );
  } catch (error) {
    console.error("❌ Community detection failed:", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  computeCommunities()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal community detection error:", error);
      process.exit(1);
    });
}

export { computeCommunities };
