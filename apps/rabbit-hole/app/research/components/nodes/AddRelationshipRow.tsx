"use client";

import { useState } from "react";

import { Icon } from "@protolabsai/icon-system";
import { Button } from "@protolabsai/ui/atoms";

import { EntitySelector } from "./EntitySelector";
import { RelationshipTypeSelector } from "./RelationshipTypeSelector";

interface AddRelationshipRowProps {
  availableRelationshipTypes: string[];
  availableEntities: Array<{ uid: string; name: string; type: string }>;
  onAdd: (type: string, targetUid: string) => Promise<void>;
  onCreateNewEntity: () => void;
}

export function AddRelationshipRow({
  availableRelationshipTypes,
  availableEntities,
  onAdd,
  onCreateNewEntity,
}: AddRelationshipRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!selectedType || !selectedTarget) return;

    setIsSubmitting(true);
    try {
      await onAdd(selectedType, selectedTarget);
      // Reset form
      setIsAdding(false);
      setSelectedType("");
      setSelectedTarget("");
    } catch (error) {
      console.error("Failed to add relationship:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setSelectedType("");
    setSelectedTarget("");
  };

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full"
      >
        <Icon name="plus" size={16} className="mr-2" />
        Add Relationship
      </Button>
    );
  }

  return (
    <div className="p-3 border rounded-md bg-accent/20 space-y-3">
      {/* Relationship Type Select */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Relationship Type
        </label>
        <RelationshipTypeSelector
          availableTypes={availableRelationshipTypes}
          value={selectedType}
          onValueChange={setSelectedType}
          placeholder="Select type..."
          disabled={isSubmitting}
        />
      </div>

      {/* Target Entity Select or Create New */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Target Entity
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <EntitySelector
              availableEntities={availableEntities}
              value={selectedTarget}
              onValueChange={setSelectedTarget}
              placeholder="Select entity..."
              disabled={isSubmitting}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNewEntity}
            title="Create new entity"
            disabled={isSubmitting}
          >
            <Icon name="plus" size={16} />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <Icon name="x" size={14} className="mr-1" />
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!selectedType || !selectedTarget || isSubmitting}
        >
          <Icon name="check" size={14} className="mr-1" />
          {isSubmitting ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
