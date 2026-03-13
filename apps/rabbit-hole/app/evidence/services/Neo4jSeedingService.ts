/**
 * Neo4j Seeding Service
 *
 * Seeds Neo4j database from hate_rhetoric_seed.json with proper
 * sentiment data so red/green relationships show in atlas
 */

import neo4j, { Driver, Session } from "neo4j-driver";

interface HateRhetoricData {
  schema_version: string;
  generated_at_utc: string;
  entities: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  speech_acts: Array<{
    id: string;
    date_utc: string;
    speaker_id: string;
    platform_id: string;
    category: string;
    target_group: string[];
    text_excerpt: string;
    sources: Array<{
      title: string;
      publisher: string;
      date: string;
      url: string;
    }>;
    confidence: number;
    notes?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    type: string;
    sources: string[];
  }>;
}

interface SeedingResult {
  entities_created: number;
  relationships_created: number;
  evidence_created: number;
  sentiment_relationships: number;
  errors: string[];
  processing_time_ms: number;
}

export class Neo4jSeedingService {
  private driver: Driver;
  private database: string;

  constructor(config: {
    uri: string;
    username: string;
    password: string;
    database?: string;
  }) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
    this.database = config.database || "neo4j";
  }

  /**
   * Seed Neo4j database from hate rhetoric data with sentiment preservation
   */
  async seedFromHateRhetoricData(
    seedData: HateRhetoricData,
    wipeExisting = false
  ): Promise<SeedingResult> {
    const startTime = Date.now();
    const session = this.driver.session({ database: this.database });

    const result: SeedingResult = {
      entities_created: 0,
      relationships_created: 0,
      evidence_created: 0,
      sentiment_relationships: 0,
      errors: [],
      processing_time_ms: 0,
    };

    try {
      console.log("🌱 Starting Neo4j seeding from hate rhetoric data...");

      // 1. Optionally wipe existing data
      if (wipeExisting) {
        console.log("🧹 Clearing existing Neo4j data...");
        await session.run("MATCH (n) DETACH DELETE n");
      }

      // 2. Create constraints for performance
      await this.createConstraints(session);

      // 3. Seed entities
      console.log("👤 Creating entities...");
      for (const entity of seedData.entities) {
        try {
          const entityResult = await this.createEntity(session, entity);
          if (entityResult.created) {
            result.entities_created++;
          }
        } catch (error) {
          result.errors.push(`Entity ${entity.id}: ${error}`);
        }
      }

      // 4. Create evidence entries from speech acts
      console.log("📄 Creating evidence entries...");
      for (const speechAct of seedData.speech_acts) {
        try {
          await this.createEvidenceFromSpeechAct(session, speechAct);
          result.evidence_created += speechAct.sources.length;
        } catch (error) {
          result.errors.push(`Evidence for ${speechAct.id}: ${error}`);
        }
      }

      // 5. Create relationships with sentiment data
      console.log("🔗 Creating relationships with sentiment data...");
      for (const edge of seedData.edges) {
        try {
          // Match speech act by ID from edge sources - this ensures each edge gets the correct speech act
          const relatedSpeechAct = seedData.speech_acts.find((sa) =>
            edge.sources.includes(sa.id)
          );

          const relationshipResult = await this.createRelationshipWithSentiment(
            session,
            edge,
            relatedSpeechAct
          );
          if (relationshipResult.created) {
            result.relationships_created++;
          }

          if (relatedSpeechAct) {
            result.sentiment_relationships++;
          }
        } catch (error) {
          result.errors.push(
            `Relationship ${edge.source}->${edge.target}: ${error}`
          );
        }
      }

      result.processing_time_ms = Date.now() - startTime;

      console.log("✅ Neo4j seeding completed!");
      console.log(
        `📊 Created: ${result.entities_created} entities, ${result.relationships_created} relationships`
      );
      console.log(
        `🎯 Sentiment relationships: ${result.sentiment_relationships}/${result.relationships_created}`
      );

      return result;
    } finally {
      await session.close();
    }
  }

  private async createConstraints(session: Session): Promise<void> {
    const constraints = [
      "CREATE CONSTRAINT IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE",
      "CREATE INDEX IF NOT EXISTS FOR (n:GraphNode) ON (n.entityType)",
      "CREATE INDEX IF NOT EXISTS FOR ()-[r:RELATES_TO]-() ON (r.sentiment)",
    ];

    for (const constraint of constraints) {
      await session.run(constraint);
    }
  }

  private async createEntity(
    session: Session,
    entity: HateRhetoricData["entities"][0]
  ): Promise<{ created: boolean }> {
    const nodeId = this.convertEntityId(entity.id);

    const query = `
      MERGE (n:GraphNode {id: $id})
      ON CREATE SET n.created_at = datetime(), n.was_created = true
      ON MATCH SET n.was_created = false
      SET n.label = $label,
          n.entityType = $entityType,
          n.evidenceSources = $sources,
          n.sources = $sources,
          n.tags = $tags,
          n.created_from = 'hate_rhetoric_seed',
          n.updated_at = datetime()
      RETURN n.was_created as wasCreated
    `;

    // Use actual evidence sources if entity has them, otherwise placeholder
    const evidenceSources = (entity as any).sources || [`ev_import_${nodeId}`];

    const result = await session.run(query, {
      id: nodeId,
      label: entity.name,
      entityType: this.mapEntityType(entity.type),
      sources: evidenceSources,
      tags: ["hate_speech_seed", entity.type],
    });

    const wasCreated = result.records[0]?.get("wasCreated") || false;
    return { created: wasCreated };
  }

  private async createEvidenceFromSpeechAct(
    session: Session,
    speechAct: HateRhetoricData["speech_acts"][0]
  ): Promise<void> {
    for (const [index, source] of speechAct.sources.entries()) {
      const evidenceId = `ev_${speechAct.id}_${index}`;

      const query = `
        CREATE (e:Evidence {
          id: $id,
          title: $title,
          date: $date,
          publisher: $publisher,
          url: $url,
          type: 'primary',
          speech_category: $speech_category,
          speech_excerpt: $speech_excerpt
        })
      `;

      await session.run(query, {
        id: evidenceId,
        title: source.title,
        date: source.date,
        publisher: source.publisher,
        url: source.url,
        speech_category: speechAct.category,
        speech_excerpt: speechAct.text_excerpt.substring(0, 200),
      });
    }
  }

  private async createRelationshipWithSentiment(
    session: Session,
    edge: HateRhetoricData["edges"][0],
    speechAct?: HateRhetoricData["speech_acts"][0]
  ): Promise<{ created: boolean }> {
    const sourceId = this.convertEntityId(edge.source);
    const targetId = this.convertEntityId(edge.target);

    // Determine sentiment from speech act
    const sentiment = speechAct
      ? this.determineSentiment(speechAct.category)
      : "neutral";
    const intensity = speechAct
      ? this.determineIntensity(speechAct.text_excerpt)
      : "medium";

    const query = `
      MATCH (source:GraphNode {id: $sourceId})
      MATCH (target:GraphNode {id: $targetId})
      MERGE (source)-[r:RELATES_TO {id: $edgeId}]->(target)
      ON CREATE SET r.created_at = datetime(), r.was_created = true
      ON MATCH SET r.was_created = false
      SET r.label = $label,
          r.type = $type,
          r.sentiment = $sentiment,
          r.speech_category = $speechCategory,
          r.intensity = $intensity,
          r.confidence = $confidence,
          r.target_groups = $targetGroups,
          r.text_excerpt = $textExcerpt,
          r.date = $date,
          r.sources = $sources,
          r.updated_at = datetime()
      RETURN r.was_created as wasCreated
    `;

    const result = await session.run(query, {
      sourceId,
      targetId,
      edgeId: `e_${sourceId}_${targetId}_${edge.type}`,
      label: edge.label,
      type: edge.type,
      sentiment,
      speechCategory: speechAct?.category || null,
      intensity,
      confidence: speechAct?.confidence || 0.8,
      targetGroups: speechAct?.target_group || [],
      textExcerpt: speechAct?.text_excerpt || null,
      date: speechAct?.date_utc?.split("T")[0] || null,
      sources: edge.sources,
    });

    const wasCreated = result.records[0]?.get("wasCreated") || false;

    if (sentiment === "hostile") {
      console.log(
        `🔴 ${wasCreated ? "Created" : "Updated"} hostile relationship: ${edge.label} (${speechAct?.category})`
      );
    } else if (sentiment === "supportive") {
      console.log(
        `🟢 ${wasCreated ? "Created" : "Updated"} supportive relationship: ${edge.label}`
      );
    } else {
      console.log(
        `⚪ ${wasCreated ? "Created" : "Updated"} neutral relationship: ${edge.label}`
      );
    }

    return { created: wasCreated };
  }

  private convertEntityId(rawId: string): string {
    const [type, ...nameParts] = rawId.split(":");
    return `n_${nameParts.join("_")}`;
  }

  private mapEntityType(rawType: string): string {
    const typeMap: Record<string, string> = {
      person: "person",
      platform: "platform",
      event: "event",
      movement: "movement",
      media: "media",
    };
    return typeMap[rawType] || "person";
  }

  private determineSentiment(
    category: string
  ): "hostile" | "supportive" | "neutral" {
    const hostileCategories = [
      "accusation_demonization",
      "dehumanization_xenophobia",
      "great_replacement_rhetoric",
      "anti_muslim_bigotry",
      "derogation_national_origin",
      "xenophobic_trope",
      "violent_repression_support",
      "militia_signal",
      "explicit_violence_incitement",
      "depicted_violence_against_opponents",
      "militarized_xenophobia",
      "bothsidesing_extremism",
      "delegitimizing_press",
      "demonization_opponents",
      "menacing_rhetoric",
      "dehumanization_metaphor",
      "apocalyptic_threat_frame",
    ];

    const supportiveCategories = [
      "endorsement_signal",
      "amplification_support",
      "defense_justification",
      "praise_admiration",
      "alliance_building",
      "loyalty_expression",
      "movement_promotion",
      "platform_provision",
    ];

    if (hostileCategories.includes(category)) {
      return "hostile";
    } else if (supportiveCategories.includes(category)) {
      return "supportive";
    } else {
      return "neutral";
    }
  }

  private determineIntensity(
    textExcerpt: string
  ): "low" | "medium" | "high" | "extreme" {
    const text = textExcerpt.toLowerCase();

    if (
      text.includes("kill") ||
      text.includes("destroy") ||
      text.includes("bloodbath") ||
      text.includes("combat")
    ) {
      return "extreme";
    } else if (
      text.includes("infest") ||
      text.includes("invasion") ||
      text.includes("enemy") ||
      text.includes("traitors")
    ) {
      return "high";
    } else if (
      text.includes("bad") ||
      text.includes("wrong") ||
      text.includes("terrible")
    ) {
      return "medium";
    } else {
      return "low";
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
