/**
 * Cypher Query Builders
 *
 * Parameterized query builders for common graph operations.
 * Prevents SQL injection and standardizes query patterns.
 */

import neo4j from "neo4j-driver";

export interface EntityQueryParams {
  uid?: string;
  id?: string;
  name?: string;
  entityType?: string;
  limit?: number;
  orgId?: string;
}

export interface RelationshipQueryParams {
  sourceUid?: string;
  targetUid?: string;
  relationshipType?: string;
  sentiment?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface GraphQueryParams {
  centerUid?: string;
  hops?: number;
  entityTypes?: string[];
  sentiments?: string[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

/**
 * Build entity details query with comprehensive relationship data
 */
export function buildEntityDetailsQuery(params: EntityQueryParams) {
  const { uid, id, limit = 100, orgId } = params;

  // Handle both uid and id schemas
  const identifier = uid || id;
  let matchClause: string;

  // If orgId is provided, filter by public + tenant data
  // If no orgId, show only public data (for non-authenticated/non-tenant contexts)
  const tenantFilter = orgId
    ? "(entity.clerk_org_id = 'public' OR entity.clerk_org_id = $orgId)"
    : "entity.clerk_org_id = 'public'";
  const neighborFilter = orgId
    ? "AND (target.clerk_org_id = 'public' OR target.clerk_org_id = $orgId)"
    : "AND target.clerk_org_id = 'public'";
  const sourceFilter = orgId
    ? "AND (source.clerk_org_id = 'public' OR source.clerk_org_id = $orgId)"
    : "AND source.clerk_org_id = 'public'";

  if (uid) {
    // New schema with uid
    matchClause = "MATCH (entity {uid: $identifier})";
  } else {
    // Legacy schema with id and GraphNode label
    matchClause = "MATCH (entity:GraphNode {id: $identifier})";
  }

  const query = `
    ${matchClause}
    WHERE ${tenantFilter}
    
    // Get outgoing relationships
    OPTIONAL MATCH (entity)-[outgoing]->(target)
    WHERE ${neighborFilter ? neighborFilter.replace(/^AND\s*/, "") : "true"}
    
    // Get incoming relationships  
    OPTIONAL MATCH (source)-[incoming]->(entity)
    WHERE ${sourceFilter ? sourceFilter.replace(/^AND\s*/, "") : "true"}
    
    WITH entity,
         collect(DISTINCT {
           relationship: outgoing,
           target: target,
           direction: 'outgoing'
         }) as outgoingRels,
         collect(DISTINCT {
           relationship: incoming, 
           target: source,
           direction: 'incoming'
         }) as incomingRels
    
    RETURN {
      uid: coalesce(entity.uid, entity.id),
      name: entity.name,
      type: labels(entity)[0],
      properties: properties(entity),
      outgoingRelationships: outgoingRels,
      incomingRelationships: incomingRels,
      totalRelationships: size(outgoingRels) + size(incomingRels)
    } as entityData
    
    LIMIT $limit
  `;

  const queryParams: Record<string, any> = {
    identifier,
    limit: neo4j.int(limit),
  };

  if (orgId) {
    queryParams.orgId = orgId;
  }

  return {
    query: query.trim(),
    params: queryParams,
  };
}

/**
 * Build atlas/graph overview query
 */
export function buildAtlasOverviewQuery(params: GraphQueryParams = {}) {
  const { entityTypes, sentiments, fromDate, limit = 1000 } = params;

  const whereConditions: string[] = [];

  if (entityTypes?.length) {
    const typeConditions = entityTypes.map((type) => `n:${type}`).join(" OR ");
    whereConditions.push(`(${typeConditions})`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const relationshipFilters: string[] = [];

  if (sentiments?.length) {
    relationshipFilters.push("r.sentiment IN $sentiments");
  }

  if (fromDate) {
    relationshipFilters.push("coalesce(r.at, r.createdAt) >= $fromDate");
  }

  const relationshipWhere =
    relationshipFilters.length > 0
      ? `AND ${relationshipFilters.join(" AND ")}`
      : "";

  const query = `
    // Get nodes
    MATCH (n) 
    ${whereClause}
    WITH n ORDER BY n.name LIMIT $limit
    
    // Get relationships between these nodes
    WITH collect(n) as nodes
    UNWIND nodes as n1
    UNWIND nodes as n2
    
    OPTIONAL MATCH (n1)-[r]->(n2)
    WHERE n1 <> n2 ${relationshipWhere}
    
    RETURN 
      [node IN nodes | {
        uid: node.uid,
        name: node.name,
        type: labels(node)[0],
        speechActs_hostile: node.speechActs_hostile,
        speechActs_supportive: node.speechActs_supportive, 
        speechActs_neutral: node.speechActs_neutral,
        speechActs_total: node.speechActs_total,
        degree_in: node.degree_in,
        degree_out: node.degree_out,
        degree_total: node.degree_total,
        communityId: node.communityId,
        lastActiveAt: node.lastActiveAt,
        position: node.position
      }] as nodeData,
      
      collect(DISTINCT {
        uid: r.uid,
        type: type(r),
        sourceUid: startNode(r).uid,
        targetUid: endNode(r).uid,
        sentiment: r.sentiment,
        category: r.category,
        intensity: r.intensity,
        confidence: r.confidence,
        at: r.at,
        excerpt: coalesce(r.text_excerpt, r.excerpt, ''),
        narrative: r.narrative
      }) as edgeData
  `;

  const queryParams: Record<string, any> = { limit: neo4j.int(limit) };

  if (sentiments?.length) queryParams.sentiments = sentiments;
  if (fromDate) queryParams.fromDate = fromDate;

  return {
    query: query.trim(),
    params: queryParams,
  };
}

/**
 * Build entity search query
 */
export function buildEntitySearchQuery(params: {
  searchTerm: string;
  entityTypes?: string[];
  limit?: number;
}) {
  const { searchTerm, entityTypes, limit = 50 } = params;

  const whereConditions = [
    "(n.name CONTAINS $searchTerm OR any(alias IN n.aliases WHERE alias CONTAINS $searchTerm))",
  ];

  if (entityTypes?.length) {
    const typeConditions = entityTypes.map((type) => `n:${type}`).join(" OR ");
    whereConditions.push(`(${typeConditions})`);
  }

  const query = `
    MATCH (n)
    WHERE ${whereConditions.join(" AND ")}
    RETURN n {
      .uid,
      .name,
      type: labels(n)[0],
      .aliases,
      .tags,
      .bio,
      .description,
      speechActs_total: coalesce(n.speechActs_total, 0),
      degree_total: coalesce(n.degree_total, 0)
    } as entity
    ORDER BY 
      CASE WHEN n.name = $searchTerm THEN 0 ELSE 1 END,
      coalesce(n.speechActs_total, 0) DESC,
      coalesce(n.degree_total, 0) DESC,
      n.name
    LIMIT $limit
  `;

  return {
    query: query.trim(),
    params: {
      searchTerm,
      limit: neo4j.int(limit),
    },
  };
}

/**
 * Build bundle ingest queries for batch operations
 */
export function buildIngestQueries(bundle: {
  evidence?: any[];
  entities?: any[];
  relationships?: any[];
  content?: any[];
  files?: any[];
}): Array<{ query: string; parameters: Record<string, any> }> {
  const queries: Array<{ query: string; parameters: Record<string, any> }> = [];

  // Evidence creation
  if (bundle.evidence?.length) {
    queries.push({
      query: `
        UNWIND $evidence as ev
        MERGE (e:Evidence {uid: ev.uid})
        SET e.kind = ev.kind,
            e.title = ev.title,
            e.publisher = ev.publisher,
            e.date = ev.date,
            e.url = ev.url,
            e.reliability = ev.reliability,
            e.notes = ev.notes,
            e.archive = ev.archive,
            e.retrieved_at = ev.retrieved_at,
            e.updatedAt = datetime()
      `,
      parameters: { evidence: bundle.evidence },
    });
  }

  // Entity creation
  if (bundle.entities?.length) {
    queries.push({
      query: `
        UNWIND $entities as ent
        CALL apoc.create.node([ent.type], apoc.map.merge(ent, {updatedAt: datetime()})) YIELD node
        SET node.uid = ent.uid
        RETURN count(node) as entitiesCreated
      `,
      parameters: { entities: bundle.entities },
    });
  }

  // Relationship creation
  if (bundle.relationships?.length) {
    queries.push({
      query: `
        UNWIND $relationships as rel
        MATCH (source {uid: rel.source})
        MATCH (target {uid: rel.target})
        CALL apoc.create.relationship(source, rel.type, 
          apoc.map.merge(rel.properties || {}, {
            uid: rel.uid,
            confidence: rel.confidence,
            at: rel.at,
            createdAt: datetime()
          }), target) YIELD rel as relationship
        RETURN count(relationship) as relationshipsCreated
      `,
      parameters: { relationships: bundle.relationships },
    });
  }

  return queries;
}

/**
 * Execute health check query
 */
export function buildHealthCheckQuery() {
  return {
    query: `
      CALL {
        MATCH (n) RETURN count(n) as nodeCount
      }
      CALL {
        MATCH ()-[r]->() RETURN count(r) as relCount  
      }
      CALL {
        MATCH (e:Evidence) RETURN count(e) as evidenceCount
      }
      RETURN nodeCount, relCount, evidenceCount
    `,
    params: {},
  };
}
