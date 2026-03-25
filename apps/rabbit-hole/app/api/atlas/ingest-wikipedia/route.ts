/**
 * Wikipedia Bulk Ingestion Pipeline
 *
 * POST /api/atlas/ingest-wikipedia
 *   Accepts: { seedTopics?: string[], maxArticles?: number, depth?: number }
 *   Returns: { jobId: string } immediately (202 Accepted)
 *
 * GET /api/atlas/ingest-wikipedia?jobId=...
 *   Returns current job status and progress metrics.
 */

import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@proto/database";
import { getAIModel } from "@proto/llm-providers/server";
import { generateSecureId } from "@proto/utils";

// ── Job state store ───────────────────────────────────────────────────────────

export interface WikipediaJobState {
  jobId: string;
  status: "running" | "completed" | "failed";
  seedTopics: string[];
  maxArticles: number;
  depth: number;
  totalArticles: number;
  processedArticles: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  errors: string[];
  startedAt: number;
  completedAt: number | null;
}

const globalJobStore = globalThis as unknown as {
  __wikipediaJobs?: Map<string, WikipediaJobState>;
};
if (!globalJobStore.__wikipediaJobs) {
  globalJobStore.__wikipediaJobs = new Map();
}
const jobStore = globalJobStore.__wikipediaJobs;

// ── Wikipedia API helpers ─────────────────────────────────────────────────────

interface WikiSearchItem {
  title: string;
}

interface WikiArticle {
  title: string;
  text: string;
  url: string;
}

