/**
 * Entity Timeline Utilities
 *
 * Clean, testable utilities for fetching and processing entity timeline data.
 * Supports both point events and duration events for the EventTimelineChart component.
 */

// Local Neo4j client interface to avoid importing neo4j-driver via @proto/database
interface Neo4jClient {
  executeRead(
    query: string,
    parameters?: Record<string, any>
  ): Promise<{
    records: Array<{
      get(key: string): any;
    }>;
  }>;
}

// Timeline event interface matching EventTimelineChart requirements
export interface TimelineEvent {
  id: string;
  timestamp: string; // ISO date string (start date)
  endDate?: string; // ISO date string (end date for duration events)
  eventType: "intrinsic" | "relationship" | "milestone" | "ongoing";
  category: string;
  title: string;
  description?: string;
  duration?: string; // Human readable duration description
  relationshipType?: string;
  targetEntity?: {
    uid: string;
    name: string;
    type: string;
  };
  evidence?: Array<{
    uid: string;
    title: string;
    publisher: string;
    url: string;
    reliability: number;
  }>;
  confidence: number;
  importance: "critical" | "major" | "minor";
}

export interface EntityInfo {
  uid: string;
  name: string;
  type: string;
  dates: {
    birthDate?: string;
    deathDate?: string;
    founded?: string;
    dissolved?: string;
    launched?: string;
    shutdown?: string;
    date?: string; // For Event entities
    endDate?: string; // For Event entities
    independence?: string; // For Country entities
  };
}

export interface TimelineFilters {
  dateRange?: {
    from: string;
    to: string;
  };
  categories?: string[];
  importance?: ("critical" | "major" | "minor")[];
  entityTypes?: string[];
  relationshipTypes?: string[];
  limit?: number;
}

export interface TimelineResult {
  entity: EntityInfo;
  events: TimelineEvent[];
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByImportance: Record<string, number>;
    dateRange?: {
      earliest: string;
      latest: string;
    };
  };
}

/**
 * Fetch entity information from Neo4j
 */
export async function fetchEntityInfo(
  client: Neo4jClient,
  entityUid: string
): Promise<EntityInfo | null> {
  const query = `
    MATCH (e {uid: $entityUid})
    RETURN 
      e.uid as uid,
      e.name as name,
      labels(e)[0] as type,
      e.birthDate as birthDate,
      e.deathDate as deathDate,
      e.founded as founded,
      e.dissolved as dissolved,
      e.launched as launched,
      e.shutdown as shutdown,
      e.date as date,
      e.endDate as endDate,
      e.independence as independence
  `;

  const result = await client.executeRead(query, { entityUid });

  if (result.records.length === 0) {
    return null;
  }

  const record = result.records[0];
  return {
    uid: record.get("uid"),
    name: record.get("name"),
    type: record.get("type"),
    dates: {
      birthDate: record.get("birthDate"),
      deathDate: record.get("deathDate"),
      founded: record.get("founded"),
      dissolved: record.get("dissolved"),
      launched: record.get("launched"),
      shutdown: record.get("shutdown"),
      date: record.get("date"),
      endDate: record.get("endDate"),
      independence: record.get("independence"),
    },
  };
}

/**
 * Generate intrinsic timeline events from entity dates
 */
