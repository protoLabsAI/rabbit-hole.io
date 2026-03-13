/**
 * Multi-Entity Selector Component
 *
 * Extends EntitySearch functionality to support selecting multiple entities
 * (1-5) for timeline comparison. Features entity management, validation,
 * and quick suggestions.
 */

"use client";

import React, { useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";
import { EntitySearch, type SearchableEntity } from "@proto/ui/organisms";
import { getEntityImage } from "@proto/utils/atlas";

// ==================== Types ====================

interface EntitySelectorProps {
  selectedEntities: string[];
  onEntitiesChange: (entities: string[]) => void;
  maxEntities?: number;
  className?: string;
}

interface SelectedEntityCardProps {
  entityUid: string;
  index: number;
  onRemove: () => void;
  onReplace: (newEntity: SearchableEntity) => void;
}

// ==================== Components ====================

/**
 * Card displaying a selected entity with remove/replace options
 */
function SelectedEntityCard({
  entityUid,
  index,
  onRemove,
  onReplace,
}: SelectedEntityCardProps) {
  const [isReplacing, setIsReplacing] = useState(false);

  // Extract entity info from UID
  const entityName =
    entityUid
      .split(":")[1]
      ?.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || entityUid;

  const entityType = entityUid.split(":")[0] || "unknown";

  const handleReplace = (newEntity: SearchableEntity) => {
    onReplace(newEntity);
    setIsReplacing(false);
  };

  if (isReplacing) {
    return (
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
        <div className="mb-2">
          <p className="text-sm font-medium text-blue-700">
            Replace &quot;{entityName}&quot;
          </p>
        </div>
        <EntitySearch
          placeholder="Search for replacement entity..."
          onEntitySelect={handleReplace}
          onClear={() => setIsReplacing(false)}
          className="mb-2"
          getEntityIcon={getEntityImage}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsReplacing(false)}
          className="w-full text-xs"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {index + 1}
          </Badge>
          <span className="text-lg flex-shrink-0">
            {getEntityImage(entityType)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{entityName}</p>
            <p className="text-xs text-gray-500">{entityType}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReplacing(true)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
            title="Replace entity"
          >
            <Icon name="refresh" size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
            title="Remove entity"
          >
            <Icon name="x" size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick suggestions for common entity types
 */
function QuickEntitySuggestions({
  onEntitySelect,
  excludeEntities,
}: {
  onEntitySelect: (entityUid: string) => void;
  excludeEntities: string[];
}) {
  // Sample suggestions - in a real app, these might come from recent searches or popular entities
  const suggestions = [
    { uid: "person:donald_trump", name: "Donald Trump", type: "person" },
    { uid: "person:joe_biden", name: "Joe Biden", type: "person" },
    { uid: "organization:meta", name: "Meta", type: "organization" },
    { uid: "person:elon_musk", name: "Elon Musk", type: "person" },
  ].filter((suggestion) => !excludeEntities.includes(suggestion.uid));

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">Quick suggestions:</p>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.uid}
            variant="outline"
            size="sm"
            onClick={() => onEntitySelect(suggestion.uid)}
            className="h-7 text-xs"
          >
            {getEntityImage(suggestion.type)} {suggestion.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function EntitySelector({
  selectedEntities,
  onEntitiesChange,
  maxEntities = 5,
  className = "",
}: EntitySelectorProps) {
  const [isAdding, setIsAdding] = useState(false);

  const addEntity = useCallback(
    (entityUid: string) => {
      if (
        !selectedEntities.includes(entityUid) &&
        selectedEntities.length < maxEntities
      ) {
        onEntitiesChange([...selectedEntities, entityUid]);
      }
    },
    [selectedEntities, onEntitiesChange, maxEntities]
  );

  const removeEntity = useCallback(
    (entityUid: string) => {
      onEntitiesChange(selectedEntities.filter((uid) => uid !== entityUid));
    },
    [selectedEntities, onEntitiesChange]
  );

  const replaceEntity = useCallback(
    (oldUid: string, newEntity: SearchableEntity) => {
      onEntitiesChange(
        selectedEntities.map((uid) => (uid === oldUid ? newEntity.uid : uid))
      );
    },
    [selectedEntities, onEntitiesChange]
  );

  const clearAllEntities = useCallback(() => {
    onEntitiesChange([]);
  }, [onEntitiesChange]);

  const handleEntitySelect = (entity: SearchableEntity) => {
    addEntity(entity.uid);
    setIsAdding(false);
  };

  const canAddMore = selectedEntities.length < maxEntities;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon name="users" size={16} />
              Selected Entities
            </CardTitle>
            <CardDescription>
              {selectedEntities.length} of {maxEntities} entities selected
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllEntities}
            disabled={selectedEntities.length === 0}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selected Entities List */}
        {selectedEntities.length > 0 ? (
          <div className="space-y-2">
            {selectedEntities.map((entityUid, index) => (
              <SelectedEntityCard
                key={entityUid}
                entityUid={entityUid}
                index={index}
                onRemove={() => removeEntity(entityUid)}
                onReplace={(newEntity) => replaceEntity(entityUid, newEntity)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon
              name="users"
              size={32}
              className="text-gray-400 mx-auto mb-2"
            />
            <p className="text-sm font-medium text-gray-600 mb-1">
              No entities selected
            </p>
            <p className="text-xs text-gray-500">
              Add entities to start comparing their timelines
            </p>
          </div>
        )}

        {/* Add Entity Section */}
        {canAddMore && (
          <div className="space-y-3 pt-4 border-t">
            {isAdding ? (
              <div className="space-y-2">
                <EntitySearch
                  placeholder="Search entities to compare..."
                  onEntitySelect={handleEntitySelect}
                  onClear={() => setIsAdding(false)}
                  getEntityIcon={getEntityImage}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="w-full text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center gap-2"
                size="sm"
              >
                <Icon name="plus" size={16} />
                Add Entity ({selectedEntities.length}/{maxEntities})
              </Button>
            )}

            {/* Quick Suggestions */}
            {!isAdding && (
              <QuickEntitySuggestions
                onEntitySelect={addEntity}
                excludeEntities={selectedEntities}
              />
            )}
          </div>
        )}

        {/* Max Entities Message */}
        {!canAddMore && (
          <div className="text-center py-2">
            <Badge variant="secondary" className="text-xs">
              Maximum {maxEntities} entities selected
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
