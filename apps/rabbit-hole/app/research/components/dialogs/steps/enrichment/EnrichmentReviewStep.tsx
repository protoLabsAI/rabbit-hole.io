"use client";

import { useState, useMemo, useCallback } from "react";

import { Badge, Button, Checkbox } from "@proto/ui/atoms";

interface FieldDiff {
  field: string;
  type: "added" | "changed" | "unchanged";
  oldValue: any;
  newValue: any;
}

interface EnrichmentReviewStepProps {
  entity: {
    uid: string;
    name: string;
    type: string;
    properties?: Record<string, any>;
  };
  enrichedProperties: Record<string, any>;
  fieldsFound: string[];
  fieldsNotFound: string[];
  wikipediaUrl: string;
  onBack: () => void;
  onConfirm: (selectedFields: Record<string, any>) => void;
}

function humanizeFieldName(field: string): string {
  const labels: Record<string, string> = {
    birthDate: "Birth Date",
    deathDate: "Death Date",
    birthPlace: "Birth Place",
    ceo: "CEO",
    founded: "Founded",
    headquarters: "Headquarters",
  };
  return labels[field] || field.replace(/([A-Z])/g, " $1").trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === "") {
    return "(empty)";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[]";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function calculateDiffs(
  entity: { properties?: Record<string, any> },
  enrichedProperties: Record<string, any>,
  fieldsFound: string[]
): FieldDiff[] {
  return fieldsFound.map((field) => {
    const oldValue = entity.properties?.[field];
    const newValue = enrichedProperties[field];

    let type: "added" | "changed" | "unchanged" = "unchanged";

    if (oldValue === undefined || oldValue === null || oldValue === "") {
      type = "added";
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      type = "changed";
    }

    return { field, type, oldValue, newValue };
  });
}

export function EnrichmentReviewStep({
  entity,
  enrichedProperties,
  fieldsFound,
  fieldsNotFound,
  wikipediaUrl,
  onBack,
  onConfirm,
}: EnrichmentReviewStepProps) {
  const [selectedFieldsMap, setSelectedFieldsMap] = useState<
    Record<string, boolean>
  >(() => {
    const map: Record<string, boolean> = {};
    fieldsFound.forEach((field) => {
      map[field] = true;
    });
    return map;
  });

  const diffs = useMemo(
    () => calculateDiffs(entity, enrichedProperties, fieldsFound),
    [entity, enrichedProperties, fieldsFound]
  );

  const handleConfirm = useCallback(() => {
    const approvedProperties: Record<string, any> = {};

    Object.entries(selectedFieldsMap).forEach(([field, isSelected]) => {
      if (isSelected && enrichedProperties[field] !== undefined) {
        approvedProperties[field] = enrichedProperties[field];
      }
    });

    if (enrichedProperties._enrichedFrom) {
      approvedProperties._enrichedFrom = enrichedProperties._enrichedFrom;
      approvedProperties._enrichedAt = enrichedProperties._enrichedAt;
      approvedProperties._wikipediaUrl = enrichedProperties._wikipediaUrl;
    }

    onConfirm(approvedProperties);
  }, [selectedFieldsMap, enrichedProperties, onConfirm]);

  const selectedCount = Object.values(selectedFieldsMap).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="text-sm font-medium">Wikipedia Data Retrieved</div>
        <div className="text-xs text-muted-foreground">
          Source:{" "}
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {wikipediaUrl}
          </a>
        </div>
        <div className="text-xs text-muted-foreground">
          Found {fieldsFound.length} fields • {fieldsNotFound.length} not found
        </div>
      </div>

      <div className="flex justify-between items-center py-2 border-b">
        <div className="text-sm text-muted-foreground">
          {selectedCount} of {fieldsFound.length} fields will be applied
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const map: Record<string, boolean> = {};
              fieldsFound.forEach((f) => {
                map[f] = true;
              });
              setSelectedFieldsMap(map);
            }}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const map: Record<string, boolean> = {};
              fieldsFound.forEach((f) => {
                map[f] = false;
              });
              setSelectedFieldsMap(map);
            }}
          >
            Deselect All
          </Button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {diffs.map((diff, index) => {
          const field = diff.field;
          const isSelected = selectedFieldsMap[field] ?? false;

          return (
            <div
              key={index}
              className={`rounded-lg border p-3 ${
                isSelected
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-muted opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() =>
                    setSelectedFieldsMap((prev) => ({
                      ...prev,
                      [field]: !prev[field],
                    }))
                  }
                />
                <div className="flex-1">
                  <div className="font-medium mb-1 capitalize">
                    {humanizeFieldName(field)}
                  </div>
                  <div className="text-sm space-y-1">
                    {diff.type === "added" && (
                      <>
                        <div className="text-muted-foreground">
                          Current: (empty)
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          New: {formatValue(diff.newValue)}
                        </div>
                      </>
                    )}
                    {diff.type === "changed" && (
                      <>
                        <div className="text-muted-foreground">
                          Current: {formatValue(diff.oldValue)}
                        </div>
                        <div className="text-amber-600 dark:text-amber-400">
                          New: {formatValue(diff.newValue)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant={diff.type === "added" ? "default" : "secondary"}
                >
                  {diff.type}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Config
        </Button>
        <Button onClick={handleConfirm} disabled={selectedCount === 0}>
          Apply {selectedCount} Field{selectedCount !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
