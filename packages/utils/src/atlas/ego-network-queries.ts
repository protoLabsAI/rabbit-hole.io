/**
 * Ego Network Query Builder
 *
 * Dynamic Cypher query generation for ego networks with variable hop support.
 * Supports 1-10 hops with optimized performance and proper relationship handling.
 */

const buildPublicTenantFilter = (
  varName: string = "n",
  includePublic: boolean = true
): string => {
  if (includePublic) {
    return `(${varName}.clerk_org_id = 'public' OR ${varName}.clerk_org_id = $orgId)`;
  }
  return `${varName}.clerk_org_id = $orgId`;
};

export interface EgoNetworkParams {
  centerUid: string;
  hops: number;
  limit1: number;
  limit2?: number;
  sentiments?: string[];
  fromDate?: string;
  entityTypes?: string[];
  orgId?: string;
}

export interface EgoNetworkQuery {
  query: string;
  params: Record<string, any>;
}

/**
 * Build dynamic ego network Cypher query for any number of hops (1-10)
 */
export function buildEgoNetworkQuery(
  params: EgoNetworkParams
): EgoNetworkQuery {
  const {
    centerUid,
    hops,
    limit1,
    limit2 = Math.floor(limit1 / 2),
    sentiments,
    fromDate,
    entityTypes,
  } = params;

  // Validate hops range
  if (hops < 1 || hops > 10) {
    throw new Error("Hops must be between 1 and 10");
  }

  // Build WHERE clause filters
  const whereFilters: string[] = [];

  if (sentiments && sentiments.length > 0) {
    whereFilters.push(`r.sentiment IN $sentiments`);
  }

  if (fromDate) {
    // Exclude family relationships from date filtering (they often lack dates)
    whereFilters.push(`(
      type(r) IN ['MARRIED_TO', 'DIVORCED_FROM', 'PARENT_OF', 'CHILD_OF', 'SIBLING_OF', 'RELATED_TO'] 
      OR coalesce(r.at, r.createdAt) >= $fromDate
    )`);
  }

  if (entityTypes && entityTypes.length > 0) {
    const typeConditions = entityTypes
      .map((type) => `neighbor:${type}`)
      .join(" OR ");
    whereFilters.push(`(${typeConditions})`);
  }

  const whereClause =
    whereFilters.length > 0 ? `WHERE ${whereFilters.join(" AND ")}` : "";

  // Build dynamic query based on hops
  let query: string;

  if (hops === 1) {
    // Optimized 1-hop query - use undirected pattern to include all relationships
    const tenantFilters = params.orgId
      ? [buildPublicTenantFilter("center"), buildPublicTenantFilter("neighbor")]
      : [];
    const allFilters = [...tenantFilters, ...whereFilters];
    const combinedWhere =
      allFilters.length > 0 ? `WHERE ${allFilters.join(" AND ")}` : "";

    query = `
      MATCH (center {uid: $centerUid})
      MATCH (center)-[r]-(neighbor)
      ${combinedWhere}
      WITH center, neighbor, r
      ORDER BY coalesce(r.at, r.createdAt) DESC
      LIMIT $limit1
      
      RETURN 
        collect(DISTINCT {
          uid: neighbor.uid,
          name: neighbor.name,
          type: labels(neighbor)[0],
          speechActs_hostile: neighbor.speechActs_hostile,
          speechActs_supportive: neighbor.speechActs_supportive,
          speechActs_neutral: neighbor.speechActs_neutral,
          speechActs_total: neighbor.speechActs_total,
          degree_in: neighbor.degree_in,
          degree_out: neighbor.degree_out,
          degree_total: neighbor.degree_total,
          communityId: neighbor.communityId,
          lastActiveAt: neighbor.lastActiveAt,
          position: neighbor.position
        }) as nodeData,
        collect(DISTINCT {
          uid: r.uid,
          type: type(r),
          sourceUid: CASE WHEN startNode(r) = center THEN center.uid ELSE neighbor.uid END,
          targetUid: CASE WHEN startNode(r) = center THEN neighbor.uid ELSE center.uid END,
          sentiment: r.sentiment,
          category: r.category,
          intensity: r.intensity,
          confidence: r.confidence,
          at: r.at,
          excerpt: coalesce(r.text_excerpt, r.excerpt, ''),
          narrative: r.narrative
        }) as edgeData
    `;
  } else {
    // Dynamic multi-hop query using variable length patterns
    const tenantFilters = params.orgId
      ? [buildPublicTenantFilter("center"), buildPublicTenantFilter("neighbor")]
      : [];
    const allFilters = [
      ...tenantFilters,
      ...whereFilters,
      "neighbor.uid <> center.uid",
    ];
    const combinedWhere =
      allFilters.length > 0 ? `WHERE ${allFilters.join(" AND ")}` : "";

    query = `
      MATCH (center {uid: $centerUid})
      
      // Get all nodes within specified hops using undirected variable length pattern
      MATCH path = (center)-[*1..${hops}]-(neighbor)
      ${combinedWhere}
      
      WITH center, neighbor, path, length(path) as hopDistance,
           relationships(path) as pathRels
      ORDER BY hopDistance, coalesce(pathRels[-1].at, pathRels[-1].createdAt) DESC
      LIMIT $hopLimit
      
      // Get all relationships that connect our discovered nodes
      WITH center, collect(DISTINCT neighbor) as neighbors
      UNWIND neighbors as neighbor
      
      // Find all relationships that connect our discovered nodes to center (undirected)
      OPTIONAL MATCH (center)-[rel]-(neighbor)
      
      WITH center, neighbors, collect(DISTINCT rel) as directRels
      
      RETURN 
        [n IN neighbors | {
          uid: n.uid,
          name: n.name,
          type: labels(n)[0],
          speechActs_hostile: n.speechActs_hostile,
          speechActs_supportive: n.speechActs_supportive,
          speechActs_neutral: n.speechActs_neutral,
          speechActs_total: n.speechActs_total,
          degree_in: n.degree_in,
          degree_out: n.degree_out,
          degree_total: n.degree_total,
          communityId: n.communityId,
          lastActiveAt: n.lastActiveAt,
          position: n.position
        }] as nodeData,
        [r IN directRels WHERE r IS NOT NULL | {
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
        }] as edgeData
    `;
  }

  // Build query parameters - ensure all numeric values are integers
  const hopLimit = Math.floor(hops === 2 ? limit1 + limit2 : limit1 * hops);
  const queryParams: Record<string, any> = {
    centerUid,
    limit1: Math.floor(Number(limit1)),
    hopLimit,
  };

  if (sentiments && sentiments.length > 0) {
    queryParams.sentiments = sentiments;
  }

  if (fromDate) {
    queryParams.fromDate = fromDate;
  }

  if (params.orgId) {
    queryParams.orgId = params.orgId;
  }

  return {
    query: query.trim(),
    params: queryParams,
  };
}

