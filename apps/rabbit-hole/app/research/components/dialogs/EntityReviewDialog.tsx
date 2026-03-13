"use client";

import { useLangGraphInterrupt } from "@copilotkit/react-core";
import { useState, useCallback } from "react";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@proto/ui/atoms";

interface ResolvedEntity {
  type: string;
  name: string;
  variants: string[];
  confidence: number;
}

interface ReviewData {
  entities: ResolvedEntity[];
  stats: {
    totalDiscovered?: number;
    totalResolved?: number;
    duplicatesRemoved?: number;
  };
  phase: string;
}

export function EntityReviewInterrupt() {
  useLangGraphInterrupt<ReviewData>({
    render: ({ event, resolve }) => {
      const [entities, setEntities] = useState<
        Array<ResolvedEntity & { selected: boolean }>
      >((event.value.entities || []).map((e) => ({ ...e, selected: true })));
      const [editingIndex, setEditingIndex] = useState<number | null>(null);
      const [editedName, setEditedName] = useState("");

      const handleToggle = useCallback((index: number) => {
        setEntities((prev) =>
          prev.map((e, i) =>
            i === index ? { ...e, selected: !e.selected } : e
          )
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
          const trimmedName = editedName.trim();
          // Prevent empty names
          if (!trimmedName || trimmedName.length === 0) {
            // Revert to previous value
            setEditedName(entities[editingIndex].name);
            return;
          }
          setEntities((prev) =>
            prev.map((e, i) =>
              i === editingIndex ? { ...e, name: trimmedName } : e
            )
          );
          setEditingIndex(null);
          setEditedName("");
        }
      }, [editingIndex, editedName, entities]);

      const handleCancelEdit = useCallback(() => {
        setEditingIndex(null);
        setEditedName("");
      }, []);

      const handleCancel = useCallback(() => {
        resolve(JSON.stringify({ approvedEntities: [] }));
      }, [resolve]);

      const handleSelectAll = useCallback(() => {
        setEntities((prev) => prev.map((e) => ({ ...e, selected: true })));
      }, []);

      const handleDeselectAll = useCallback(() => {
        setEntities((prev) => prev.map((e) => ({ ...e, selected: false })));
      }, []);

      // Check if any entity name is empty
      const hasEmptyNames = entities.some(
        (e) => !e.name || e.name.trim().length === 0
      );

      const handleApprove = useCallback(() => {
        const approvedEntities = entities
          .filter((e) => e.selected && e.name && e.name.trim().length > 0)
          .map((e) => ({
            type: e.type,
            name: e.name.trim(),
          }));

        resolve(JSON.stringify({ approvedEntities }));
      }, [entities, resolve]);

      const selectedCount = entities.filter((e) => e.selected).length;
      const stats = event.value.stats;

      return (
        <Dialog open={true}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Review Discovered Entities</DialogTitle>
              <DialogDescription>
                AI automatically cleaned up duplicates. Review, edit, or remove
                entities before extracting their properties.
              </DialogDescription>
            </DialogHeader>

            {/* Statistics */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="text-sm font-medium">Discovery Results</div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">
                    {stats.totalDiscovered || 0}
                  </span>{" "}
                  found
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {stats.totalResolved || 0}
                  </span>{" "}
                  after cleanup
                </div>
                {(stats.duplicatesRemoved || 0) > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    Removed {stats.duplicatesRemoved} duplicates
                  </div>
                )}
                <div>
                  <span className="font-medium text-primary">
                    {selectedCount}
                  </span>{" "}
                  selected
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center py-2 border-b">
              <div className="text-sm text-muted-foreground">
                {selectedCount} of {entities.length} will be processed
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
            <div className="flex-1 overflow-y-auto space-y-2 py-4">
              {entities.map((entity, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    entity.selected
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/30 border-muted opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={entity.selected}
                      onCheckedChange={() => handleToggle(index)}
                    />

                    {editingIndex === index ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
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
                          {entity.variants.length > 0 && (
                            <div
                              className="text-xs text-muted-foreground truncate"
                              title={`Variants found: ${entity.variants.join(", ")}`}
                            >
                              Also known as: {entity.variants.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {entity.type}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(index)}
                          >
                            Edit
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <div className="flex justify-between w-full items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Phase 2 will extract properties for {selectedCount} entities
                  (~{Math.ceil(selectedCount * 0.3)}s)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={selectedCount === 0 || hasEmptyNames}
                  >
                    Continue with {selectedCount} Entities
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  });

  return null;
}
