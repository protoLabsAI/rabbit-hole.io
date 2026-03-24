/**
 * Research Quality Evaluation
 *
 * Evaluates the quality of research results and drives adaptive depth decisions.
 * Used by the research_entity pipeline to determine whether additional search
 * rounds are needed to meet evidence quality thresholds for a given depth level.
 */

// ─── Interfaces ──────────────────────────────────────────────────────

export interface QualityMetrics {
  entityCount: number;
  relationshipCoverage: number;
  sourceDiversity: number;
  confidenceScore: number;
}

export interface QualityThreshold {
  entityCount: number;
  sourceDiversity: number;
  confidenceScore?: number;
}

export interface QualityEvaluation {
  metrics: QualityMetrics;
  sufficient: boolean;
  gaps: GapAnalysis;
}

export interface GapAnalysis {
  descriptions: string[];
  suggestedQueries: string[];
}

export interface ResearchBudget {
  maxAdditionalRounds: number;
  maxTotalSources: number;
}

// ─── Thresholds ──────────────────────────────────────────────────────

export const QUALITY_THRESHOLDS: Record<string, QualityThreshold> = {
  basic: {
    entityCount: 3,
    sourceDiversity: 1,
  },
  detailed: {
    entityCount: 8,
    sourceDiversity: 2,
    confidenceScore: 0.6,
  },
  comprehensive: {
    entityCount: 15,
    sourceDiversity: 3,
    confidenceScore: 0.7,
  },
};

export const DEFAULT_BUDGET: ResearchBudget = {
  maxAdditionalRounds: 3,
  maxTotalSources: 5,
};

// ─── Budget Tracker ──────────────────────────────────────────────────

export class BudgetTracker {
  private roundsUsed = 0;
  private sourcesQueried = 0;
  private readonly budget: ResearchBudget;

  constructor(budget: ResearchBudget = DEFAULT_BUDGET) {
    this.budget = budget;
  }

  recordRound(): void {
    this.roundsUsed++;
  }

  recordSources(count: number): void {
    this.sourcesQueried += count;
  }

  isExhausted(): boolean {
    return (
      this.roundsUsed >= this.budget.maxAdditionalRounds ||
      this.sourcesQueried >= this.budget.maxTotalSources
    );
  }

  getRoundsUsed(): number {
    return this.roundsUsed;
  }

  getSourcesQueried(): number {
    return this.sourcesQueried;
  }

  getBudget(): ResearchBudget {
    return this.budget;
  }
}

// ─── Quality Evaluation ──────────────────────────────────────────────

/**
 * Shape of search results passed into evaluateQuality.
 *
 * We work with the Record<string, unknown> results object that researchEntity
 * builds up, so we type the pieces we actually inspect.
 */
export interface SearchResults {
  extraction?: unknown;
  wikipedia?: unknown;
  webSearch?: unknown;
  tavilySearch?: unknown;
  [key: string]: unknown;
}

/**
 * Derive QualityMetrics from a combined results object.
 *
 * - entityCount      – number of entities in the extraction
 * - relationshipCoverage – ratio of relationships to entities (capped at 1)
 * - sourceDiversity  – number of distinct sources that returned data
 * - confidenceScore  – mean confidence score of entity citations, or 0
 */
