/**
 * Relationship Query Builders - Rabbit Hole Schema
 *
 * Provides extensible Cypher query patterns for different relationship
 * categories and entity types. Supports family, business, political,
 * and platform relationship analysis.
 */

import type { EntityType } from "@proto/types";

const buildPublicTenantFilter = (
  varName: string = "n",
  includePublic: boolean = true
): string => {
  if (includePublic) {
    return `(${varName}.clerk_org_id = 'public' OR ${varName}.clerk_org_id = $orgId)`;
  }
  return `${varName}.clerk_org_id = $orgId`;
};

export interface RelationshipQueryParams {
  entityUid: string;
  categories: string[];
  relationshipTypes?: string[];
  includeAges: boolean;
  includeTimeline: boolean;
  limit: number;
  orgId?: string;
}

export interface QueryResult {
  query: string;
  params: Record<string, any>;
}

// Relationship type categorization constants
export const FAMILY_RELATIONSHIP_TYPES = [
  "MARRIED_TO",
  "DIVORCED_FROM",
  "PARENT_OF",
  "CHILD_OF",
  "SIBLING_OF",
  "RELATED_TO",
] as const;

export const BUSINESS_RELATIONSHIP_TYPES = [
  "OWNS",
  "FUNDS",
  "EMPLOYED_BY",
  "FOUNDED",
  "CONTROLS",
  "INVESTS_IN",
  "PARTNERS_WITH",
] as const;

export const POLITICAL_RELATIONSHIP_TYPES = [
  "HOLDS_ROLE",
  "ENDORSES",
  "ATTACKS",
  "PLATFORMS",
  "AFFILIATED_WITH",
  "OPPOSES",
  "SUPPORTS",
] as const;

export const PLATFORM_RELATIONSHIP_TYPES = [
  "PLATFORMS",
  "MODERATION_ACTION",
  "ADVERTISES_ON",
  "OWNS_ACCOUNT",
  "SUSPENDED_FROM",
] as const;

export const ACADEMIC_RELATIONSHIP_TYPES = [
  "TEACHES",
  "STUDIES",
  "RESEARCHES",
  "PUBLISHES",
  "REVIEWS",
  "SUPERVISES",
  "MENTORS",
  "COLLABORATES_WITH",
  "ATTENDS",
  "GRADUATES_FROM",
  "AWARDS",
  "ACCREDITS",
  "INDEXES",
  "PEER_REVIEWS",
] as const;

export const CULTURAL_RELATIONSHIP_TYPES = [
  "CREATES",
  "INFLUENCES",
  "INSPIRES",
  "ADAPTS",
  "TRANSLATES",
  "PERFORMS",
  "SPEAKS",
  "PRACTICES",
  "CELEBRATES",
  "PRESERVES",
  "DOCUMENTS",
  "EXHIBITS",
  "COLLECTS",
  "COMMISSIONS",
] as const;

export const MEDICAL_RELATIONSHIP_TYPES = [
  "TREATS",
  "CAUSES",
  "SYMPTOMS_OF",
  "PREVENTS",
  "DIAGNOSES",
  "PRESCRIBES",
  "ADMINISTERS",
  "INDICATES",
  "CONTRAINDICATED_FOR",
  "SIDE_EFFECT_OF",
  "INTERACTS_WITH",
  "MANAGES",
  "MONITORS",
  "OPERATES_ON",
  "HOSPITALIZED_AT",
  "TREATED_BY",
  "INSURED_BY",
  "ENROLLED_IN",
] as const;

/**
 * Build comprehensive family relationship query
 */