/** 1-second rate-limit delay between Wikipedia API requests. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchWikipediaTopic(
  topic: string,
  limit = 10
): Promise<WikiSearchItem[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&utf8=1&srlimit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { search?: WikiSearchItem[] };
  };
  return data?.query?.search ?? [];
}

async function fetchWikipediaArticle(
  title: string
): Promise<WikiArticle | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> };
  };
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page?.extract) return null;
  return {
    title: page.title ?? title,
    text: page.extract.slice(0, 6000),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

// ── Entity extraction ─────────────────────────────────────────────────────────

const ExtractionSchema = z.object({
  entities: z.array(
    z.object({
      uid: z
        .string()
        .describe(
          "Format: {type}:{snake_case_name}, e.g. concept:artificial_intelligence"
        ),
      name: z.string(),
      type: z.string().describe("e.g. concept, person, organization, place"),
      description: z.string().optional(),
      aliases: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
    })
  ),
  relationships: z.array(
    z.object({
      uid: z
        .string()
        .describe("Format: rel:{source_uid}__{rel_type}__{target_uid}"),
      sourceUid: z.string(),
      targetUid: z.string(),
      type: z
        .string()
        .describe(
          "SCREAMING_SNAKE_CASE relationship type, e.g. RELATED_TO, PART_OF, CREATED_BY"
        ),
    })
  ),
});

type Extraction = z.infer<typeof ExtractionSchema>;

async function extractEntitiesFromArticle(
  article: WikiArticle
): Promise<Extraction> {
  const model = getAIModel("fast");
  const { object } = await generateObject({
    model,
    schema: ExtractionSchema,
    prompt: `Extract key entities and relationships from this Wikipedia article.

Title: ${article.title}
URL: ${article.url}

Article text:
${article.text}

Rules:
- uid format: {type}:{snake_case_name} (e.g. person:alan_turing, concept:machine_learning)
- Relationship uid format: rel:{sourceUid}__{TYPE}__{targetUid}
- Extract 5-15 notable entities (people, organizations, concepts, places, events)
- Extract meaningful relationships between those entities
- Keep descriptions concise (1-2 sentences)`,
  });
  return object;
}

// ── Neo4j bulk write ──────────────────────────────────────────────────────────

interface EntityRow {
  uid: string;
  name: string;
  type: string;
  description: string;
  aliases: string[];
  tags: string[];
  sources: string[];
}

interface RelationshipRow {
  uid: string;
  sourceUid: string;
  targetUid: string;
  type: string;
  sources: string[];
}

async function batchWriteEntities(entities: EntityRow[]): Promise<number> {
  if (entities.length === 0) return 0;
  const client = getGlobalNeo4jClient();

  await client.executeWrite(
    `
    UNWIND $entities AS entity
    MERGE (e:Entity {uid: entity.uid})
    ON CREATE SET
      e += entity,
      e.createdAt = timestamp()
    ON MATCH SET
      e.updatedAt = timestamp(),
      e.sources = CASE
        WHEN e.sources IS NULL THEN entity.sources
        ELSE [s IN entity.sources WHERE NOT s IN e.sources] + e.sources
      END
    `,
    { entities }
  );

  return entities.length;
}

async function batchWriteRelationships(
  relationships: RelationshipRow[]
): Promise<number> {
  if (relationships.length === 0) return 0;
  const client = getGlobalNeo4jClient();
  let created = 0;

  // Write relationships one type at a time; Cypher requires literal rel types.
  const byType = new Map<string, RelationshipRow[]>();
  for (const rel of relationships) {
    const bucket = byType.get(rel.type) ?? [];
    bucket.push(rel);
    byType.set(rel.type, bucket);
  }

  for (const [relType, rels] of byType) {
    // Only safe SCREAMING_SNAKE_CASE types (guard against injection)
    if (!/^[A-Z][A-Z0-9_]*$/.test(relType)) continue;

    await client.executeWrite(
      `
      UNWIND $rels AS rel
      MATCH (source:Entity {uid: rel.sourceUid})
      MATCH (target:Entity {uid: rel.targetUid})
      MERGE (source)-[r:${relType} {uid: rel.uid}]->(target)
      ON CREATE SET r.createdAt = timestamp(), r.sources = rel.sources
      ON MATCH SET  r.updatedAt = timestamp()
      `,
      { rels }
    );
    created += rels.length;
  }

  return created;
}

// ── Background ingestion worker ───────────────────────────────────────────────

const DEFAULT_SEED_TOPICS = [
  "Computer science",
  "Artificial intelligence",
  "World Wide Web",
  "Physics",
  "Mathematics",
  "Biology",
];

async function runIngestionJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  try {
    const { seedTopics, maxArticles, depth } = job;

    // Collect article titles to process (deduplicated)
    const titlesToProcess = new Set<string>();

    for (const topic of seedTopics) {
      if (titlesToProcess.size >= maxArticles) break;
      await delay(1000);
      const results = await searchWikipediaTopic(topic, 10);
      for (const item of results) {
        titlesToProcess.add(item.title);
        if (titlesToProcess.size >= maxArticles) break;
      }

      // depth=2: also search the first result's title as a sub-topic
      if (
        depth >= 2 &&
        results.length > 0 &&
        titlesToProcess.size < maxArticles
      ) {
        await delay(1000);
        const subResults = await searchWikipediaTopic(results[0].title, 5);
        for (const item of subResults) {
          titlesToProcess.add(item.title);
          if (titlesToProcess.size >= maxArticles) break;
        }
      }
    }

    job.totalArticles = titlesToProcess.size;

    for (const title of titlesToProcess) {
      try {
        await delay(1000);
        const article = await fetchWikipediaArticle(title);
        if (!article) {
          job.errors.push(`Failed to fetch article: ${title}`);
          job.processedArticles++;
          continue;
        }

        const extraction = await extractEntitiesFromArticle(article);
        const sourceTag = `wikipedia:${article.title}`;

        const entityRows: EntityRow[] = extraction.entities.map((e) => ({
          uid: e.uid,
          name: e.name,
          type: e.type,
          description: e.description ?? "",
          aliases: e.aliases,
          tags: e.tags,
          sources: [sourceTag],
        }));

        const relRows: RelationshipRow[] = extraction.relationships.map(
          (r) => ({
            uid: r.uid,
            sourceUid: r.sourceUid,
            targetUid: r.targetUid,
            type: r.type,
            sources: [sourceTag],
          })
        );

        const entitiesWritten = await batchWriteEntities(entityRows);
        const relsWritten = await batchWriteRelationships(relRows);

        job.entitiesCreated += entitiesWritten;
        job.relationshipsCreated += relsWritten;
        job.processedArticles++;

        console.log(
          `[wikipedia-ingest] ${jobId} — processed "${title}" → ${entitiesWritten} entities, ${relsWritten} rels`
        );
      } catch (articleErr) {
        const msg =
          articleErr instanceof Error ? articleErr.message : String(articleErr);
        job.errors.push(`Error processing "${title}": ${msg}`);
        job.processedArticles++;
        console.error(
          `[wikipedia-ingest] ${jobId} — error on "${title}":`,
          msg
        );
      }
    }

    job.status = "completed";
    job.completedAt = Date.now();
    console.log(
      `[wikipedia-ingest] ${jobId} — completed. ${job.entitiesCreated} entities, ${job.relationshipsCreated} rels, ${job.errors.length} errors`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.completedAt = Date.now();
    job.errors.push(`Job failed: ${msg}`);
    console.error(`[wikipedia-ingest] ${jobId} — job failed:`, msg);
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    seedTopics?: string[];
    maxArticles?: number;
    depth?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    // empty body is fine — use defaults
  }

  const seedTopics =
    Array.isArray(body.seedTopics) && body.seedTopics.length > 0
      ? body.seedTopics
      : DEFAULT_SEED_TOPICS;

  const maxArticles =
    typeof body.maxArticles === "number" && body.maxArticles > 0
      ? Math.min(body.maxArticles, 500) // hard cap
      : 50;

  const depth =
    typeof body.depth === "number" && body.depth >= 1 ? body.depth : 1;

  const jobId = generateSecureId();

  const job: WikipediaJobState = {
    jobId,
    status: "running",
    seedTopics,
    maxArticles,
    depth,
    totalArticles: 0,
    processedArticles: 0,
    entitiesCreated: 0,
    relationshipsCreated: 0,
    errors: [],
    startedAt: Date.now(),
    completedAt: null,
  };

  jobStore.set(jobId, job);

  // Run the ingestion in the background — do not await
  runIngestionJob(jobId).catch((err) => {
    console.error(`[wikipedia-ingest] Unhandled error in job ${jobId}:`, err);
    const j = jobStore.get(jobId);
    if (j && j.status === "running") {
      j.status = "failed";
      j.completedAt = Date.now();
      j.errors.push(err instanceof Error ? err.message : String(err));
    }
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing required query parameter: jobId" },
      { status: 400 }
    );
  }

  const job = jobStore.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const {
    status,
    seedTopics,
    maxArticles,
    depth,
    totalArticles,
    processedArticles,
    entitiesCreated,
    relationshipsCreated,
    errors,
    startedAt,
    completedAt,
  } = job;

  return NextResponse.json({
    jobId,
    status,
    seedTopics,
    maxArticles,
    depth,
    totalArticles,
    processedArticles,
    entitiesCreated,
    relationshipsCreated,
    errorCount: errors.length,
    errors: errors.slice(-20), // last 20 errors
    startedAt,
    completedAt,
    elapsedMs: completedAt ? completedAt - startedAt : Date.now() - startedAt,
  });
}