export function generateIntrinsicEvents(entity: EntityInfo): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { dates } = entity;

  // Birth event
  if (dates.birthDate) {
    events.push({
      id: `intrinsic-birth-${entity.uid}`,
      timestamp: dates.birthDate,
      eventType: "intrinsic",
      category: "birth",
      title: `Birth of ${entity.name}`,
      description: `${entity.name} was born`,
      confidence: 1.0,
      importance: "critical",
    });
  }

  // Death event
  if (dates.deathDate) {
    events.push({
      id: `intrinsic-death-${entity.uid}`,
      timestamp: dates.deathDate,
      eventType: "intrinsic",
      category: "death",
      title: `Death of ${entity.name}`,
      description: `${entity.name} died`,
      confidence: 1.0,
      importance: "critical",
    });
  }

  // Founding event
  if (dates.founded) {
    events.push({
      id: `intrinsic-founding-${entity.uid}`,
      timestamp: dates.founded,
      eventType: "intrinsic",
      category: "founding",
      title: `Founding of ${entity.name}`,
      description: `${entity.name} was founded`,
      confidence: 1.0,
      importance: "major",
    });
  }

  // Dissolution event
  if (dates.dissolved) {
    events.push({
      id: `intrinsic-dissolution-${entity.uid}`,
      timestamp: dates.dissolved,
      eventType: "intrinsic",
      category: "dissolution",
      title: `Dissolution of ${entity.name}`,
      description: `${entity.name} was dissolved`,
      confidence: 1.0,
      importance: "major",
    });
  }

  // Launch event
  if (dates.launched) {
    events.push({
      id: `intrinsic-launch-${entity.uid}`,
      timestamp: dates.launched,
      eventType: "intrinsic",
      category: "launch",
      title: `Launch of ${entity.name}`,
      description: `${entity.name} was launched`,
      confidence: 1.0,
      importance: "major",
    });
  }

  // Shutdown event
  if (dates.shutdown) {
    events.push({
      id: `intrinsic-shutdown-${entity.uid}`,
      timestamp: dates.shutdown,
      eventType: "intrinsic",
      category: "shutdown",
      title: `Shutdown of ${entity.name}`,
      description: `${entity.name} was shut down`,
      confidence: 1.0,
      importance: "major",
    });
  }

  // Independence event
  if (dates.independence) {
    events.push({
      id: `intrinsic-independence-${entity.uid}`,
      timestamp: dates.independence,
      eventType: "intrinsic",
      category: "independence",
      title: `Independence of ${entity.name}`,
      description: `${entity.name} gained independence`,
      confidence: 1.0,
      importance: "critical",
    });
  }

  // Duration events (life spans, operational periods)
  if (dates.birthDate && dates.deathDate) {
    events.push({
      id: `intrinsic-lifespan-${entity.uid}`,
      timestamp: dates.birthDate,
      endDate: dates.deathDate,
      eventType: "ongoing",
      category: "lifespan",
      title: `Lifespan of ${entity.name}`,
      description: `Period of ${entity.name}'s life`,
      confidence: 1.0,
      importance: "major",
    });
  }

  if (dates.founded && dates.dissolved) {
    events.push({
      id: `intrinsic-operational-${entity.uid}`,
      timestamp: dates.founded,
      endDate: dates.dissolved,
      eventType: "ongoing",
      category: "operational_period",
      title: `Operational period of ${entity.name}`,
      description: `Period when ${entity.name} was active`,
      confidence: 1.0,
      importance: "major",
    });
  }

  if (dates.launched && dates.shutdown) {
    events.push({
      id: `intrinsic-service-${entity.uid}`,
      timestamp: dates.launched,
      endDate: dates.shutdown,
      eventType: "ongoing",
      category: "service_period",
      title: `Service period of ${entity.name}`,
      description: `Period when ${entity.name} was in service`,
      confidence: 1.0,
      importance: "major",
    });
  }

  // Event duration (for Event entities with start and end dates)
  if (dates.date && dates.endDate) {
    events.push({
      id: `intrinsic-event-duration-${entity.uid}`,
      timestamp: dates.date,
      endDate: dates.endDate,
      eventType: "ongoing",
      category: "event_duration",
      title: `${entity.name} event period`,
      description: `Duration of the ${entity.name} event`,
      confidence: 1.0,
      importance: "major",
    });
  }

  return events;
}

/**
 * Fetch content timeline events (speeches, posts, articles) from Neo4j
 * Content nodes have their own published_at dates and should appear in timelines
 */
