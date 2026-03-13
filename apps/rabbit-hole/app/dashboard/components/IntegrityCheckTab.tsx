/**
 * Data Integrity Check Tab
 *
 * Monitors and fixes data integrity issues in the knowledge graph.
 * Provides automated checks and guided repair actions.
 * Theme-aware styling following whitelabel strategy.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@proto/ui/atoms";

interface IntegrityIssue {
  type:
    | "orphaned_file"
    | "broken_relationship"
    | "missing_processing_state"
    | "inconsistent_metadata";
  severity: "critical" | "warning" | "info";
  entity: {
    uid: string;
    name?: string;
    type: string;
  };
  description: string;
  suggestedAction: string;
  affectedCount?: number;
}

interface IntegrityCheckData {
  issues: IntegrityIssue[];
  summary: {
    totalIssues: number;
    critical: number;
    warnings: number;
    info: number;
    lastChecked: string;
  };
  systemHealth: {
    score: number;
    status: "healthy" | "degraded" | "critical";
  };
}

export function IntegrityCheckTab() {
  const [data, setData] = useState<IntegrityCheckData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState<Record<string, boolean>>({});

  const runIntegrityCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/system/integrity-check");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to run integrity check");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-run check on mount
  useEffect(() => {
    runIntegrityCheck();
  }, [runIntegrityCheck]);

  const handleFixIssues = async (issueType: string, entityUids: string[]) => {
    setIsFixing((prev) => ({ ...prev, [issueType]: true }));

    try {
      const response = await fetch("/api/system/integrity-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueType,
          entityUids,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Fixed ${result.data.fixedCount} ${issueType} issues`);
        // Re-run integrity check to update results
        await runIntegrityCheck();
      } else {
        setError(result.error || "Failed to fix issues");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix operation failed");
    } finally {
      setIsFixing((prev) => ({ ...prev, [issueType]: false }));
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-success";
      case "degraded":
        return "text-warning";
      case "critical":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-error/20 text-error border-error/50";
      case "warning":
        return "bg-warning/20 text-warning border-warning/50";
      case "info":
        return "bg-info/20 text-info border-info/50";
      default:
        return "bg-secondary/20 text-secondary-foreground border-secondary/50";
    }
  };

  // Group issues by type for easier management
  const issuesByType =
    data?.issues.reduce(
      (acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
      },
      {} as Record<string, IntegrityIssue[]>
    ) || {};

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Integrity Check</CardTitle>
              <CardDescription>
                Automated validation of knowledge graph data consistency
              </CardDescription>
            </div>
            <Button onClick={runIntegrityCheck} disabled={isLoading}>
              {isLoading ? "Checking..." : "Run Check"}
            </Button>
          </div>
        </CardHeader>

        {data && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="rounded-lg border border-border bg-card p-4 md:col-span-2">
                <div
                  className={`text-3xl font-bold ${getHealthColor(data.systemHealth.status)}`}
                >
                  {data.systemHealth.score}/100
                </div>
                <div className="text-sm text-muted-foreground">
                  System Health Score
                </div>
                <div
                  className={`text-xs ${getHealthColor(data.systemHealth.status)} mt-1 uppercase`}
                >
                  {data.systemHealth.status}
                </div>
              </div>
              <div className="rounded-lg border border-error/30 bg-error/10 p-4">
                <div className="text-2xl font-bold text-error">
                  {data.summary.critical}
                </div>
                <div className="text-sm text-error/80">Critical Issues</div>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <div className="text-2xl font-bold text-warning">
                  {data.summary.warnings}
                </div>
                <div className="text-sm text-warning/80">Warnings</div>
              </div>
              <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                <div className="text-2xl font-bold text-info">
                  {data.summary.info}
                </div>
                <div className="text-sm text-info/80">Info</div>
              </div>
            </div>

            {data.summary.lastChecked && (
              <div className="text-xs text-muted-foreground mt-4">
                Last checked:{" "}
                {new Date(data.summary.lastChecked).toLocaleString()}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-error font-medium">Error:</span>
            <div className="text-error/90">{error}</div>
          </div>
        </div>
      )}

      {/* Issues by Type */}
      {data && Object.keys(issuesByType).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(issuesByType).map(([issueType, issues]) => (
            <Card key={issueType}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">
                      {issueType.replace(/_/g, " ")} Issues ({issues.length})
                    </CardTitle>
                    <CardDescription>
                      {issues[0]?.suggestedAction}
                    </CardDescription>
                  </div>

                  {issueType === "missing_processing_state" && (
                    <Button
                      onClick={() =>
                        handleFixIssues(
                          issueType,
                          issues.map((i) => i.entity.uid)
                        )
                      }
                      disabled={isFixing[issueType]}
                      size="sm"
                    >
                      {isFixing[issueType]
                        ? "Fixing..."
                        : `Fix All (${issues.length})`}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {issues.slice(0, 10).map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSeverityColor(issue.severity)}`}
                          >
                            {issue.severity}
                          </Badge>
                          <span className="text-sm font-medium text-foreground truncate">
                            {issue.entity.name || issue.entity.uid}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {issue.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {issue.suggestedAction}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(issue.entity.uid)
                        }
                        title="Copy UID"
                        className="ml-2"
                      >
                        📋
                      </Button>
                    </div>
                  ))}

                  {issues.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center p-2">
                      +{issues.length - 10} more issues (showing first 10)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.issues.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-success mb-2">
            No Integrity Issues Found
          </h3>
          <p className="text-success/80">
            Your knowledge graph data is consistent and healthy.
          </p>
        </div>
      ) : null}
    </div>
  );
}
