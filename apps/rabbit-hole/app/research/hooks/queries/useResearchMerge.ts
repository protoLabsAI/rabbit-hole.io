"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { mergeResearchToNeo4j, isActionSuccess } from "../../actions";
import type { ResearchBundle } from "../../lib/bundle-validator";

/**
 * React Query hook for merging research data to Neo4j
 *
 * Handles optimistic updates, error handling, and cache invalidation
 * for the research merge operation.
 */
export function useMergeResearch() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (bundle: ResearchBundle) => mergeResearchToNeo4j(bundle),
    onMutate: async () => {
      // Could add optimistic updates here if needed
      return {};
    },
    onSuccess: (result) => {
      if (!isActionSuccess(result)) {
        toast.error(result.error || "Merge failed");
        return;
      }

      const { results } = result.data;

      // Invalidate any cached graph/atlas data
      queryClient.invalidateQueries({ queryKey: ["atlas"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });

      // Success toast with details and link to Atlas
      toast.success("Research merged to Neo4j", {
        description: `Created ${results.entities.created} entities, ${results.relationships.created} relationships. View in Atlas.`,
        action: {
          label: "View Atlas",
          onClick: () => {
            router.push("/atlas");
          },
        },
      });
    },
    onError: (error) => {
      console.error("Merge failed:", error);
      toast.error("Failed to merge research data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