export async function fetchContentEvents(
  client: Neo4jClient,
  entityUid: string,
  filters: TimelineFilters = {}
): Promise<TimelineEvent[]> {
  const limit = Math.floor(Math.min(filters.limit || 100, 200));

  // Build where clauses
  const whereConditions: string[] = [];

  if (filters.dateRange) {
    whereConditions.push(
      "(c.published_at >= datetime($fromDate + 'T00:00:00Z'))"
    );
    whereConditions.push(
      "(c.published_at <= datetime($toDate + 'T23:59:59Z'))"
    );
  }

  const whereClause =
    whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

  // Query content nodes connected to entity (via SPEECH_ACT or other relationships)
  const query = `
    MATCH (source {uid: $entityUid})-[r]->(c:Content)
    WHERE c.published_at IS NOT NULL
    ${whereClause}
    
    OPTIONAL MATCH (evidence:Evidence)
    WHERE evidence.uid IN coalesce(r.evidence_uids, [])
    
    WITH c, r, collect(DISTINCT {
      uid: evidence.uid,
      title: evidence.title,
      publisher: evidence.publisher,
      url: evidence.url,
      reliability: evidence.reliability
    }) as evidenceList
    
    RETURN 
      c.uid as contentUid,
      c.content_type as contentType,
      c.published_at as timestamp,
      c.text_excerpt as textExcerpt,
      c.url as url,
      c.platform_uid as platformUid,
      c.author_uid as authorUid,
      type(r) as relationshipType,
      coalesce(r.category, c.content_type) as category,
      coalesce(r.confidence, 0.85) as confidence,
      coalesce(r.importance, 'major') as importance,
      evidenceList
    ORDER BY c.published_at DESC
    LIMIT $limit
  `;

  const params: Record<string, any> = {
    entityUid,
    limit,
  };

  if (filters.dateRange) {
    params.fromDate = filters.dateRange.from;
    params.toDate = filters.dateRange.to;
  }

  const result = await client.executeRead(query, params);

  const mappedEvents = result.records.map((record) => {
    const contentType = record.get("contentType") || "content";
    const textExcerpt = record.get("textExcerpt") || "";
    const category = record.get("category") || contentType;

    // Generate title from text excerpt (first 60 chars)
    const title =
      textExcerpt.length > 60
        ? textExcerpt.substring(0, 60) + "..."
        : textExcerpt || `${contentType} published`;

    return {
      id: record.get("contentUid"),
      timestamp: record.get("timestamp"),
      eventType: "milestone" as const,
      category,
      title,
      description: textExcerpt,
      relationshipType: record.get("relationshipType"),
      targetEntity: {
        uid: record.get("contentUid"),
        name: title,
        type: "Content",
      },
      evidence: record.get("evidenceList") || [],
      confidence: record.get("confidence"),
      importance: record.get("importance"),
    };
  });

  return mappedEvents;
}

/**
 * Fetch evidence timeline events from Neo4j
 * Evidence has date field and can be connected via relationships
 */
export async function fetchEvidenceEvents(
  client: Neo4jClient,
  entityUid: string,
  filters: TimelineFilters = {}
): Promise<TimelineEvent[]> {
  const limit = Math.floor(Math.min(filters.limit || 100, 200));

  const whereConditions: string[] = [];

  if (filters.dateRange) {
    whereConditions.push("(e.date >= $fromDate)");
    whereConditions.push("(e.date <= $toDate)");
  }

  const whereClause =
    whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

  const query = `
    MATCH (source {uid: $entityUid})-[r]->(e:Evidence)
    WHERE e.date IS NOT NULL
    ${whereClause}
    
    RETURN 
      e.uid as evidenceUid,
      e.kind as evidenceKind,
      e.title as title,
      e.publisher as publisher,
      e.date as timestamp,
      e.url as url,
      e.reliability as reliability,
      type(r) as relationshipType,
      coalesce(r.confidence, e.reliability, 0.80) as confidence,
      coalesce(r.importance, 'minor') as importance
    ORDER BY e.date DESC
    LIMIT $limit
  `;

  const params: Record<string, any> = {
    entityUid,
    limit,
  };

  if (filters.dateRange) {
    params.fromDate = filters.dateRange.from;
    params.toDate = filters.dateRange.to;
  }

  const result = await client.executeRead(query, params);

  const mappedEvents = result.records.map((record) => {
    const title = record.get("title") || "Evidence document";
    const publisher = record.get("publisher") || "Unknown";

    return {
      id: record.get("evidenceUid"),
      timestamp: record.get("timestamp") + "T00:00:00Z", // Convert YYYY-MM-DD to ISO
      eventType: "milestone" as const,
      category: record.get("evidenceKind") || "evidence",
      title: `${title} (${publisher})`,
      description: `Evidence: ${title}`,
      relationshipType: record.get("relationshipType"),
      targetEntity: {
        uid: record.get("evidenceUid"),
        name: title,
        type: "Evidence",
      },
      evidence: [
        {
          uid: record.get("evidenceUid"),
          title: record.get("title"),
          publisher: record.get("publisher"),
          url: record.get("url"),
          reliability: record.get("reliability") || 0.8,
        },
      ],
      confidence: record.get("confidence"),
      importance: record.get("importance"),
    };
  });

  return mappedEvents;
}