export function buildFamilyRelationshipQuery(
  params: RelationshipQueryParams
): QueryResult {
  const { entityUid, relationshipTypes, limit } = params;

  // Filter family relationship types if specific types requested
  const familyTypes = relationshipTypes
    ? relationshipTypes.filter((type) =>
        FAMILY_RELATIONSHIP_TYPES.includes(type as any)
      )
    : FAMILY_RELATIONSHIP_TYPES;

  const query = `
    MATCH (person {uid: $entityUid})
    
    // Get marriages and partnerships (including divorced)
    OPTIONAL MATCH (person)-[marriage:MARRIED_TO|DIVORCED_FROM]->(spouse:Person)
    WITH person, collect(DISTINCT {
      relationshipId: marriage.uid,
      relationshipType: type(marriage),
      partner: {
        uid: spouse.uid,
        name: spouse.name,
        birthDate: spouse.birthDate,
        deathDate: spouse.deathDate
      },
      marriageDate: marriage.at,
      divorceDate: CASE 
        WHEN type(marriage) = 'DIVORCED_FROM' THEN marriage.at
        ELSE null
      END,
      confidence: coalesce(marriage.confidence, 1),
      evidenceUids: coalesce(marriage.evidence_uids, [])
    }) as marriages
    
    // Get children
    OPTIONAL MATCH (person)-[parentRel:PARENT_OF]->(child:Person)
    WITH person, marriages, collect(DISTINCT {
      relationshipId: parentRel.uid,
      child: {
        uid: child.uid,
        name: child.name,
        birthDate: child.birthDate,
        deathDate: child.deathDate
      },
      confidence: coalesce(parentRel.confidence, 1),
      evidenceUids: coalesce(parentRel.evidence_uids, [])
    }) as children
    
    // Get parents
    OPTIONAL MATCH (parent:Person)-[parentRel:PARENT_OF]->(person)
    WITH person, marriages, children, collect(DISTINCT {
      relationshipId: parentRel.uid,
      parent: {
        uid: parent.uid,
        name: parent.name,
        birthDate: parent.birthDate,
        deathDate: parent.deathDate
      },
      confidence: coalesce(parentRel.confidence, 1),
      evidenceUids: coalesce(parentRel.evidence_uids, [])
    }) as parents
    
    // Get siblings
    OPTIONAL MATCH (person)-[siblingRel:SIBLING_OF]-(sibling:Person)
    WITH person, marriages, children, parents, collect(DISTINCT {
      relationshipId: siblingRel.uid,
      sibling: {
        uid: sibling.uid,
        name: sibling.name,
        birthDate: sibling.birthDate,
        deathDate: sibling.deathDate
      },
      confidence: coalesce(siblingRel.confidence, 1.0),
      evidenceUids: coalesce(siblingRel.evidence_uids, [])
    }) as siblings
    
    RETURN person, marriages, children, parents, siblings
    LIMIT $limit
  `;

  return {
    query: query.trim(),
    params: {
      entityUid,
      limit: Math.floor(limit),
      familyTypes: familyTypes,
    },
  };
}

/**
 * Build business relationship query
 */
export function buildBusinessRelationshipQuery(
  params: RelationshipQueryParams
): QueryResult {
  const { entityUid, relationshipTypes, limit } = params;

  const businessTypes = relationshipTypes
    ? relationshipTypes.filter((type) =>
        BUSINESS_RELATIONSHIP_TYPES.includes(type as any)
      )
    : BUSINESS_RELATIONSHIP_TYPES;

  const tenantFilter = params.orgId
    ? `WHERE ${buildPublicTenantFilter("entity")}`
    : "";
  const neighborFilter = params.orgId
    ? `AND ${buildPublicTenantFilter("businessEntity")}`
    : "";

  const query = `
    MATCH (entity {uid: $entityUid})
    ${tenantFilter}
    
    // Get ownership and control relationships
    OPTIONAL MATCH (entity)-[bizRel:OWNS|FUNDS|EMPLOYED_BY|FOUNDED|CONTROLS|INVESTS_IN|PARTNERS_WITH]-(businessEntity)
    WHERE NOT businessEntity:Person
    ${neighborFilter}
    
    WITH entity, collect(DISTINCT {
      relationshipId: bizRel.uid,
      relationshipType: type(bizRel),
      direction: CASE 
        WHEN startNode(bizRel) = entity THEN 'outgoing'
        ELSE 'incoming'
      END,
      businessEntity: {
        uid: businessEntity.uid,
        name: businessEntity.name,
        type: labels(businessEntity)[0],
        founded: businessEntity.founded,
        dissolved: businessEntity.dissolved
      },
      relationshipDate: bizRel.at,
      amount: bizRel.amount,
      percentage: bizRel.percentage,
      role: bizRel.role,
      confidence: coalesce(bizRel.confidence, 1.0),
      evidenceUids: coalesce(bizRel.evidence_uids, [])
    }) as businessRelationships
    
    RETURN entity, businessRelationships
    LIMIT $limit
  `;

  return {
    query: query.trim(),
    params: {
      entityUid,
      limit: Math.floor(limit),
      businessTypes: businessTypes,
    },
  };
}

