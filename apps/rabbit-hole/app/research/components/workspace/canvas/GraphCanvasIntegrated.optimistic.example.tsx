/**
 * React 19 Optimistic Updates Example
 *
 * This file demonstrates how we COULD use useOptimistic for instant entity updates
 * Currently not implemented - for reference/future enhancement
 */

import type Graph from "graphology";
import { useOptimistic, useCallback, useTransition } from "react";

import { useToast } from "@proto/ui/hooks";

import type { GraphNodeAttributes } from "@/graph-visualizer/model/graph";

interface EntityUpdate {
  uid: string;
  updates: Partial<GraphNodeAttributes>;
}

/**
 * Example: Optimistic entity updates
 *
 * Benefits:
 * - Instant UI feedback (no waiting for graph update)
 * - Automatically reverts on error
 * - Smoother UX for collaborative editing
 *
 * Usage:
 * ```typescript
 * const { optimisticEntities, updateEntity } = useOptimisticEntityUpdates({
 *   graph,
 *   onGraphChange: handleGraphChange,
 * });
 *
 * // In render:
 * <GraphCanvas nodes={optimisticEntities} />
 *
 * // On update:
 * await updateEntity(entityUid, newData);
 * ```
 */
export function useOptimisticEntityUpdates({
  graph,
  onGraphChange,
}: {
  graph: Graph<GraphNodeAttributes>;
  onGraphChange: () => void;
}) {
  const { toast } = useToast();

  // Get current entities from graph
  const currentEntities = graph.nodes().map((nodeId) => ({
    id: nodeId,
    ...graph.getNodeAttributes(nodeId),
  }));

  // React 19: useOptimistic for instant UI updates
  const [optimisticEntities, addOptimisticUpdate] = useOptimistic(
    currentEntities,
    (entities, update: EntityUpdate) => {
      return entities.map((entity) =>
        entity.id === update.uid
          ? { ...entity, ...update.updates, _optimistic: true }
          : entity
      );
    }
  );

  const updateEntity = useCallback(
    async (uid: string, updates: Partial<GraphNodeAttributes>) => {
      // 1. Optimistic update (instant UI feedback)
      addOptimisticUpdate({ uid, updates });

      // 2. Actual graph mutation (async)
      try {
        graph.mergeNodeAttributes(uid, updates);
        onGraphChange();

        toast({
          title: "Entity Updated",
          description: "Changes saved successfully",
        });
      } catch (error) {
        // Optimistic update automatically reverts on error
        toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        throw error;
      }
    },
    [graph, onGraphChange, toast, addOptimisticUpdate]
  );

  return {
    optimisticEntities,
    updateEntity,
  };
}

/**
 * Alternative Pattern: useTransition for Heavy Diff Calculation
 *
 * If diff calculation becomes expensive (many fields, complex comparison),
 * we can mark it as non-urgent using useTransition
 */
export function useDiffTransition() {
  const [isPending, startTransition] = useTransition();

  const showDiffWithTransition = useCallback(
    (oldData: any, newData: any, callback: (diff: any) => void) => {
      startTransition(() => {
        // Heavy diff calculation
        const diff = calculateExpensiveDiff(oldData, newData);
        callback(diff);
      });
    },
    []
  );

  return { isPending, showDiffWithTransition };
}

function calculateExpensiveDiff(oldData: any, newData: any) {
  // Placeholder for expensive diff calculation
  // Could include deep object comparison, array diffing, etc.
  return { oldData, newData };
}