/**
 * Fetch file timeline events from Neo4j
 * Files have uploadedAt or createdAt timestamps
 */
export async function fetchFileEvents(
  client: Neo4jClient,
  entityUid: string,
  filters: TimelineFilters = {}
): Promise<TimelineEvent[]> {
  const limit = Math.floor(Math.min(filters.limit || 100, 200));

  const whereConditions: string[] = [];

  if (filters.dateRange) {
    whereConditions.push(
      "(f.uploadedAt >= datetime($fromDate + 'T00:00:00Z') OR f.createdAt >= datetime($fromDate + 'T00:00:00Z'))"
    );
    whereConditions.push(
      "(f.uploadedAt <= datetime($toDate + 'T23:59:59Z') OR f.createdAt <= datetime($toDate + 'T23:59:59Z'))"
    );
  }

  const whereClause =
    whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

  const query = `
    MATCH (source {uid: $entityUid})-[r]->(f:File)
    WHERE (f.uploadedAt IS NOT NULL OR f.createdAt IS NOT NULL)
    ${whereClause}
    
    RETURN 
      f.uid as fileUid,
      f.filename as filename,
      f.mime as mimeType,
      f.bytes as bytes,
      coalesce(f.uploadedAt, f.createdAt) as timestamp,
      type(r) as relationshipType,
      coalesce(r.confidence, 0.85) as confidence,
      coalesce(r.importance, 'minor') as importance
    ORDER BY coalesce(f.uploadedAt, f.createdAt) DESC
    LIMIT $limit
  `;

  const params: Record<string, any> = {
    entityUid,
    limit,
  };

  if (filters.dateRange) {
    params.fromDate = filters.dateRange.from;
    params.toDate = filters.dateRange.to;
  }

  const result = await client.executeRead(query, params);

  const mappedEvents = result.records.map((record) => {
    const filename = record.get("filename") || "Uploaded file";
    const mimeType = record.get("mimeType") || "application/octet-stream";

    return {
      id: record.get("fileUid"),
      timestamp: record.get("timestamp"),
      eventType: "milestone" as const,
      category: "file_upload",
      title: `File: ${filename}`,
      description: `Uploaded ${mimeType} file`,
      relationshipType: record.get("relationshipType"),
      targetEntity: {
        uid: record.get("fileUid"),
        name: filename,
        type: "File",
      },
      evidence: [],
      confidence: record.get("confidence"),
      importance: record.get("importance"),
    };
  });

  return mappedEvents;
}

/**
 * Fetch relationship timeline events from Neo4j
 */
