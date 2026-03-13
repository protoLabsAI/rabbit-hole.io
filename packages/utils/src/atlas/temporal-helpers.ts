/**
 * Temporal Data Helpers
 *
 * Utilities for identifying missing temporal data and research gaps
 * in entity timelines. Supports the "show gaps, don't hide them" philosophy.
 */

export interface MissingDateInfo {
  entityUid: string;
  entityName: string;
  entityType: string;
  missingIntrinsicDates: Array<{
    field: string;
    label: string;
    importance: "critical" | "major" | "minor";
    description: string;
  }>;
  missingRelationshipDates: Array<{
    relationshipId: string;
    relationshipType: string;
    targetEntityUid: string;
    targetEntityName: string;
    importance: "critical" | "major" | "minor";
    description: string;
  }>;
  summary: {
    totalMissingDates: number;
    intrinsicMissing: number;
    relationshipsMissing: number;
    researchPriority: "high" | "medium" | "low";
  };
}

/**
 * Get missing temporal data for a specific entity
 * Returns comprehensive list of what dates need research
 */
export async function getMissingDatesForEntity(
  entityUid: string,
  apiBaseUrl = "http://localhost:3000"
): Promise<MissingDateInfo | null> {
  try {
    // Fetch enhanced timeline data which includes placeholders
    const response = await fetch(
      `${apiBaseUrl}/api/entity-timeline/${entityUid}`
    );

    if (!response.ok) {
      console.warn(
        `Failed to fetch timeline for ${entityUid}:`,
        response.status
      );
      return null;
    }

    const timelineData = (await response.json()) as any;

    if (!timelineData.success) {
      console.warn(`Timeline API error for ${entityUid}:`, timelineData.error);
      return null;
    }

    const { entity, timeline, summary } = timelineData.data;

    // Extract missing intrinsic dates
    const missingIntrinsicDates = timeline
      .filter(
        (event: any) => event.isPlaceholder && event.eventType === "intrinsic"
      )
      .map((event: any) => ({
        field: event.entityProperty,
        label: getDateFieldLabel(event.entityProperty, entity.type),
        importance: event.importance,
        description: event.description,
      }));

    // Extract missing relationship dates
    const missingRelationshipDates = timeline
      .filter(
        (event: any) =>
          event.isPlaceholder && event.eventType === "relationship"
      )
      .map((event: any) => ({
        relationshipId: event.properties?.originalRelationshipId || event.id,
        relationshipType: event.relationshipType,
        targetEntityUid: event.targetEntity?.uid,
        targetEntityName: event.targetEntity?.name,
        importance: event.importance,
        description: event.description,
      }));

    // Calculate research priority
    const totalMissing =
      missingIntrinsicDates.length + missingRelationshipDates.length;
    const criticalMissing = timeline.filter(
      (event: any) => event.isPlaceholder && event.importance === "critical"
    ).length;

    let researchPriority: "high" | "medium" | "low";
    if (criticalMissing > 0 || totalMissing > 10) {
      researchPriority = "high";
    } else if (totalMissing > 5) {
      researchPriority = "medium";
    } else {
      researchPriority = "low";
    }

    return {
      entityUid: entity.uid,
      entityName: entity.name,
      entityType: entity.type,
      missingIntrinsicDates,
      missingRelationshipDates,
      summary: {
        totalMissingDates: totalMissing,
        intrinsicMissing: missingIntrinsicDates.length,
        relationshipsMissing: missingRelationshipDates.length,
        researchPriority,
      },
    };
  } catch (error) {
    console.error(`Error fetching missing dates for ${entityUid}:`, error);
    return null;
  }
}

/**
 * Get missing dates for multiple entities (batch operation)
 */
export async function getMissingDatesForEntities(
  entityUids: string[],
  apiBaseUrl = "http://localhost:3000"
): Promise<MissingDateInfo[]> {
  const results = await Promise.allSettled(
    entityUids.map((uid) => getMissingDatesForEntity(uid, apiBaseUrl))
  );

  return results
    .filter(
      (result): result is PromiseSettledResult<MissingDateInfo> =>
        result.status === "fulfilled" && result.value !== null
    )
    .map((result) => (result as PromiseFulfilledResult<MissingDateInfo>).value)
    .filter((info): info is MissingDateInfo => info !== null);
}

/**
 * Generate research report for entities with missing temporal data
 */
