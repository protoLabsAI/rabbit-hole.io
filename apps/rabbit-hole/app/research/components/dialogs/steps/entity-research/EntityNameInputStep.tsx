"use client";

import { useState, useCallback, useMemo } from "react";

import { Icon } from "@protolabsai/icon-system";
import { domainRegistry } from "@protolabsai/types";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@protolabsai/ui/atoms";
import { DomainEntityTypeSelector } from "@protolabsai/ui/organisms";

export interface EntityResearchConfig {
  entityName: string;
  entityNames?: string[]; // Support multiple entities
  entityType: string;
  sources?: string[]; // Wikipedia, arXiv, etc.
  domains?: string[]; // Filter by domain
  entityTypes?: string[]; // Specific entity types to extract
  maxEntities?: number; // Max entities to extract
}

interface EntityNameInputStepProps {
  onConfirm: (config: EntityResearchConfig) => void;
  onCancel: () => void;
}

export function EntityNameInputStep({
  onConfirm,
  onCancel,
}: EntityNameInputStepProps) {
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("Person");
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "wikipedia",
  ]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [maxEntities, setMaxEntities] = useState(10);
  const [isEntityTypesOpen, setIsEntityTypesOpen] = useState(false);

  // Get all entity types from domain registry (memoized for client safety)
  const entityTypesByDomain = useMemo(
    () => domainRegistry.getEntityTypesByDomain(),
    []
  );
  const allEntityTypes = useMemo(
    () => Object.values(entityTypesByDomain).flat().sort(),
    [entityTypesByDomain]
  );

  const availableSources = [
    { id: "wikipedia", label: "Wikipedia", enabled: true },
    { id: "arxiv", label: "arXiv", enabled: false },
    { id: "scholar", label: "Google Scholar", enabled: false },
  ];

  const handleConfirm = useCallback(() => {
    if (!entityName.trim()) {
      return;
    }

    // Parse comma-separated names
    const names = entityName
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    // Get domains from selected entity types
    const domains =
      selectedEntityTypes.length > 0
        ? Array.from(
            new Set(
              selectedEntityTypes
                .map((t) => domainRegistry.getDomainFromEntityType(t))
                .filter(Boolean) as string[]
            )
          )
        : undefined;

    onConfirm({
      entityName: names[0], // Primary entity for backward compatibility
      entityNames: names,
      entityType,
      sources: selectedSources,
      domains,
      entityTypes:
        selectedEntityTypes.length > 0 ? selectedEntityTypes : undefined,
      maxEntities,
    });
  }, [
    entityName,
    entityType,
    selectedSources,
    selectedEntityTypes,
    maxEntities,
    onConfirm,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entity-name">Entity Names</Label>
          <Input
            id="entity-name"
            placeholder="Einstein, Curie, Feynman"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && entityName.trim()) {
                handleConfirm();
              }
            }}
            autoFocus
          />
          <p className="text-sm text-muted-foreground">
            Enter one or more entity names (comma-separated)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entity-type">Entity Type</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger id="entity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allEntityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Primary entity type for extraction
          </p>
        </div>

        <div className="space-y-2">
          <Label>Data Sources</Label>
          <div className="space-y-2">
            {availableSources.map((source) => (
              <label
                key={source.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source.id)}
                  disabled={!source.enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSources([...selectedSources, source.id]);
                    } else {
                      setSelectedSources(
                        selectedSources.filter((s) => s !== source.id)
                      );
                    }
                  }}
                  className="w-4 h-4"
                />
                <span
                  className={!source.enabled ? "text-muted-foreground" : ""}
                >
                  {source.label}
                  {!source.enabled && " (Coming Soon)"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <Collapsible
          open={isEntityTypesOpen}
          onOpenChange={setIsEntityTypesOpen}
        >
          <div className="space-y-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full group">
                <Label className="cursor-pointer">
                  Entity Types to Extract (Optional)
                  {selectedEntityTypes.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({selectedEntityTypes.length} selected)
                    </span>
                  )}
                </Label>
                <Icon
                  name={isEntityTypesOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border border-border rounded-lg h-64 overflow-hidden mt-2">
                <DomainEntityTypeSelector
                  selectedEntityTypes={selectedEntityTypes}
                  onSelectionChange={setSelectedEntityTypes}
                  mode="select"
                  compact
                  showGlobalControls={false}
                  presets={[
                    {
                      label: "People & Orgs",
                      types: ["Person", "Organization"],
                      icon: "users",
                    },
                    {
                      label: "Academic",
                      types: ["University", "Research", "Publication"],
                      icon: "book",
                    },
                  ]}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Leave empty to extract all entity types
              </p>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <div className="space-y-2">
          <Label htmlFor="max-entities">Max Entities</Label>
          <Input
            id="max-entities"
            type="number"
            min={1}
            max={200}
            value={maxEntities}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                setMaxEntities(Math.max(1, Math.min(200, val)));
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Maximum entities to extract (1-200)
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <h4 className="text-sm font-medium">Research Process</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Fetch from {selectedSources.join(", ")}</li>
          <li>
            Extract{" "}
            {selectedEntityTypes.length > 0
              ? `${selectedEntityTypes.length} entity types`
              : "all entity types"}{" "}
            with evidence tracking
          </li>
          <li>Deduplicate similar entities</li>
          <li>Review and import to graph</li>
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!entityName.trim()}>
          Start Research
        </Button>
      </div>
    </div>
  );
}
