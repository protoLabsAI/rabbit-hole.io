"use client";

import { Icon } from "@protolabsai/icon-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@protolabsai/ui";

import type { Entity } from "../../../workflows/multi-phase-extraction";

interface EntitySidebarProps {
  selectedEntity: Entity | null;
  allEntities: Record<string, Entity> | undefined;
  onEntityClick: (entity: Entity) => void;
  onAddToGraph: (entity: Entity) => void;
  onReExtract: (entity: Entity) => void;
}

export function EntitySidebar({
  selectedEntity,
  allEntities,
  onEntityClick,
  onAddToGraph,
  onReExtract,
}: EntitySidebarProps) {
  if (!selectedEntity) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click on a highlighted entity to view details
            </p>

            {allEntities && Object.keys(allEntities).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Extracted Entities ({Object.keys(allEntities).length})
                </h3>
                <div className="space-y-2">
                  {Object.values(allEntities).map((entity) => (
                    <button
                      key={entity.uid}
                      onClick={() => onEntityClick(entity)}
                      className="w-full text-left p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{entity.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entity.type}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(
                            ((entity as unknown as { _confidence?: number })
                              ._confidence || 0.85) * 100
                          )}
                          %
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidence =
    (selectedEntity as unknown as { _confidence?: number })._confidence || 0.85;
  const confidenceBadgeVariant =
    confidence > 0.9
      ? "default"
      : confidence > 0.75
        ? "secondary"
        : "destructive";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{selectedEntity.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedEntity.type}
            </p>
          </div>
          <Badge variant={confidenceBadgeVariant}>
            {Math.round(confidence * 100)}% confident
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-4">
        {/* Core Data */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Core Data</h3>
          <div className="space-y-2">
            <FieldDisplay label="UID" value={selectedEntity.uid} />
            <FieldDisplay label="Type" value={selectedEntity.type} />
            <FieldDisplay label="Name" value={selectedEntity.name} />
          </div>
        </div>

        {/* Additional Fields */}
        {Object.entries(selectedEntity).some(
          ([key]) =>
            ![
              "uid",
              "type",
              "name",
              "_confidence",
              "_extraction_text",
            ].includes(key)
        ) && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Additional Details</h3>
            <div className="space-y-2">
              {Object.entries(selectedEntity)
                .filter(
                  ([key]) =>
                    ![
                      "uid",
                      "type",
                      "name",
                      "_confidence",
                      "_extraction_text",
                    ].includes(key)
                )
                .map(([key, value]) => (
                  <FieldDisplay key={key} label={key} value={value} />
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button
            onClick={() => onAddToGraph(selectedEntity)}
            className="w-full"
          >
            <Icon name="database" className="mr-2 h-4 w-4" />
            Add to Knowledge Graph
          </Button>

          <Button
            variant="outline"
            onClick={() => onReExtract(selectedEntity)}
            className="w-full"
          >
            <Icon name="refresh-cw" className="mr-2 h-4 w-4" />
            Re-extract with More Context
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldDisplay({ label, value }: { label: string; value: unknown }) {
  const displayValue =
    typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value || "—");

  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground capitalize">
        {label.replace(/_/g, " ")}:{" "}
      </span>
      <span className="text-foreground">{displayValue}</span>
    </div>
  );
}
