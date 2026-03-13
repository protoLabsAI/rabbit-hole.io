import {
  StateGraph,
  START,
  END,
  Annotation,
  interrupt,
  MemorySaver,
} from "@langchain/langgraph";

import {
  ExtractionMode,
  ConfidenceThresholds,
  Entity,
  Relationship,
  SourceGrounding,
  TiptapAnnotation,
} from "./multi-phase-extraction";

// ============================================================================
// User Decision Types
// ============================================================================

export interface UserAction {
  phase: string;
  action: "merge" | "correct" | "approve" | "reject" | "skip";
  timestamp: string;
  details: {
    entityUids?: string[];
    mergedInto?: string;
    fieldName?: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
  };
}

export interface EntityMerge {
  sourceUids: string[];
  targetUid: string;
  mergedName: string;
  keepAliases?: string[];
}

export interface FieldCorrection {
  entityUid: string;
  corrections: Record<string, unknown>;
}

export interface ReviewData {
  phase: string;
  timestamp: string;
  entities?: Array<{
    uid: string;
    name: string;
    type: string;
    confidence?: number;
    [key: string]: unknown;
  }>;
  relationships?: Array<{
    uid: string;
    type: string;
    source: string;
    target: string;
    confidence: number;
  }>;
  stats?: Record<string, number>;
  duplicateCandidates?: Array<{
    entities: string[];
    similarity: number;
  }>;
}

// ============================================================================
// State Annotation
// ============================================================================