export async function fetchRelationshipEvents(
  client: Neo4jClient,
  entityUid: string,
  filters: TimelineFilters = {}
): Promise<TimelineEvent[]> {
  const limit = Math.floor(Math.min(filters.limit || 100, 200));

  // Build dynamic where clauses
  // Note: Content nodes are handled by fetchContentEvents(), so exclude them here to avoid duplicates
  const whereConditions = ["NOT target:Content"];

  if (filters.dateRange) {
    // Handle both string and datetime formats for r.at field
    whereConditions.push(
      "(r.at >= datetime($fromDate + 'T00:00:00Z') OR r.at >= $fromDate)"
    );
    whereConditions.push(
      "(r.at <= datetime($toDate + 'T23:59:59Z') OR r.at <= $toDate + 'T23:59:59Z')"
    );
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    const typeConditions = filters.entityTypes
      .map((type) => `target:${type.charAt(0).toUpperCase() + type.slice(1)}`)
      .join(" OR ");
    whereConditions.push(`(${typeConditions})`);
  }

  if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
    whereConditions.push(`type(r) IN $relationshipTypes`);
  }

  const whereClause =
    whereConditions.length > 0 ? whereConditions.join(" AND ") : "";

  const query = `
    MATCH (source {uid: $entityUid})-[r]->(target)
    ${whereClause ? `WHERE ${whereClause}` : ""}
    
    WITH source, r, target
    OPTIONAL MATCH (evidence:Evidence)
    WHERE evidence.uid IN coalesce(r.evidence_uids, [])
    
    WITH source, r, target, collect(DISTINCT {
      uid: evidence.uid,
      title: evidence.title,
      publisher: evidence.publisher,
      url: evidence.url,
      reliability: evidence.reliability
    }) as evidenceList
    
    RETURN 
      r.uid as relationshipId,
      type(r) as relationshipType,
      coalesce(r.at, r.createdAt) as timestamp,
      r.endDate as endDate,
      r.category as category,
      coalesce(r.excerpt, r.text_excerpt, r.description) as description,
      target.uid as targetUid,
      target.name as targetName,
      labels(target)[0] as targetType,
      coalesce(r.confidence, 0.8) as confidence,
      coalesce(r.importance, 'minor') as importance,
      evidenceList
    ORDER BY coalesce(r.at, r.createdAt) DESC
    LIMIT $limit
  `;

  const params: Record<string, any> = {
    entityUid,
    limit: limit, // Let the API route handle neo4j.int() conversion
  };

  if (filters.dateRange) {
    params.fromDate = filters.dateRange.from;
    params.toDate = filters.dateRange.to;
  }

  if (filters.relationshipTypes) {
    params.relationshipTypes = filters.relationshipTypes;
  }

  const result = await client.executeRead(query, params);

  const mappedEvents = result.records.map((record) => {
    const relationshipType = record.get("relationshipType");
    const category = record.get("category") || "relationship";
    const targetName = record.get("targetName");
    const description = record.get("description");
    const endDate = record.get("endDate");

    // Handle timestamp - use default for undated relationships
    let timestamp = record.get("timestamp");
    if (!timestamp) {
      // For relationships without timestamps, use a reasonable default
      // This ensures important relationships like family/business connections are included
      timestamp = "2000-01-01T00:00:00Z";
    }

    // Determine event type based on presence of end date
    let eventType: TimelineEvent["eventType"] = "relationship";
    if (endDate) {
      eventType = "ongoing";
    }

    // Generate human-readable title
    const title =
      description ||
      `${relationshipType} ${targetName}` ||
      `Relationship with ${targetName}`;

    return {
      id: record.get("relationshipId"),
      timestamp: timestamp,
      endDate: endDate || undefined,
      eventType,
      category,
      title,
      description,
      relationshipType,
      targetEntity: {
        uid: record.get("targetUid"),
        name: record.get("targetName"),
        type: record.get("targetType"),
      },
      evidence: record.get("evidenceList") || [],
      confidence: record.get("confidence"),
      importance: record.get("importance"),
    };
  });

  return mappedEvents;
}

/**
 * Apply filters to timeline events
 */
export function filterTimelineEvents(
  events: TimelineEvent[],
  filters: TimelineFilters
): TimelineEvent[] {
  let filtered = [...events];

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter((event) =>
      filters.categories!.includes(event.category)
    );
  }

  // Filter by importance
  if (filters.importance && filters.importance.length > 0) {
    filtered = filtered.filter((event) =>
      filters.importance!.includes(event.importance)
    );
  }

  // Filter by date range
  if (filters.dateRange) {
    const fromDate = new Date(filters.dateRange.from);
    const toDate = new Date(filters.dateRange.to);

    filtered = filtered.filter((event) => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= fromDate && eventDate <= toDate;
    });
  }

  return filtered;
}

/**
 * Calculate timeline summary statistics
 */
