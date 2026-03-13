"use client";

/**
 * Edge Type Selector Popover
 *
 * Shows when user creates an edge between two nodes.
 * Displays valid relationship types based on source/target domains.
 */

import React, { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@proto/ui/atoms";

import { RelationshipTypeSelector } from "../nodes/RelationshipTypeSelector";

interface EdgeTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNodeName: string;
  targetNodeName: string;
  availableTypes: string[];
  onConfirm: (type: string) => void;
  anchorPosition?: { x: number; y: number };
}

export function EdgeTypeSelector({
  isOpen,
  onClose,
  sourceNodeName,
  targetNodeName,
  availableTypes,
  onConfirm,
  anchorPosition,
}: EdgeTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState("");

  const handleConfirm = useCallback(() => {
    if (!selectedType) return;
    onConfirm(selectedType);
    setSelectedType("");
  }, [selectedType, onConfirm]);

  const handleCancel = useCallback(() => {
    setSelectedType("");
    onClose();
  }, [onClose]);

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            left: anchorPosition?.x ?? "50%",
            top: anchorPosition?.y ?? "50%",
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm mb-1">Create Relationship</h3>
            <p className="text-xs text-muted-foreground">
              {sourceNodeName} → {targetNodeName}
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="relationship-type-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Relationship Type
            </label>
            <RelationshipTypeSelector
              id="relationship-type-select"
              availableTypes={availableTypes}
              value={selectedType}
              onValueChange={setSelectedType}
              placeholder="Select type..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <Icon name="x" size={14} className="mr-1" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedType}
            >
              <Icon name="check" size={14} className="mr-1" />
              Create
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
