"use client";

// Stub hook - local implementation
function useUserStats() {
  return {
    stats: {
      entitiesViewed: 0,
      queriesRun: 0,
      graphsCreated: 0,
      lastVisited: null,
    },
    isLoading: false,
  };
}

/**
 * User Statistics Page Component
 *
 * Displays user activity statistics from Clerk privateMetadata
 * Used as a custom page in ThemedUserButton
 */
export function UserStatsPage() {
  const { stats, isLoading } = useUserStats();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-20 bg-muted animate-pulse rounded" />
        <div className="h-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Activity Stats
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your usage and engagement
        </p>
      </div>

      <div className="space-y-4">
        {/* Entities Viewed */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entities Viewed</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.entitiesViewed.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">👁️</div>
          </div>
        </div>

        {/* Queries Run */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Queries Run</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.queriesRun.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">🔍</div>
          </div>
        </div>

        {/* Graphs Created */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Graphs Created</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.graphsCreated.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        {/* Last Visited */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Last Visited</p>
            <p className="text-lg font-medium text-foreground">
              {formatDate(stats.lastVisited)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