/**
 * Build political relationship query
 */
export function buildPoliticalRelationshipQuery(
  params: RelationshipQueryParams
): QueryResult {
  const { entityUid, relationshipTypes, limit } = params;

  const politicalTypes = relationshipTypes
    ? relationshipTypes.filter((type) =>
        POLITICAL_RELATIONSHIP_TYPES.includes(type as any)
      )
    : POLITICAL_RELATIONSHIP_TYPES;

  const query = `
    MATCH (entity {uid: $entityUid})
    
    // Get political roles and affiliations
    OPTIONAL MATCH (entity)-[polRel:HOLDS_ROLE|ENDORSES|ATTACKS|PLATFORMS|AFFILIATED_WITH|OPPOSES|SUPPORTS]-(politicalEntity)
    
    WITH entity, collect(DISTINCT {
      relationshipId: polRel.uid,
      relationshipType: type(polRel),
      direction: CASE 
        WHEN startNode(polRel) = entity THEN 'outgoing'
        ELSE 'incoming'
      END,
      politicalEntity: {
        uid: politicalEntity.uid,
        name: politicalEntity.name,
        type: labels(politicalEntity)[0],
        politicalParty: politicalEntity.politicalParty,
        positions: politicalEntity.positions
      },
      relationshipDate: polRel.at,
      position: polRel.position,
      role: polRel.role,
      intensity: polRel.intensity,
      confidence: coalesce(polRel.confidence, 1.0),
      evidenceUids: coalesce(polRel.evidence_uids, [])
    }) as politicalRelationships
    
    RETURN entity, politicalRelationships
    LIMIT $limit
  `;

  return {
    query: query.trim(),
    params: {
      entityUid,
      limit: Math.floor(limit),
      politicalTypes: politicalTypes,
    },
  };
}

/**
 * Build platform relationship query
 */
export function buildPlatformRelationshipQuery(
  params: RelationshipQueryParams
): QueryResult {
  const { entityUid, relationshipTypes, limit } = params;

  const platformTypes = relationshipTypes
    ? relationshipTypes.filter((type) =>
        PLATFORM_RELATIONSHIP_TYPES.includes(type as any)
      )
    : PLATFORM_RELATIONSHIP_TYPES;

  const query = `
    MATCH (entity {uid: $entityUid})
    
    // Get platform interactions and moderation
    OPTIONAL MATCH (entity)-[platRel:PLATFORMS|MODERATION_ACTION|ADVERTISES_ON|OWNS_ACCOUNT|SUSPENDED_FROM]-(platform)
    WHERE platform:Platform
    
    WITH entity, collect(DISTINCT {
      relationshipId: platRel.uid,
      relationshipType: type(platRel),
      direction: CASE 
        WHEN startNode(platRel) = entity THEN 'outgoing'
        ELSE 'incoming'
      END,
      platform: {
        uid: platform.uid,
        name: platform.name,
        type: labels(platform)[0],
        launched: platform.launched,
        shutdown: platform.shutdown
      },
      relationshipDate: platRel.at,
      moderationReason: platRel.reason,
      suspensionDuration: platRel.duration,
      accountHandle: platRel.handle,
      confidence: coalesce(platRel.confidence, 1.0),
      evidenceUids: coalesce(platRel.evidence_uids, [])
    }) as platformRelationships
    
    RETURN entity, platformRelationships
    LIMIT $limit
  `;

  return {
    query: query.trim(),
    params: {
      entityUid,
      limit: Math.floor(limit),
      platformTypes: platformTypes,
    },
  };
}

