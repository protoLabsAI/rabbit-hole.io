"use client";

import { useState, useMemo } from "react";

import { getEnrichmentFieldsForEntity } from "@protolabsai/types";
import {
  Badge,
  Button,
  Checkbox,
  Label,
  Textarea,
} from "@protolabsai/ui/atoms";

export interface EnrichmentConfig {
  selectedFields: string[];
  context?: string;
}

interface EnrichmentConfigStepProps {
  entity: {
    uid: string;
    name: string;
    type: string;
    properties?: Record<string, any>;
  };
  onConfirm: (config: EnrichmentConfig) => void;
  onCancel: () => void;
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

export function EnrichmentConfigStep({
  entity,
  onConfirm,
  onCancel,
}: EnrichmentConfigStepProps) {
  const availableFields = useMemo(
    () => getEnrichmentFieldsForEntity(entity.type, "social"),
    [entity.type]
  );

  const emptyFields = useMemo(
    () => availableFields.filter((f) => !entity.properties?.[f]),
    [availableFields, entity.properties]
  );

  const [selectedFields, setSelectedFields] = useState<string[]>(emptyFields);
  const [context, setContext] = useState("");

  const handleConfirm = () => {
    onConfirm({
      selectedFields,
      context: context.trim() || undefined,
    });
  };

  const selectedCount = selectedFields.length;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">
            Fields to Research ({selectedCount} selected)
          </div>
          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedFields(availableFields)}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedFields(emptyFields)}
            >
              Empty Only
            </Button>
          </div>
        </div>

        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
          {availableFields.map((field) => {
            const currentValue = entity.properties?.[field];
            const hasValue = currentValue && currentValue !== "";
            const isSelected = selectedFields.includes(field);

            return (
              <div
                key={field}
                className={`flex items-center justify-between p-3 ${
                  hasValue ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      setSelectedFields((prev) =>
                        prev.includes(field)
                          ? prev.filter((f) => f !== field)
                          : [...prev, field]
                      );
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {humanizeFieldName(field)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {hasValue ? String(currentValue) : "(empty)"}
                    </div>
                  </div>
                </div>
                {hasValue && (
                  <Badge variant="secondary" className="text-xs">
                    Has Value
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="context">
          Additional Context{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="context"
          placeholder="e.g., Focus on political career, Include scientific achievements, etc."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={selectedCount === 0}>
          Research {selectedCount} Field{selectedCount !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