export function computeMetrics(results: SearchResults): QualityMetrics {
  // Entity count from extraction
  let entityCount = 0;
  let relationshipCount = 0;

  const extraction = results.extraction as Record<string, unknown> | undefined;
  if (extraction && !extraction.error) {
    const entities = extraction.entities as Array<unknown> | undefined;
    const relationships = extraction.relationships as Array<unknown> | undefined;
    entityCount = Array.isArray(entities) ? entities.length : 0;
    relationshipCount = Array.isArray(relationships) ? relationships.length : 0;
  }

  // Relationship coverage: relationships per entity (capped at 1.0)
  const relationshipCoverage =
    entityCount > 0 ? Math.min(relationshipCount / entityCount, 1.0) : 0;

  // Source diversity: count sources that returned useful data
  let sourceDiversity = 0;
  const wiki = results.wikipedia as Record<string, unknown> | undefined;
  if (wiki && !wiki.error && wiki.text) sourceDiversity++;

  const web = results.webSearch as Record<string, unknown> | undefined;
  if (web && !web.error) {
    const items = web.results as Array<unknown> | undefined;
    if (Array.isArray(items) && items.length > 0) sourceDiversity++;
  }

  const tavily = results.tavilySearch as Record<string, unknown> | undefined;
  if (tavily && !tavily.error) {
    const items = tavily.results as Array<unknown> | undefined;
    if (Array.isArray(items) && items.length > 0) sourceDiversity++;
  }

  // Confidence score: mean of all entity confidence values from citations
  const entityCitations = results.entityCitations as
    | Record<string, Array<Record<string, unknown>>>
    | undefined;
  let confidenceScore = 0;
  if (entityCitations) {
    const allConfidences: number[] = [];
    for (const citations of Object.values(entityCitations)) {
      if (Array.isArray(citations)) {
        for (const citation of citations) {
          if (typeof citation.confidence === "number") {
            allConfidences.push(citation.confidence);
          }
        }
      }
    }
    if (allConfidences.length > 0) {
      confidenceScore =
        allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;
    }
  }

  return { entityCount, relationshipCoverage, sourceDiversity, confidenceScore };
}

/**
 * Evaluate research quality against thresholds for the requested depth level.
 * Returns whether results are sufficient and what gaps exist.
 */
export function evaluateQuality(
  results: SearchResults,
  depth: string
): QualityEvaluation {
  const metrics = computeMetrics(results);
  const threshold = QUALITY_THRESHOLDS[depth] ?? QUALITY_THRESHOLDS["detailed"];
  const gaps = analyzeGaps(metrics, depth);

  const sufficient =
    metrics.entityCount >= threshold.entityCount &&
    metrics.sourceDiversity >= threshold.sourceDiversity &&
    (threshold.confidenceScore === undefined ||
      metrics.confidenceScore >= threshold.confidenceScore);

  return { metrics, sufficient, gaps };
}

/**
 * Identify gaps between current metrics and thresholds, and suggest
 * follow-up queries to fill those gaps.
 */
export function analyzeGaps(metrics: QualityMetrics, depth: string): GapAnalysis {
  const threshold = QUALITY_THRESHOLDS[depth] ?? QUALITY_THRESHOLDS["detailed"];
  const descriptions: string[] = [];
  const suggestedQueries: string[] = [];

  // Entity count gap
  if (metrics.entityCount < threshold.entityCount) {
    const missing = threshold.entityCount - metrics.entityCount;
    descriptions.push(
      `Entity count insufficient: found ${metrics.entityCount}, need ${threshold.entityCount} (missing ${missing})`
    );
    suggestedQueries.push("key people organizations events");
    suggestedQueries.push("related entities history background");
  }

  // Source diversity gap
  if (metrics.sourceDiversity < threshold.sourceDiversity) {
    const missing = threshold.sourceDiversity - metrics.sourceDiversity;
    descriptions.push(
      `Source diversity insufficient: ${metrics.sourceDiversity} sources, need ${threshold.sourceDiversity} (missing ${missing})`
    );
    suggestedQueries.push("recent news coverage");
    suggestedQueries.push("alternative perspectives analysis");
  }

  // Confidence score gap
  if (
    threshold.confidenceScore !== undefined &&
    metrics.confidenceScore < threshold.confidenceScore
  ) {
    descriptions.push(
      `Confidence score low: ${metrics.confidenceScore.toFixed(2)}, need ${threshold.confidenceScore}`
    );
    suggestedQueries.push("verified facts authoritative sources");
    suggestedQueries.push("official documentation primary sources");
  }

  // Relationship coverage gap (additional insight)
  if (metrics.relationshipCoverage < 0.3 && metrics.entityCount > 0) {
    descriptions.push(
      `Relationship coverage sparse: ${(metrics.relationshipCoverage * 100).toFixed(0)}% coverage`
    );
    suggestedQueries.push("connections relationships between entities");
  }

  return { descriptions, suggestedQueries };
}