/**
 * Main relationship details query builder
 */
export function buildRelationshipDetailsQuery(
  params: RelationshipQueryParams
): QueryResult {
  const { categories, entityUid } = params;

  // For now, focus on family relationships as specified in the handoff
  if (categories.includes("family")) {
    return buildFamilyRelationshipQuery(params);
  }

  // TODO: Implement multi-category queries when business/political are implemented
  if (categories.includes("business")) {
    return buildBusinessRelationshipQuery(params);
  }

  if (categories.includes("political")) {
    return buildPoliticalRelationshipQuery(params);
  }

  if (categories.includes("platform")) {
    return buildPlatformRelationshipQuery(params);
  }

  // Default to family relationships
  return buildFamilyRelationshipQuery({ ...params, categories: ["family"] });
}

/**
 * Get available relationship types for entity type
 */
export function getRelationshipTypesForEntity(entityType: EntityType): {
  family?: string[];
  business?: string[];
  political?: string[];
  platform?: string[];
  academic?: string[];
  cultural?: string[];
  medical?: string[];
  events?: string[];
  geospatial?: string[];
} {
  const baseTypes = {
    family: [...FAMILY_RELATIONSHIP_TYPES],
    business: [...BUSINESS_RELATIONSHIP_TYPES],
    political: [...POLITICAL_RELATIONSHIP_TYPES],
    platform: [...PLATFORM_RELATIONSHIP_TYPES],
    academic: [...ACADEMIC_RELATIONSHIP_TYPES],
    cultural: [...CULTURAL_RELATIONSHIP_TYPES],
    medical: [...MEDICAL_RELATIONSHIP_TYPES],
    // Universal event relationships - apply to all entity types
    events: [
      "EXPERIENCES_EVENT",
      "PARTICIPATES_IN_EVENT",
      "CAUSED_BY_EVENT",
      "CAUSES_EVENT",
      "AFFECTED_BY_EVENT",
      "WITNESSES_EVENT",
      "TRIGGERED_BY",
      "RESULTS_IN",
      "OCCURS_AT",
      "HAPPENS_TO",
      "INVOLVES",
    ],
    // Universal geospatial relationships - apply to entities with location
    geospatial: [
      "ADJACENT_TO",
      "NEAR",
      "WITHIN",
      "CONTAINS_LOCATION",
      "OVERLAPS",
      "INTERSECTS",
    ],
  };

  switch (entityType) {
    case "Person":
      return {
        ...baseTypes,
        events: baseTypes.events, // People can experience events
      };

    case "Organization":
      return {
        business: baseTypes.business,
        political: baseTypes.political,
        platform: baseTypes.platform,
        events: baseTypes.events, // Organizations can experience events
        geospatial: baseTypes.geospatial, // Organizations have locations
      };

    case "Platform":
      return {
        business: baseTypes.business,
        platform: baseTypes.platform,
        events: baseTypes.events, // Platforms have events (launches, changes)
        geospatial: baseTypes.geospatial, // Platforms may have server locations
      };

    case "Movement":
      return {
        political: baseTypes.political,
        platform: baseTypes.platform,
        events: baseTypes.events, // Movements have events (rallies, milestones)
        geospatial: baseTypes.geospatial, // Movements have geographic scope
      };

    case "Event":
      return {
        political: baseTypes.political,
        events: baseTypes.events, // Events can relate to other events
        geospatial: baseTypes.geospatial, // Events happen at locations
      };

    case "Media":
      return {
        business: baseTypes.business,
        platform: baseTypes.platform,
        events: baseTypes.events, // Media has publication/broadcast events
      };

    // Biological entities - primarily use family/business relationships
    case "Animal":
    case "Plant":
    case "Fungi":
    case "Species":
    case "Insect":
    case "Ecosystem":
      return {
        family: baseTypes.family, // For taxonomic relationships
        business: baseTypes.business, // For research/conservation orgs
        events: baseTypes.events, // Birth, death, migration, evolution events
        geospatial: baseTypes.geospatial, // Animals/ecosystems have habitats
      };

    // Astronomical entities - primarily use business relationships
    case "Planet":
    case "Star":
    case "Galaxy":
    case "Solar_System":
      return {
        business: baseTypes.business, // For research organizations
        events: baseTypes.events, // Formation, collision, observation events
        geospatial: baseTypes.geospatial, // Celestial coordinates/positions
      };

    // Geographic entities - use political/business relationships
    case "Country":
    case "City":
    case "Region":
    case "Continent":
      return {
        political: baseTypes.political,
        business: baseTypes.business,
        events: baseTypes.events, // Foundation, historical events
        geospatial: baseTypes.geospatial, // Geographic boundaries and adjacency
      };

    // Technology entities - return technology-specific relationships
    case "Software":
    case "Hardware":
    case "Database":
    case "API":
    case "Protocol":
    case "Framework":
    case "Library":
      return {
        business: [
          "USES",
          "POWERS",
          "INTEGRATES_WITH",
          "DEPENDS_ON",
          "SUPPORTS",
          "IMPLEMENTS",
          "EXTENDS",
          "REPLACES",
          "COMPATIBLE_WITH",
          "HOSTS",
          "RUNS_ON",
          "CONNECTS_TO",
        ] as string[],
        events: baseTypes.events, // Launch, update, deprecation events
      };

    // Economic entities - return economic-specific relationships
    case "Currency":
    case "Market":
    case "Industry":
    case "Commodity":
    case "Investment":
    case "Company":
      return {
        business: [
          "TRADES",
          "INVESTS_IN",
          "COMPETES_WITH",
          "SUPPLIES",
          "BUYS",
          "SELLS",
          "VALUES",
          "ISSUES",
          "BACKS",
          "EXCHANGES_FOR",
          "LISTED_ON",
          "REGULATES_MARKET",
        ] as string[],
        events: baseTypes.events, // Market crashes, IPOs, mergers, transactions
      };

    // Legal entities - return legal-specific relationships
    case "Law":
    case "Court":
    case "Case":
    case "Regulation":
    case "Patent":
    case "License":
    case "Contract":
      return {
        political: [
          "REGULATES",
          "ENFORCES",
          "VIOLATES",
          "SUES",
          "LICENSES",
          "RULES_ON",
          "APPEALS",
          "CITES",
          "OVERTURNS",
          "UPHOLDS",
          "INTERPRETS",
          "AMENDS",
          "REPEALS",
          "COVERS",
        ] as string[],
        events: baseTypes.events, // Enactment, court decisions, legal proceedings
        geospatial: baseTypes.geospatial, // Courts have locations, laws have jurisdictions
      };

    // Academic entities - return academic-specific relationships
    case "University":
    case "Research":
    case "Publication":
    case "Journal":
    case "Course":
    case "Degree":
      return {
        academic: [
          "TEACHES",
          "STUDIES",
          "RESEARCHES",
          "PUBLISHES",
          "REVIEWS",
          "SUPERVISES",
          "MENTORS",
          "COLLABORATES_WITH",
          "ATTENDS",
          "GRADUATES_FROM",
          "AWARDS",
          "ACCREDITS",
          "INDEXES",
          "PEER_REVIEWS",
        ] as string[],
        events: baseTypes.events, // Publication, graduation, research breakthrough events
        geospatial: baseTypes.geospatial, // Universities have campus locations
      };

    // Cultural entities - return cultural-specific relationships
    case "Book":
    case "Film":
    case "Song":
    case "Art":
    case "Language":
    case "Religion":
    case "Tradition":
      return {
        cultural: [
          "CREATES",
          "INFLUENCES",
          "INSPIRES",
          "ADAPTS",
          "TRANSLATES",
          "PERFORMS",
          "SPEAKS",
          "PRACTICES",
          "CELEBRATES",
          "PRESERVES",
          "DOCUMENTS",
          "EXHIBITS",
          "COLLECTS",
          "COMMISSIONS",
        ] as string[],
        events: baseTypes.events, // Creation, performance, exhibition, cultural milestone events
        geospatial: baseTypes.geospatial, // Cultural sites, exhibition locations
      };

    // Medical entities - return medical-specific relationships
    case "Disease":
    case "Drug":
    case "Treatment":
    case "Symptom":
    case "Condition":
    case "Medical_Device":
    case "Hospital":
    case "Clinic":
    case "Pharmacy":
    case "Insurance":
    case "Clinical_Trial":
      return {
        medical: [
          "TREATS",
          "CAUSES",
          "SYMPTOMS_OF",
          "PREVENTS",
          "DIAGNOSES",
          "PRESCRIBES",
          "ADMINISTERS",
          "INDICATES",
          "CONTRAINDICATED_FOR",
          "SIDE_EFFECT_OF",
          "INTERACTS_WITH",
          "MANAGES",
          "MONITORS",
          "OPERATES_ON",
          "HOSPITALIZED_AT",
          "TREATED_BY",
          "INSURED_BY",
          "ENROLLED_IN",
        ] as string[],
        events: baseTypes.events, // Diagnosis, treatment, outbreak, clinical trial events
        geospatial: baseTypes.geospatial, // Hospitals, clinics have fixed locations
      };

    // Infrastructure entities - return infrastructure-specific relationships
    case "Building":
    case "Bridge":
    case "Road":
    case "Airport":
    case "Port":
    case "Utility":
    case "Pipeline":
      return {
        business: [
          "POWERS",
          "CONNECTS",
          "SUPPLIES",
          "DISTRIBUTES",
          "CARRIES",
          "SUPPORTS",
          "CROSSES",
          "SPANS",
          "BUILT_BY",
          "DESIGNED_BY",
          "MAINTAINED_BY",
          "OPERATED_BY",
        ] as string[],
        events: baseTypes.events, // Construction, maintenance, failure events
        geospatial: baseTypes.geospatial, // Infrastructure has fixed locations
      };

    // Transportation entities - return transportation-specific relationships
    case "Vehicle":
    case "Aircraft":
    case "Ship":
    case "Train":
    case "Route":
    case "Station":
      return {
        business: [
          "TRANSPORTS",
          "SERVES_ROUTE",
          "DOCKS_AT",
          "LANDS_AT",
          "DEPARTS_FROM",
          "ARRIVES_AT",
          "RUNS_ON",
          "SERVICES",
          "OPERATED_BY",
          "MAINTAINED_BY",
        ] as string[],
        events: baseTypes.events, // Departure, arrival, accident, maintenance events
        geospatial: baseTypes.geospatial, // Routes, stations have locations
      };

    // Note: Additional domains (Physics, Chemistry, Math, Materials, Environmental,
    // Sports, Entertainment, Food, Agriculture) can be added when implemented

    default:
      // Universal support for all new entity types
      return {
        ...baseTypes,
        events: baseTypes.events, // Universal event support for all entities
      };
  }
}