export const HumanLoopExtractionStateAnnotation = Annotation.Root({
  // Input configuration
  inputText: Annotation<string>,
  mode: Annotation<ExtractionMode>,
  domains: Annotation<string[]>,
  modelId: Annotation<string | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  temperature: Annotation<number | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  includeEntityTypes: Annotation<string[] | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  excludeEntityTypes: Annotation<string[] | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
  confidenceThresholds: Annotation<ConfidenceThresholds>,

  // Phase tracking
  currentPhase: Annotation<
    "discover" | "structure" | "enrich" | "relate" | "finalize" | string
  >({
    reducer: (current, update) => update ?? current,
    default: () => "discover",
  }),

  // Phase outputs
  discoveredEntities: Annotation<Map<string, string[]>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  structuredEntities: Annotation<Map<string, Entity>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  enrichedEntities: Annotation<Map<string, Entity>>({
    reducer: (current, update) => update ?? current,
    default: () => new Map(),
  }),
  relationships: Annotation<Relationship[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Annotations per phase
  phase1Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  phase2Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  phase3Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  phase4Annotations: Annotation<SourceGrounding[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  allAnnotations: Annotation<TiptapAnnotation[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Human decisions (batch updates)
  userActions: Annotation<UserAction[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Entity merging
  entityMergeMap: Annotation<Map<string, string>>({
    reducer: (current, update) => new Map([...current, ...update]),
    default: () => new Map(),
  }),

  // Field corrections (batched by entity UID)
  fieldCorrections: Annotation<Record<string, Partial<Entity>>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Phase approvals
  phaseApprovals: Annotation<Record<string, boolean>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Review data for current interrupt
  reviewData: Annotation<ReviewData | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // Metadata
  processingTime: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  errorLog: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

export type HumanLoopExtractionState =
  typeof HumanLoopExtractionStateAnnotation.State;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Levenshtein distance for string similarity
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * String similarity (0-1, 1 = identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Find duplicate entity candidates
 */
function findDuplicateCandidates(
  entities: Map<string, Entity>
): Array<{ entities: string[]; similarity: number }> {
  const groups: Array<{ entities: string[]; similarity: number }> = [];
  const processed = new Set<string>();

  for (const [uid1, entity1] of entities.entries()) {
    if (processed.has(uid1)) continue;

    const duplicates: string[] = [uid1];
    let maxSimilarity = 0;

    for (const [uid2, entity2] of entities.entries()) {
      if (uid1 === uid2 || processed.has(uid2)) continue;
      if (entity1.type !== entity2.type) continue;

      const similarity = stringSimilarity(
        entity1.name.toLowerCase(),
        entity2.name.toLowerCase()
      );

      if (similarity > 0.8) {
        duplicates.push(uid2);
        maxSimilarity = Math.max(maxSimilarity, similarity);
        processed.add(uid2);
      }
    }

    if (duplicates.length > 1) {
      groups.push({
        entities: duplicates,
        similarity: maxSimilarity,
      });
    }

    processed.add(uid1);
  }

  return groups;
}

/**
 * Apply field corrections to entities
 */
function applyFieldCorrections(
  entities: Map<string, Entity>,
  corrections: Record<string, Partial<Entity>>
): Map<string, Entity> {
  if (Object.keys(corrections).length === 0) return entities;

  const corrected = new Map(entities);

  for (const [entityUid, fieldUpdates] of Object.entries(corrections)) {
    const entity = corrected.get(entityUid);
    if (entity) {
      corrected.set(entityUid, {
        ...entity,
        ...fieldUpdates,
        _userCorrected: true,
      });
    }
  }

  return corrected;
}

/**
 * Prepare review data for current phase
 */
function prepareReviewData(
  state: HumanLoopExtractionState,
  phase: string
): ReviewData {
  const reviewData: ReviewData = {
    phase,
    timestamp: new Date().toISOString(),
  };

  switch (phase) {
    case "discover": {
      const discoveredEntitiesArray = Array.from(
        state.discoveredEntities.entries()
      ).flatMap(([type, names]) =>
        names.map((name) => ({ uid: `${type}:${name}`, name, type }))
      );

      reviewData.entities = discoveredEntitiesArray;
      reviewData.stats = {
        total: discoveredEntitiesArray.length,
      };
      reviewData.duplicateCandidates = findDuplicateCandidates(
        new Map(
          discoveredEntitiesArray.map((e) => [
            e.uid,
            { uid: e.uid, name: e.name, type: e.type },
          ])
        )
      );
      break;
    }

    case "structure": {
      reviewData.entities = Array.from(state.structuredEntities.values()).map(
        (e) => ({
          uid: e.uid,
          name: e.name,
          type: e.type,
          confidence: (e as any)._confidence,
        })
      );
      reviewData.stats = {
        total: state.structuredEntities.size,
      };
      break;
    }

    case "enrich": {
      reviewData.entities = Array.from(state.enrichedEntities.values()).map(
        (e) => ({
          uid: e.uid,
          name: e.name,
          type: e.type,
          ...e,
        })
      );
      reviewData.stats = {
        total: state.enrichedEntities.size,
        fieldsExtracted: Array.from(state.enrichedEntities.values()).reduce(
          (acc, e) => acc + Object.keys(e).length,
          0
        ),
      };
      break;
    }

    case "relate": {
      reviewData.relationships = state.relationships.map((r) => ({
        uid: `${r.source_uid}_${r.relationship_type}_${r.target_uid}`,
        type: r.relationship_type,
        source: r.source_uid,
        target: r.target_uid,
        confidence: r.confidence,
      }));
      reviewData.stats = {
        total: state.relationships.length,
      };
      break;
    }
  }

  return reviewData;
}

/**
 * Process user decisions when resuming
 */
function processUserDecisions(
  state: HumanLoopExtractionState,
  decisions: Record<string, unknown>
): Partial<HumanLoopExtractionState> {
  const updates: Partial<HumanLoopExtractionState> = {};

  // Log user actions
  if (decisions.userActions && Array.isArray(decisions.userActions)) {
    updates.userActions = decisions.userActions as UserAction[];
  }

  // Apply entity merges
  if (decisions.merges && Array.isArray(decisions.merges)) {
    const mergeMap = new Map(state.entityMergeMap);
    decisions.merges.forEach((merge: EntityMerge) => {
      merge.sourceUids.forEach((sourceUid: string) => {
        mergeMap.set(sourceUid, merge.targetUid);
      });
    });
    updates.entityMergeMap = mergeMap;
  }

  // Apply field corrections
  if (decisions.corrections && typeof decisions.corrections === "object") {
    updates.fieldCorrections = {
      ...state.fieldCorrections,
      ...(decisions.corrections as Record<string, Partial<Entity>>),
    };
  }

  // Mark phase as approved
  if (decisions.approvals && typeof decisions.approvals === "object") {
    updates.phaseApprovals = {
      ...state.phaseApprovals,
      ...(decisions.approvals as Record<string, boolean>),
    };
  }

  return updates;
}

// ============================================================================
// Interrupt Nodes
// ============================================================================

/**
 * Create interrupt node for human review
 */
function createInterruptNode(phaseName: string) {
  return async (
    state: HumanLoopExtractionState
  ): Promise<Partial<HumanLoopExtractionState>> => {
    console.log(`⏸️  [HITL] Interrupting after ${phaseName} phase...`);

    // Prepare review data
    const reviewData = prepareReviewData(state, phaseName);

    console.log(
      `   Entities: ${reviewData.entities?.length || 0}, Relationships: ${reviewData.relationships?.length || 0}`
    );

    // Interrupt execution - waits for user input
    const userDecisions = interrupt(reviewData);

    console.log(`▶️  [HITL] Resuming from ${phaseName} interrupt...`);

    // Process user decisions
    const updates = processUserDecisions(state, userDecisions);

    return {
      ...updates,
      currentPhase: `${phaseName}_complete`,
      reviewData,
    };
  };
}

// ============================================================================
// Phase Wrapper Nodes
// ============================================================================

/**
 * Wrapper that applies user corrections before phase execution
 */
function createPhaseWrapperNode(
  phaseNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>,
  phaseName: string
) {
  return async (
    state: HumanLoopExtractionState
  ): Promise<Partial<HumanLoopExtractionState>> => {
    // Apply entity merges to discovered entities
    if (phaseName === "structure" && state.entityMergeMap.size > 0) {
      const mergedDiscovered = new Map<string, string[]>();

      for (const [type, names] of state.discoveredEntities.entries()) {
        const filteredNames = names.filter((name) => {
          const uid = `${type}:${name}`;
          return !state.entityMergeMap.has(uid);
        });
        if (filteredNames.length > 0) {
          mergedDiscovered.set(type, filteredNames);
        }
      }

      state = { ...state, discoveredEntities: mergedDiscovered };
    }

    // Apply field corrections to structured entities
    if (
      phaseName === "enrich" &&
      Object.keys(state.fieldCorrections).length > 0
    ) {
      const correctedEntities = applyFieldCorrections(
        state.structuredEntities,
        state.fieldCorrections
      );
      state = { ...state, structuredEntities: correctedEntities };
    }

    // Execute phase
    const result = await phaseNode(state);

    return {
      ...result,
      currentPhase: phaseName,
    };
  };
}

// ============================================================================
// Finalize Node
// ============================================================================

async function finalizeNode(
  state: HumanLoopExtractionState
): Promise<Partial<HumanLoopExtractionState>> {
  console.log("✅ [HITL] Finalizing extraction...");

  // Apply any final corrections
  let finalEntities = state.enrichedEntities;
  if (Object.keys(state.fieldCorrections).length > 0) {
    finalEntities = applyFieldCorrections(
      finalEntities,
      state.fieldCorrections
    );
  }

  // Create bundle-ready data
  const reviewData: ReviewData = {
    phase: "finalize",
    timestamp: new Date().toISOString(),
    entities: Array.from(finalEntities.values()).map((e) => ({
      uid: e.uid,
      name: e.name,
      type: e.type,
    })),
    relationships: state.relationships.map((r) => ({
      uid: `${r.source_uid}_${r.relationship_type}_${r.target_uid}`,
      type: r.relationship_type,
      source: r.source_uid,
      target: r.target_uid,
      confidence: r.confidence,
    })),
    stats: {
      totalEntities: finalEntities.size,
      totalRelationships: state.relationships.length,
      userCorrections: state.userActions.length,
      mergesApplied: state.entityMergeMap.size,
    },
  };

  console.log(
    `   Final: ${finalEntities.size} entities, ${state.relationships.length} relationships`
  );
  console.log(`   User corrections: ${state.userActions.length}`);
  console.log(`   Merges applied: ${state.entityMergeMap.size}`);

  return {
    enrichedEntities: finalEntities,
    reviewData,
    currentPhase: "complete",
  };
}

// ============================================================================
// Graph Construction
// ============================================================================

/**
 * Build human-in-the-loop extraction graph
 */
export function buildHumanLoopExtractionGraph(options?: {
  // Import phase nodes from multi-phase-extraction
  discoverNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>;
  structureNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>;
  enrichNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>;
  relateNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>;
  annotationNode: (
    state: HumanLoopExtractionState
  ) => Promise<Partial<HumanLoopExtractionState>>;
}) {
  if (!options) {
    throw new Error(
      "Phase nodes must be provided. Import from multi-phase-extraction.ts"
    );
  }

  const workflow = new StateGraph(HumanLoopExtractionStateAnnotation)
    // Phase nodes with wrappers
    .addNode(
      "discover",
      createPhaseWrapperNode(options.discoverNode, "discover")
    )
    .addNode("awaitDiscoverReview", createInterruptNode("discover"))
    .addNode(
      "structure",
      createPhaseWrapperNode(options.structureNode, "structure")
    )
    .addNode("awaitStructureReview", createInterruptNode("structure"))
    .addNode("enrich", createPhaseWrapperNode(options.enrichNode, "enrich"))
    .addNode("awaitEnrichReview", createInterruptNode("enrich"))
    .addNode("relate", createPhaseWrapperNode(options.relateNode, "relate"))
    .addNode("awaitRelateReview", createInterruptNode("relate"))
    .addNode("finalize", finalizeNode);

  // Linear flow with interrupts
  workflow.addEdge(START, "discover");
  workflow.addEdge("discover", "awaitDiscoverReview");
  workflow.addEdge("awaitDiscoverReview", "structure");
  workflow.addEdge("structure", "awaitStructureReview");
  workflow.addEdge("awaitStructureReview", "enrich");
  workflow.addEdge("enrich", "awaitEnrichReview");
  workflow.addEdge("awaitEnrichReview", "relate");
  workflow.addEdge("relate", "awaitRelateReview");
  workflow.addEdge("awaitRelateReview", "finalize");
  workflow.addEdge("finalize", END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
