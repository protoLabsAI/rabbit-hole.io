"use client";

import type Graph from "graphology";
import { useState, useMemo, useCallback } from "react";

import { Badge, Button, Checkbox, Input } from "@protolabsai/ui/atoms";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

interface ExtractedEntity {
  uid: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  _confidence: number;
  _phase?: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  fileName: string;
  fileSize: number;
  textLength: number;
  processingTime: {
    textExtraction: number;
    discover: number;
    structure: number;
    total: number;
  };
  stats: {
    totalDiscovered: number;
    totalStructured: number;
    entityTypes: string[];
  };
}

interface FileExtractionReviewStepProps {
  extractionResult: ExtractionResult;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onBack: () => void;
  onConfirm: (selectedEntities: ExtractedEntity[]) => void;
}

export function FileExtractionReviewStep({
  extractionResult,
  graph,
  onBack,
  onConfirm,
}: FileExtractionReviewStepProps) {
  const [entities, setEntities] = useState<
    Array<ExtractedEntity & { selected: boolean }>
  >(() => extractionResult.entities.map((e) => ({ ...e, selected: true })));

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (
        searchQuery &&
        !entity.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterType && entity.type !== filterType) {
        return false;
      }
      return true;
    });
  }, [entities, searchQuery, filterType]);

  const handleToggle = useCallback((index: number) => {
    setEntities((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  }, []);

  const handleEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditedName(entities[index].name);
    },
    [entities]
  );

  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null) {
      setEntities((prev) =>
        prev.map((e, i) =>
          i === editingIndex ? { ...e, name: editedName.trim() } : e
        )
      );
      setEditingIndex(null);
      setEditedName("");
    }
  }, [editingIndex, editedName]);

  const handleSelectAll = useCallback(() => {
    setEntities((prev) => prev.map((e) => ({ ...e, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setEntities((prev) => prev.map((e) => ({ ...e, selected: false })));
  }, []);

  const handleToggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedEntities = entities
      .filter((e) => e.selected)
      .map(({ selected, ...entity }) => entity);

    onConfirm(selectedEntities);
  }, [entities, onConfirm]);

  const selectedCount = entities.filter((e) => e.selected).length;
  const newEntitiesCount = entities.filter(
    (e) => e.selected && !graph.hasNode(e.uid)
  ).length;

  const entityTypes = useMemo(() => {
    return Array.from(new Set(entities.map((e) => e.type))).sort();
  }, [entities]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <div className="text-sm font-medium">Extraction Results</div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">
              {extractionResult.fileName}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {extractionResult.stats.totalStructured}
            </span>{" "}
            entities found
          </div>
          <div>
            <span className="font-medium text-primary">{selectedCount}</span>{" "}
            selected
          </div>
          <div>
            <span className="font-medium text-green-600">
              {newEntitiesCount}
            </span>{" "}
            new
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterType || ""}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-3 py-2 rounded-md border bg-background"
        >
          <option value="">All Types</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      <div className="flex justify-between items-center py-2 border-b">
        <div className="text-sm text-muted-foreground">
          {selectedCount} of {filteredEntities.length} will be imported
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {/* Entity List */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {filteredEntities.map((entity) => {
          const actualIndex = entities.findIndex((e) => e.uid === entity.uid);
          const isExpanded = expandedIndex === actualIndex;
          const exists = graph.hasNode(entity.uid);

          return (
            <div
              key={entity.uid}
              className={`rounded-lg border transition-colors ${
                entity.selected
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-muted opacity-60"
              }`}
            >
              {/* Entity Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={entity.selected}
                    onCheckedChange={() => handleToggle(actualIndex)}
                  />

                  {editingIndex === actualIndex ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") setEditingIndex(null);
                        }}
                      />
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {entity.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(entity.properties || {}).length}{" "}
                          properties
                          {entity._confidence &&
                            ` • ${(entity._confidence * 100).toFixed(0)}% confidence`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {entity.type}
                        </Badge>
                        {exists && (
                          <Badge variant="outline" className="text-xs">
                            Exists
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(actualIndex)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleExpand(actualIndex)}
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Properties */}
              {isExpanded && (
                <div className="border-t p-3 bg-muted/20">
                  <div className="text-sm font-medium mb-2">Properties</div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(entity.properties || {}).map(
                      ([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground capitalize min-w-[120px]">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="flex-1">
                            {Array.isArray(value)
                              ? value.join(", ")
                              : String(value)}
                          </span>
                        </div>
                      )
                    )}
                    {Object.keys(entity.properties || {}).length === 0 && (
                      <div className="text-muted-foreground">
                        No properties extracted
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Config
        </Button>
        <Button onClick={handleConfirm} disabled={selectedCount === 0}>
          Import {newEntitiesCount} New{" "}
          {newEntitiesCount === 1 ? "Entity" : "Entities"}
        </Button>
      </div>
    </div>
  );
}