export function generateResearchReport(missingDataList: MissingDateInfo[]): {
  summary: {
    totalEntities: number;
    highPriority: number;
    totalMissingDates: number;
    mostCommonMissingFields: Array<{ field: string; count: number }>;
  };
  entitiesByPriority: {
    high: MissingDateInfo[];
    medium: MissingDateInfo[];
    low: MissingDateInfo[];
  };
  recommendedActions: Array<{
    action: string;
    entities: string[];
    priority: "high" | "medium" | "low";
  }>;
} {
  // Calculate summary statistics
  const totalMissingDates = missingDataList.reduce(
    (sum, info) => sum + info.summary.totalMissingDates,
    0
  );

  const highPriorityCount = missingDataList.filter(
    (info) => info.summary.researchPriority === "high"
  ).length;

  // Count most common missing fields
  const fieldCounts = new Map<string, number>();
  missingDataList.forEach((info) => {
    info.missingIntrinsicDates.forEach((missing) => {
      const count = fieldCounts.get(missing.field) || 0;
      fieldCounts.set(missing.field, count + 1);
    });
  });

  const mostCommonMissingFields = Array.from(fieldCounts.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Group by priority
  const entitiesByPriority = {
    high: missingDataList.filter(
      (info) => info.summary.researchPriority === "high"
    ),
    medium: missingDataList.filter(
      (info) => info.summary.researchPriority === "medium"
    ),
    low: missingDataList.filter(
      (info) => info.summary.researchPriority === "low"
    ),
  };

  // Generate recommended actions
  const recommendedActions: Array<{
    action: string;
    entities: string[];
    priority: "high" | "medium" | "low";
  }> = [];

  if (entitiesByPriority.high.length > 0) {
    recommendedActions.push({
      action: "Research critical intrinsic dates (birth dates, founding dates)",
      entities: entitiesByPriority.high.map((info) => info.entityUid),
      priority: "high" as const,
    });
  }

  const entitiesWithManyUndatedRelationships = missingDataList.filter(
    (info) => info.summary.relationshipsMissing > 5
  );

  if (entitiesWithManyUndatedRelationships.length > 0) {
    recommendedActions.push({
      action: "Add temporal data to major relationships",
      entities: entitiesWithManyUndatedRelationships.map(
        (info) => info.entityUid
      ),
      priority: "medium" as const,
    });
  }

  return {
    summary: {
      totalEntities: missingDataList.length,
      highPriority: highPriorityCount,
      totalMissingDates,
      mostCommonMissingFields,
    },
    entitiesByPriority,
    recommendedActions,
  };
}

/**
 * Get human-readable label for date field based on entity type
 */
function getDateFieldLabel(field: string, entityType: string): string {
  const labelMap: Record<string, Record<string, string>> = {
    Person: {
      birthDate: "Birth Date",
      deathDate: "Death Date",
    },
    Organization: {
      founded: "Founding Date",
      dissolved: "Dissolution Date",
      acquired: "Acquisition Date",
      bankruptcyDate: "Bankruptcy Date",
    },
    Platform: {
      launched: "Launch Date",
      shutdown: "Shutdown Date",
      discontinued: "Discontinuation Date",
    },
    Movement: {
      founded: "Founding Date",
      ended: "End Date",
      transformed: "Transformation Date",
    },
    Event: {
      date: "Event Date",
      endDate: "End Date",
    },
    Country: {
      independence: "Independence Date",
      founded: "Founding Date",
      dissolved: "Dissolution Date",
    },
  };

  return (
    labelMap[entityType]?.[field] ||
    field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
  );
}

/**
 * Quick check if entity has critical missing dates
 */
export async function hasImportantMissingDates(
  entityUid: string,
  apiBaseUrl = "http://localhost:3000"
): Promise<boolean> {
  const missingInfo = await getMissingDatesForEntity(entityUid, apiBaseUrl);

  if (!missingInfo) return false;

  return (
    missingInfo.summary.researchPriority === "high" ||
    missingInfo.missingIntrinsicDates.some(
      (missing) => missing.importance === "critical"
    )
  );
}

/**
 * Get prioritized list of entities needing temporal research
 */
export async function getPrioritizedResearchList(
  entityUids: string[],
  apiBaseUrl = "http://localhost:3000"
): Promise<{
  highPriority: string[];
  mediumPriority: string[];
  lowPriority: string[];
}> {
  const missingDataList = await getMissingDatesForEntities(
    entityUids,
    apiBaseUrl
  );

  return {
    highPriority: missingDataList
      .filter((info) => info.summary.researchPriority === "high")
      .map((info) => info.entityUid),
    mediumPriority: missingDataList
      .filter((info) => info.summary.researchPriority === "medium")
      .map((info) => info.entityUid),
    lowPriority: missingDataList
      .filter((info) => info.summary.researchPriority === "low")
      .map((info) => info.entityUid),
  };
}
