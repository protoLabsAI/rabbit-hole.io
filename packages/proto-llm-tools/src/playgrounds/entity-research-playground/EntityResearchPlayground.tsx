"use client";

import { useState, useCallback } from "react";

import { ALL_ENTITY_TYPES } from "@proto/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@proto/ui/atoms";

import { ForceGraph } from "./components/ForceGraph";

/**
 * Entity Research Playground
 *
 * Interactive entity extraction with force-directed graph visualization.
 * Simplified version without CopilotKit for standalone testing.
 */
export function EntityResearchPlayground() {
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<string>("Person");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = useCallback(async () => {
    if (!entityName.trim()) {
      setError("Entity name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/entity-research-playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName,
          entityType,
          researchDepth: "basic",
          skipReview: true,
        }),
      });

      const result = await response.json();

      if (result.success && result.entity) {
        setEntities((prev) => [...prev, result.entity]);
        setEntityName("");
      } else {
        setError(result.errors?.join(", ") || "Extraction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [entityName, entityType]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">Entity Research Playground</h1>
        <p className="text-sm text-muted-foreground">
          Extract entities with AI and visualize as force-directed graph
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Controls */}
        <div className="w-80 border-r p-4 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Extract Entity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Entity Name</label>
                <Input
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="e.g., Albert Einstein"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  disabled={isLoading}
                  className="w-full border rounded px-3 py-2"
                >
                  {ALL_ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <Button
                onClick={handleExtract}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Extracting..." : "Extract Entity"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No entities yet
                  </p>
                ) : (
                  entities.map((entity) => (
                    <div
                      key={entity.uid}
                      className="text-sm p-2 border rounded"
                    >
                      <div className="font-medium">{entity.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entity.type}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Force Graph */}
        <div className="flex-1 relative">
          <ForceGraph entities={entities} relationships={relationships} />

          {/* Stats Overlay */}
          <div className="absolute top-4 left-4 bg-background/90 border rounded-lg px-4 py-2">
            <div className="text-sm space-y-1">
              <div className="font-semibold">Graph Stats</div>
              <div className="text-muted-foreground">
                Entities: {entities.length}
              </div>
              <div className="text-muted-foreground">
                Relationships: {relationships.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
