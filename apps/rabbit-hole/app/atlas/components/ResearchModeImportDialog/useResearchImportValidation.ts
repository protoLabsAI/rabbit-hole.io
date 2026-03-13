/**
 * Research Import Validation Hook
 *
 * Fetches tier limits and ego network preview, calculates validation state.
 */

import { useState, useEffect } from "react";

interface ValidationOptions {
  entityUid: string;
  hops: number;
  nodeLimit: number;
  entityTypes: string[] | null;
  sentiments: string[] | null;
  enabled?: boolean;
}

interface LimitCheck {
  current: number;
  incoming: number;
  afterImport: number;
  max: number;
  wouldExceed: boolean;
  exceedBy: number;
}

export interface ImportValidation {
  allowed: boolean;
  preview: {
    entities: number;
    relationships: number;
    entityTypeBreakdown: Record<string, number>;
  };
  limits: {
    entities: LimitCheck;
    relationships: LimitCheck;
  };
  tier: string;
  upgradeUrl: string;
}

export function useResearchImportValidation(options: ValidationOptions) {
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.enabled || !options.entityUid) {
      setValidation(null);
      return;
    }

    // Create abort controller for this effect run
    const abortController = new AbortController();

    const validate = async () => {
      // Check if already aborted before starting
      if (abortController.signal.aborted) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch tier limits and preview in parallel with abort signal
        const [limitsResponse, previewResponse] = await Promise.all([
          fetch("/api/v1/tenant/limits", { signal: abortController.signal }),
          fetch(
            `/api/graph-tiles/ego/${options.entityUid}?hops=${options.hops}&nodeLimit=${options.nodeLimit}`,
            { signal: abortController.signal }
          ),
        ]);

        // Check if aborted after fetch completes
        if (abortController.signal.aborted) return;

        if (!limitsResponse.ok) {
          throw new Error("Failed to fetch tier limits");
        }

        if (!previewResponse.ok) {
          throw new Error("Failed to fetch ego network preview");
        }

        const limitsData = await limitsResponse.json();
        const previewData = await previewResponse.json();

        // Check if aborted after JSON parsing
        if (abortController.signal.aborted) return;

        if (!limitsData.success) {
          throw new Error("Tier limits fetch unsuccessful");
        }

        if (!previewData.success) {
          throw new Error("Preview fetch unsuccessful");
        }

        // Extract counts
        const incomingEntities = previewData.data.meta.nodeCount;
        const incomingRelationships = previewData.data.meta.edgeCount;

        // Calculate validation
        const entityCheck = calculateLimitCheck(
          limitsData.usage.entities,
          incomingEntities
        );

        const relationshipCheck = calculateLimitCheck(
          limitsData.usage.relationships,
          incomingRelationships
        );

        // Calculate entity type breakdown
        const entityTypeBreakdown: Record<string, number> = {};
        previewData.data.nodes.forEach((node: any) => {
          const type = node.type;
          entityTypeBreakdown[type] = (entityTypeBreakdown[type] || 0) + 1;
        });

        // Final check before updating state
        if (abortController.signal.aborted) return;

        setValidation({
          allowed: !entityCheck.wouldExceed && !relationshipCheck.wouldExceed,
          preview: {
            entities: incomingEntities,
            relationships: incomingRelationships,
            entityTypeBreakdown,
          },
          limits: {
            entities: entityCheck,
            relationships: relationshipCheck,
          },
          tier: limitsData.tier,
          upgradeUrl: limitsData.upgradeUrl || "/pricing",
        });
      } catch (err) {
        // Don't update state if request was aborted
        if (abortController.signal.aborted) return;

        // Ignore AbortError from fetch cancellation
        if (err instanceof Error && err.name === "AbortError") return;

        setError(err instanceof Error ? err.message : "Validation failed");
      } finally {
        // Only clear loading if not aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validate, 300);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [
    options.enabled,
    options.entityUid,
    options.hops,
    options.nodeLimit,
    options.entityTypes,
    options.sentiments,
  ]);

  return { validation, isLoading, error };
}

function calculateLimitCheck(
  usage: { current: number; max: number },
  incoming: number
): LimitCheck {
  const current = usage.current;
  const max = usage.max;
  const afterImport = current + incoming;

  return {
    current,
    incoming,
    afterImport,
    max,
    wouldExceed: max !== -1 && afterImport > max,
    exceedBy: max !== -1 ? Math.max(0, afterImport - max) : 0,
  };
}
