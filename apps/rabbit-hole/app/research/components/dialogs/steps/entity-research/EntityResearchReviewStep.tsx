"use client";

import type Graph from "graphology";
import { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { Button, Badge } from "@proto/ui/atoms";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

export interface EntityResearchResult {
  entity: {
    uid: string;
    type: string;
    name: string;
    properties: Record<string, unknown>;
    _confidence: number;
  };
  entities?: Array<{
    uid: string;
    type: string;
    name: string;
    properties: Record<string, unknown>;
    _confidence: number;
  }>;
  relationships: Array<{
    uid: string;
    type: string;
    source: string;
    target: string;
  }>;
  wikipediaContent: string;
  source: string;
  bundle?: any; // Full bundle with evidence nodes
}

interface EntityResearchReviewStepProps {
  result: EntityResearchResult;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onBack: () => void;
  onConfirm: (entities: EntityResearchResult["entity"][]) => void;
}

export function EntityResearchReviewStep({
  result,
  graph,
  onBack,
  onConfirm,
}: EntityResearchReviewStepProps) {
  const allEntities = result.entities || [result.entity];
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    new Set(allEntities.map((e) => e.uid))
  );

  const handleConfirm = useCallback(() => {
    const entities = allEntities.filter((e) => selectedEntities.has(e.uid));
    onConfirm(entities);
  }, [allEntities, selectedEntities, onConfirm]);

  return (
    <div className="space-y-6">
      {/* Entity Cards - Show ALL entities */}
      <div className="space-y-3">
        {allEntities.map((entity) => {
          const propertyCount = Object.keys(entity.properties).filter(
            (k) => !k.startsWith("_")
          ).length;
          const exists = graph.hasNode(entity.uid);

          return (
            <div
              key={entity.uid}
              className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedEntities.has(entity.uid)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => {
                const newSet = new Set(selectedEntities);
                if (newSet.has(entity.uid)) {
                  newSet.delete(entity.uid);
                } else {
                  newSet.add(entity.uid);
                }
                setSelectedEntities(newSet);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{entity.name}</h3>
                    <Badge variant="secondary">{entity.type}</Badge>
                    {exists && (
                      <Badge variant="destructive">Already Exists</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{propertyCount} properties</span>
                    {result.relationships.length > 0 && (
                      <span>• {result.relationships.length} relationships</span>
                    )}
                  </div>

                  {/* Show some key properties */}
                  {Object.entries(entity.properties)
                    .filter(([key]) => !key.startsWith("_"))
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span>{" "}
                        <span className="text-muted-foreground">
                          {String(value).substring(0, 100)}
                          {String(value).length > 100 ? "..." : ""}
                        </span>
                      </div>
                    ))}
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    selectedEntities.has(entity.uid)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {selectedEntities.has(entity.uid) && (
                    <Icon name="check" className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Relationships Preview */}
      {result.relationships.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="text-sm font-medium">Discovered Relationships</h4>
          <div className="space-y-1">
            {result.relationships.slice(0, 5).map((rel, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                {result.entity.name} →{" "}
                <span className="font-medium">{rel.type}</span> → {rel.target}
              </div>
            ))}
            {result.relationships.length > 5 && (
              <p className="text-sm text-muted-foreground">
                +{result.relationships.length - 5} more...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wikipedia Source */}
      {result.wikipediaContent && (
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-medium">Source: Wikipedia</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {result.wikipediaContent.substring(0, 300)}...
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={selectedEntities.size === 0}>
          Import {selectedEntities.size > 0 && `(${selectedEntities.size})`}
        </Button>
      </div>
    </div>
  );
}