/**
 * Build simplified ego network query without APOC dependencies
 * Fallback version that works with basic Neo4j installation
 */
export function buildSimpleEgoNetworkQuery(
  params: EgoNetworkParams
): EgoNetworkQuery {
  const {
    centerUid,
    hops,
    limit1,
    limit2 = Math.floor(limit1 / 2),
    orgId,
  } = params;

  if (hops === 1) {
    return buildEgoNetworkQuery(params); // Use optimized 1-hop version
  }

  // For multi-hop, use a simpler approach that doesn't require APOC
  const hopLimit = Math.floor(limit1 + (hops > 1 ? limit2 : 0));
  const tenantFilter = orgId ? buildPublicTenantFilter("neighbor") : "";

  const query = `
    MATCH (center {uid: $centerUid})
    ${orgId ? `WHERE ${buildPublicTenantFilter("center")}` : ""}
    
    // Use UNION to combine different hop levels
    CALL {
      WITH center
      MATCH (center)-[r1]-(hop1)
      ${tenantFilter ? `WHERE ${tenantFilter.replace("neighbor", "hop1")}` : ""}
      RETURN hop1 as neighbor, r1 as rel, 1 as hopLevel
      
      ${
        hops >= 2
          ? `
      UNION
      WITH center
      MATCH (center)-[]-(hop1)-[r2]-(hop2)
      WHERE hop2.uid <> center.uid
        ${tenantFilter ? `AND ${tenantFilter.replace("neighbor", "hop2")}` : ""}
      RETURN hop2 as neighbor, r2 as rel, 2 as hopLevel
      `
          : ""
      }
      
      ${
        hops >= 3
          ? `
      UNION
      WITH center
      MATCH (center)-[]-(hop1)-[]-(hop2)-[r3]-(hop3)
      WHERE hop3.uid <> center.uid AND hop3.uid <> hop1.uid
        ${tenantFilter ? `AND ${tenantFilter.replace("neighbor", "hop3")}` : ""}
      RETURN hop3 as neighbor, r3 as rel, 3 as hopLevel
      `
          : ""
      }
    }
    
    WITH center, neighbor, rel, hopLevel
    ORDER BY hopLevel, coalesce(rel.at, rel.createdAt) DESC
    LIMIT $hopLimit
    
    RETURN 
      collect(DISTINCT {
        uid: neighbor.uid,
        name: neighbor.name,
        type: labels(neighbor)[0],
        speechActs_hostile: neighbor.speechActs_hostile,
        speechActs_supportive: neighbor.speechActs_supportive,
        speechActs_neutral: neighbor.speechActs_neutral,
        speechActs_total: neighbor.speechActs_total,
        degree_in: neighbor.degree_in,
        degree_out: neighbor.degree_out,
        degree_total: neighbor.degree_total,
        communityId: neighbor.communityId,
        lastActiveAt: neighbor.lastActiveAt,
        position: neighbor.position
      }) as nodeData,
      collect(DISTINCT {
        uid: rel.uid,
        type: type(rel),
        sourceUid: startNode(rel).uid,
        targetUid: endNode(rel).uid,
        sentiment: rel.sentiment,
        category: rel.category,
        intensity: rel.intensity,
        confidence: rel.confidence,
        at: rel.at,
        excerpt: coalesce(rel.text_excerpt, rel.excerpt, ''),
        narrative: rel.narrative
      }) as edgeData
  `;

  const queryParams: Record<string, any> = {
    centerUid,
    hopLimit: Math.floor(Number(hopLimit)),
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
 * Get performance-optimized limits based on hop count
 */
export function getOptimizedEgoLimits(
  hops: number,
  baseLimit: number
): { limit1: number; limit2: number } {
  // Ensure baseLimit is an integer to prevent floating point issues
  const intBaseLimit = Math.floor(Number(baseLimit));

  switch (hops) {
    case 1:
      return { limit1: intBaseLimit, limit2: 0 };
    case 2:
      return {
        limit1: intBaseLimit,
        limit2: Math.max(1, Math.floor(intBaseLimit / 2)),
      };
    case 3:
      return {
        limit1: Math.max(1, Math.floor(intBaseLimit * 0.7)),
        limit2: Math.max(1, Math.floor(intBaseLimit * 0.3)),
      };
    case 4:
    case 5:
      return {
        limit1: Math.max(1, Math.floor(intBaseLimit * 0.5)),
        limit2: Math.max(1, Math.floor(intBaseLimit * 0.25)),
      };
    default:
      // For 6+ hops, use smaller limits to prevent performance issues
      return {
        limit1: Math.max(1, Math.floor(intBaseLimit * 0.3)),
        limit2: Math.max(1, Math.floor(intBaseLimit * 0.15)),
      };
  }
}

/**
 * Validate ego network parameters
 */
export function validateEgoNetworkParams(params: EgoNetworkParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.centerUid || params.centerUid.trim() === "") {
    errors.push("centerUid is required");
  }

  if (params.hops < 1 || params.hops > 10) {
    errors.push("hops must be between 1 and 10");
  }

  if (params.limit1 < 1 || params.limit1 > 500) {
    errors.push("limit1 must be between 1 and 500");
  }

  if (
    params.limit2 !== undefined &&
    (params.limit2 < 0 || params.limit2 > 250)
  ) {
    errors.push("limit2 must be between 0 and 250");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