/**
 * Validate relationship query parameters
 */
export function validateQueryParams(params: RelationshipQueryParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.entityUid || !params.entityUid.includes(":")) {
    errors.push("entityUid must be in format 'namespace:identifier'");
  }

  if (!params.categories || params.categories.length === 0) {
    errors.push("At least one category must be specified");
  }

  const validCategories = [
    "family",
    "business",
    "political",
    "platform",
    "academic",
    "cultural",
    "medical",
  ];
  const invalidCategories = params.categories.filter(
    (cat) => !validCategories.includes(cat)
  );
  if (invalidCategories.length > 0) {
    errors.push(`Invalid categories: ${invalidCategories.join(", ")}`);
  }

  if (params.limit && (params.limit < 1 || params.limit > 200)) {
    errors.push("Limit must be between 1 and 200");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build evidence resolution query
 */
export function buildEvidenceResolutionQuery(
  evidenceUids: string[]
): QueryResult {
  if (evidenceUids.length === 0) {
    return { query: "", params: {} };
  }

  const query = `
    MATCH (evidence:Evidence)
    WHERE evidence.uid IN $evidenceUids
    RETURN evidence {
      .uid,
      .title,
      .publisher,
      .url,
      .reliability
    } as evidence
  `;

  return {
    query: query.trim(),
    params: { evidenceUids },
  };
}
