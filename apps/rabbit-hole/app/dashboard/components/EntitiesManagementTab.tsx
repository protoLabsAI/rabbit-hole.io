/**
 * Entities Management Tab
 *
 * Entity management interface with:
 * - Entity listing from Yjs workspace (research graph canvas)
 * - Admin can view Neo4j entities system-wide
 * - Tier limit tracking and warnings
 * - Type and status filtering
 * - Theme-aware styling following whitelabel strategy
 */

"use client";

import { ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useState } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { Icon } from "@proto/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";
import {
  DataTable,
  createSortableHeader,
} from "@proto/ui/organisms/data-table";

interface EntityWithMetadata {
  uid: string;
  type: string;
  name: string;
  tags: string[];
  aliases: string[];
  createdAt: string;
  status?: string;
  relationshipCount: number;
}

interface EntityStatistics {
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalRelationships: number;
}

interface TierInfo {
  currentCount: number;
  maxCount: number;
  percentUsed: number;
  tier: string;
}

interface EntitiesManagementTabProps {
  workspaceId: string;
}

export function EntitiesManagementTab({
  workspaceId,
}: EntitiesManagementTabProps) {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
=======
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
>>>>>>> origin/main
  const [entities, setEntities] = useState<EntityWithMetadata[]>([]);
  const [statistics, setStatistics] = useState<EntityStatistics | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check if user is admin
  const isAdmin =
    user?.emailAddresses[0]?.emailAddress === "josh@rabbit-hole.io" ||
    user?.emailAddresses[0]?.emailAddress === "admin@rabbit-hole.io";

  // Get user tier for limits
  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);

  // Load entities from Yjs workspace (regular users) or Neo4j (admin)
  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        // Admin: Load from Neo4j API
        const params = new URLSearchParams();
        if (workspaceId) {
          params.set("workspaceId", workspaceId);
        }
        if (entityTypeFilter && entityTypeFilter !== "all") {
          params.set("entityType", entityTypeFilter);
        }
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        params.set("limit", "100");

        const response = await fetch(
          `/api/entities/management?${params.toString()}`
        );
        const result = await response.json();

        if (result.success) {
          setEntities(result.data.entities);
          setStatistics(result.data.statistics);
          setTierInfo(result.data.tierInfo);
        } else {
          setError(result.error || "Failed to load entities");
        }
      } else {
        // Regular user: Load from Yjs workspace
        if (!user?.id) {
          setError("User ID required");
          setIsLoading(false);
          return;
        }

        // Note: Local-only workspace loading - persistence removed per unified Hocuspocus architecture
        // For now, skip local loading and show message to admin
        setError(
          "Local workspace loading deprecated. Use admin API view instead."
        );
        setIsLoading(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [
    workspaceId,
    entityTypeFilter,
    statusFilter,
    isAdmin,
    user,
    userTier,
    tierLimits,
  ]);

  // Load entities on mount and filter changes
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Define columns for DataTable
  const columns: ColumnDef<EntityWithMetadata>[] = [
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: createSortableHeader("Type"),
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-primary/10 text-primary">
          {row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "uid",
      header: "UID",
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">
          {row.getValue("uid")}
        </code>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[];
        if (!tags || tags.length === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-secondary/50"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-secondary/50">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created"),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string | undefined;
        return (
          <span className="text-sm text-muted-foreground">
            {date ? new Date(date).toLocaleDateString() : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string | undefined;
        const statusColors: Record<string, string> = {
          active: "bg-success/20 text-success border-success/50",
          historical: "bg-info/20 text-info border-info/50",
          inactive: "bg-warning/20 text-warning border-warning/50",
          defunct: "bg-error/20 text-error border-error/50",
        };
        return (
          <Badge
            variant="outline"
            className={statusColors[status || "active"] || ""}
          >
            {status || "active"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "relationshipCount",
      header: "Links",
      cell: ({ row }) => {
        const count = row.getValue("relationshipCount") as number;
        return (
          <span className="text-sm text-muted-foreground">
            {count > 0 ? `${count} links` : "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(row.original.uid);
            }}
            title="Copy UID"
          >
            <Icon name="Copy" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/atlas?focus=${row.original.uid}`, "_blank");
            }}
            title="View in Atlas"
          >
            <Icon name="ExternalLink" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-error hover:text-error"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Delete entity:", row.original.uid);
              // TODO: Implement delete handler
            }}
            title="Delete entity"
          >
            <Icon name="Trash2" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate tier usage percentage
  const tierUsagePercent = tierInfo
    ? (tierInfo.currentCount / tierInfo.maxCount) * 100
    : 0;
  const isApproachingLimit = tierUsagePercent >= 80 && tierUsagePercent < 100;
  const isAtLimit = tierUsagePercent >= 100;

  return (
    <div className="space-y-6">
      {/* Header Card with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entity Management</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "System-wide entities from Neo4j database"
                  : "Entities from your research workspace"}
              </CardDescription>
            </div>
            <Button
              onClick={loadEntities}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        {/* Statistics */}
        {statistics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Entities */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold text-foreground">
                  {entities.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Entities
                </div>
              </div>

              {/* Tier Usage */}
              {tierInfo && (
                <div
                  className={
                    isAtLimit
                      ? "rounded-lg border border-error/30 bg-error/10 p-4"
                      : isApproachingLimit
                        ? "rounded-lg border border-warning/30 bg-warning/10 p-4"
                        : "rounded-lg border border-success/30 bg-success/10 p-4"
                  }
                >
                  <div
                    className={
                      isAtLimit
                        ? "text-2xl font-bold text-error"
                        : isApproachingLimit
                          ? "text-2xl font-bold text-warning"
                          : "text-2xl font-bold text-success"
                    }
                  >
                    {tierInfo.currentCount} / {tierInfo.maxCount}
                  </div>
                  <div
                    className={
                      isAtLimit
                        ? "text-sm text-error/80"
                        : isApproachingLimit
                          ? "text-sm text-warning/80"
                          : "text-sm text-success/80"
                    }
                  >
                    {tierInfo.tier} Tier ({Math.round(tierInfo.percentUsed)}%)
                  </div>
                </div>
              )}

              {/* By Type */}
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(statistics.byType).length}
                </div>
                <div className="text-sm text-primary/80">Entity Types</div>
              </div>

              {/* Total Relationships */}
              <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                <div className="text-2xl font-bold text-info">
                  {statistics.totalRelationships}
                </div>
                <div className="text-sm text-info/80">Relationships</div>
              </div>
            </div>

            {/* Tier Warning */}
            {tierInfo && tierInfo.percentUsed >= 90 && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
                <h4 className="font-medium text-warning mb-2">
                  {isAtLimit
                    ? "Entity Limit Reached"
                    : "Approaching Entity Limit"}
                </h4>
                <p className="text-sm text-warning/90 mb-3">
                  {isAtLimit
                    ? `You've reached your ${tierInfo.tier} tier limit (${tierInfo.maxCount} entities). Upgrade to add more entities.`
                    : `You've used ${Math.round(tierInfo.percentUsed)}% of your ${tierInfo.tier} tier limit.`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  Upgrade Plan
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Entity Type
              </label>
              <Select
                value={entityTypeFilter}
                onValueChange={setEntityTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entity types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Types{" "}
                    {statistics && `(${Object.keys(statistics.byType).length})`}
                  </SelectItem>
                  {statistics &&
                    Object.entries(statistics.byType)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([type, count]) => (
                        <SelectItem key={type} value={type}>
                          {type} ({count})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Status{" "}
                    {statistics &&
                      `(${Object.keys(statistics.byStatus).length})`}
                  </SelectItem>
                  {statistics &&
                    Object.entries(statistics.byStatus)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([status, count]) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)} (
                          {count})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-error">Error:</span>
            <div className="text-error/90">{error}</div>
          </div>
        </div>
      )}

      {/* Entities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Entities ({entities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              Loading entities...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={entities}
              searchKey="name"
              searchPlaceholder="Search entities by name..."
              emptyMessage="No entities found in this workspace."
              onRowClick={(entity) => {
                console.log("Entity clicked:", entity.uid);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
