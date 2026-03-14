import { useCallback, useState } from "react";

export interface UserStats {
  entitiesViewed: number;
  lastVisited: string | null;
  queriesRun: number;
  graphsCreated: number;
}

const DEFAULT_STATS: UserStats = {
  entitiesViewed: 0,
  lastVisited: null,
  queriesRun: 0,
  graphsCreated: 0,
};

/**
 * Hook for reading and writing user statistics to Clerk privateMetadata
 *
 * Usage:
 * ```tsx
 * const { stats, updateStats, isLoading } = useUserStats();
 *
 * // Track entity view
 * updateStats({ entitiesViewed: stats.entitiesViewed + 1 });
 *
 * // Update last visited
 * updateStats({ lastVisited: new Date().toISOString() });
 * ```
 */
export function useUserStats() {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const isLoaded = true;
  const [isUpdating, setIsUpdating] = useState(false);

  // Extract stats from privateMetadata
  const stats: UserStats = {
    ...DEFAULT_STATS,
    ...((user as any)?.privateMetadata?.stats as
      | Partial<UserStats>
      | undefined),
  };

  /**
   * Update user statistics in Clerk
   * Server-side API call required for privateMetadata updates
   */
  const updateStats = useCallback(
    async (updates: Partial<UserStats>) => {
      if (!user?.id) {
        throw new Error("User must be signed in to update stats");
      }

      setIsUpdating(true);

      try {
        const response = await fetch("/api/user/stats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update stats");
        }

        // Trigger user reload to get fresh metadata
        await user.reload();

        return await response.json();
      } catch (error) {
        console.error("Failed to update user stats:", error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [user]
  );

  /**
   * Increment a numeric stat by 1
   */
  const incrementStat = useCallback(
    async (
      key: keyof Pick<
        UserStats,
        "entitiesViewed" | "queriesRun" | "graphsCreated"
      >
    ) => {
      return updateStats({ [key]: stats[key] + 1 });
    },
    [stats, updateStats]
  );

  /**
   * Update last visited timestamp
   */
  const updateLastVisited = useCallback(async () => {
    return updateStats({ lastVisited: new Date().toISOString() });
  }, [updateStats]);

  return {
    stats,
    updateStats,
    incrementStat,
    updateLastVisited,
    isLoading: !isLoaded,
    isUpdating,
    isSignedIn: !!user,
  };
}
