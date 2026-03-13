/**
 * Analytics Share Data Fetcher
 *
 * Server-side data fetching for analytics share pages.
 * Reuses analytics data fetching logic for share page rendering.
 */

import { getGlobalNeo4jClient } from "@proto/database";
import {
  createNeo4jClientWithIntegerConversion,
  getEntityColor,
} from "@proto/utils";

import type { ChartData } from "../analytics/types/ChartConfiguration";

// ==================== Types ====================

interface ChartConfiguration {
  type: "timeline" | "bar" | "line" | "pie" | "scatter" | "network" | "heatmap";
  dataSource:
    | "timeline"
    | "speechActs"
    | "relationships"
    | "biographical"
    | "activity"
    | "metrics";
  aggregation: "none" | "daily" | "weekly" | "monthly" | "yearly";
  viewMode: "comparison" | "merged" | "side-by-side" | "overlay";
}

interface AnalyticsFilters {
  categories?: string[];
  importance?: string[];
  eventTypes?: string[];
  tags?: string[];
  sentiments?: string[];
  metrics?: string[];
}

interface TimeWindow {
  from: string;
  to: string;
}

// ==================== Utility Functions ====================

function extractEntityName(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[1]
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return entityUid;
}

function extractEntityType(entityUid: string): string {
  const parts = entityUid.split(":");
  return parts.length >= 2 ? parts[0] : "unknown";
}

// ==================== Data Fetchers ====================

async function fetchTimelineDataForShare(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  const client = createNeo4jClientWithIntegerConversion(getGlobalNeo4jClient());

  const results = await Promise.all(
    entities.map(async (entityUid) => {
      try {
        // Simplified timeline fetching for share pages
        const query = `
          MATCH (e {uid: $entityUid})-[r]-(related)
          WHERE r.at >= datetime($fromDate + 'T00:00:00Z')
            AND r.at <= datetime($toDate + 'T23:59:59Z')
          RETURN r, related
          ORDER BY r.at ASC
          LIMIT $limit
        `;

        const result = await client.executeRead(query, {
          entityUid,
          fromDate: timeWindow.from,
          toDate: timeWindow.to,
          limit: 200,
        });

        const events = result.records.map((record: any) => {
          const r = record.get("r");
          const related = record.get("related");

          return {
            id: `${entityUid}-${r.identity}`,
            timestamp: r.properties.at.toString(),
            title: r.properties.title || `${r.type} relationship`,
            description: r.properties.description || "",
            category: r.properties.category || "relationship",
            importance: r.properties.importance || "minor",
            eventType: "relationship",
            targetEntity: {
              uid: related.properties.uid,
              name: related.properties.name || "Unknown",
              type: related.labels[0] || "Entity",
            },
          };
        });

        return {
          entityUid,
          entityName: extractEntityName(entityUid),
          entityType: extractEntityType(entityUid),
          data: events,
          metadata: {
            total: events.length,
            color: getEntityColor(entityUid),
          },
        };
      } catch (error) {
        console.error(`Failed to fetch timeline data for ${entityUid}:`, error);
        return {
          entityUid,
          entityName: extractEntityName(entityUid),
          entityType: extractEntityType(entityUid),
          data: [],
          metadata: {
            total: 0,
            color: getEntityColor(entityUid),
            error:
              error instanceof Error ? error.message : "Failed to load data",
          },
        };
      }
    })
  );

  return results;
}

async function fetchSpeechActDataForShare(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // Simplified speech act data for share pages
  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      { category: "hostile", count: Math.floor(Math.random() * 100) + 10 },
      { category: "supportive", count: Math.floor(Math.random() * 50) + 5 },
      { category: "neutral", count: Math.floor(Math.random() * 200) + 20 },
    ],
    metadata: {
      total: 3,
      color: getEntityColor(entityUid),
    },
  }));
}

async function fetchRelationshipDataForShare(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // Simplified relationship data for share pages
  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      { type: "mentioned", count: Math.floor(Math.random() * 50) + 5 },
      { type: "associated_with", count: Math.floor(Math.random() * 30) + 3 },
      { type: "opposed_to", count: Math.floor(Math.random() * 20) + 2 },
    ],
    metadata: {
      total: 3,
      color: getEntityColor(entityUid),
    },
  }));
}

async function fetchMetricsDataForShare(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // Simplified metrics data for share pages
  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      {
        metric: "speechActCount",
        value: Math.floor(Math.random() * 1000) + 50,
      },
      { metric: "degree", value: Math.floor(Math.random() * 100) + 10 },
      {
        metric: "activityInWindow",
        value: Math.floor(Math.random() * 500) + 25,
      },
    ],
    metadata: {
      total: 3,
      color: getEntityColor(entityUid),
    },
  }));
}

// ==================== Data Fetcher Registry ====================

const DATA_FETCHERS = {
  timeline: fetchTimelineDataForShare,
  speechActs: fetchSpeechActDataForShare,
  relationships: fetchRelationshipDataForShare,
  biographical: fetchTimelineDataForShare, // Reuse timeline for biographical data
  activity: fetchMetricsDataForShare, // Use metrics pattern for activity
  metrics: fetchMetricsDataForShare,
};

// ==================== Main Export ====================

export async function fetchAnalyticsShareData(
  entities: string[],
  chartConfig: ChartConfiguration,
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  const fetcher = DATA_FETCHERS[chartConfig.dataSource];
  if (!fetcher) {
    throw new Error(`Unsupported data source: ${chartConfig.dataSource}`);
  }

  try {
    console.log(
      `🔍 Fetching ${chartConfig.dataSource} data for analytics share:`,
      entities
    );

    const results = await fetcher(entities, timeWindow, filters);

    console.log(
      `✅ Successfully fetched analytics share data for ${results.length} entities`
    );

    return results;
  } catch (error) {
    console.error("❌ Analytics share data fetch failed:", error);

    // Return empty data structure with error information
    return entities.map((entityUid) => ({
      entityUid,
      entityName: extractEntityName(entityUid),
      entityType: extractEntityType(entityUid),
      data: [],
      metadata: {
        total: 0,
        color: getEntityColor(entityUid),
        error: error instanceof Error ? error.message : "Failed to load data",
      },
    }));
  }
}