export function calculateTimelineSummary(events: TimelineEvent[]) {
  const eventsByType = events.reduce(
    (acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const eventsByImportance = events.reduce(
    (acc, event) => {
      acc[event.importance] = (acc[event.importance] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  let dateRange: { earliest: string; latest: string } | undefined;

  if (events.length > 0) {
    const dates = events
      .map((e) => e.timestamp)
      .filter(Boolean)
      .sort();

    if (dates.length > 0) {
      dateRange = {
        earliest: dates[0],
        latest: dates[dates.length - 1],
      };
    }
  }

  return {
    totalEvents: events.length,
    eventsByType,
    eventsByImportance,
    dateRange,
  };
}

/**
 * Main function to fetch complete entity timeline
 */
export async function fetchEntityTimeline(
  client: Neo4jClient,
  entityUid: string,
  filters: TimelineFilters = {}
): Promise<TimelineResult> {
  // Fetch entity information
  const entity = await fetchEntityInfo(client, entityUid);

  if (!entity) {
    throw new Error(`Entity ${entityUid} not found`);
  }

  // Generate intrinsic events from entity dates
  const intrinsicEvents = generateIntrinsicEvents(entity);
  console.log(
    `📅 Generated ${intrinsicEvents.length} intrinsic events for ${entityUid}`
  );

  // Fetch relationship events (excludes Content/Evidence/File targets)
  const relationshipEvents = await fetchRelationshipEvents(
    client,
    entityUid,
    filters
  );
  console.log(
    `🔗 Fetched ${relationshipEvents.length} relationship events for ${entityUid}`
  );

  // Fetch content events (speeches, posts, articles with published_at dates)
  const contentEvents = await fetchContentEvents(client, entityUid, filters);
  console.log(
    `📝 Fetched ${contentEvents.length} content events for ${entityUid}`
  );

  // Fetch evidence events (documents with date field)
  const evidenceEvents = await fetchEvidenceEvents(client, entityUid, filters);
  console.log(
    `📄 Fetched ${evidenceEvents.length} evidence events for ${entityUid}`
  );

  // Fetch file events (uploaded files with creation dates)
  const fileEvents = await fetchFileEvents(client, entityUid, filters);
  console.log(`📎 Fetched ${fileEvents.length} file events for ${entityUid}`);

  // Combine and sort all events
  const allEvents = [
    ...intrinsicEvents,
    ...relationshipEvents,
    ...contentEvents,
    ...evidenceEvents,
    ...fileEvents,
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  console.log(`📋 Combined ${allEvents.length} total events for ${entityUid}`);

  // Apply filters
  const filteredEvents = filterTimelineEvents(allEvents, filters);
  console.log(
    `🔍 After filtering: ${filteredEvents.length} events remain for ${entityUid}`
  );

  // Apply limit
  const limitedEvents = filters.limit
    ? filteredEvents.slice(0, Math.floor(filters.limit))
    : filteredEvents;
  console.log(
    `📏 After limit: ${limitedEvents.length} events final for ${entityUid}`
  );

  // Calculate summary
  const summary = calculateTimelineSummary(limitedEvents);

  return {
    entity,
    events: limitedEvents,
    summary,
  };
}

/**
 * Validate timeline filters
 */
export function validateTimelineFilters(filters: TimelineFilters): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date range
  if (filters.dateRange) {
    const { from, to } = filters.dateRange;
    const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (!ISO_DATE_REGEX.test(from)) {
      errors.push("From date must be in YYYY-MM-DD format");
    }

    if (!ISO_DATE_REGEX.test(to)) {
      errors.push("To date must be in YYYY-MM-DD format");
    }

    if (new Date(from) > new Date(to)) {
      errors.push("From date must be before to date");
    }
  }

  // Validate limit
  if (filters.limit !== undefined) {
    const limit = Math.floor(filters.limit);
    if (limit < 1 || limit > 1000) {
      errors.push("Limit must be between 1 and 1000");
    }
  }

  // Validate importance values
  if (filters.importance) {
    const validImportance = ["critical", "major", "minor"];
    const invalidImportance = filters.importance.filter(
      (imp) => !validImportance.includes(imp)
    );
    if (invalidImportance.length > 0) {
      errors.push(`Invalid importance values: ${invalidImportance.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create timeline URL for ego graph links
 */
export function createEgoGraphUrl(
  entityUid: string,
  timestamp: string,
  baseUrl: string = "http://localhost:3000"
): string {
  const date = timestamp.split("T")[0]; // Extract date part
  return `${baseUrl}/atlas?mode=ego&center=${entityUid}&date=${date}`;
}
