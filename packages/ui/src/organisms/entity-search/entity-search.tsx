/**
 * Entity Search Component
 *
 * Provides search functionality to find existing entities in the knowledge graph.
 * Used for linking files to entities, entity merging, etc.
 */

import React, { useCallback, useEffect, useState } from "react";

import { Button } from "../../atoms/button";

export interface SearchableEntity {
  uid: string;
  name: string;
  type: string;
  tags?: string[];
  aliases?: string[];
}

export interface EntityMatch {
  entity: SearchableEntity;
  similarity: number;
  matchReasons: string[];
}

interface EntitySearchProps {
  placeholder?: string;
  onEntitySelect: (entity: SearchableEntity) => void;
  onClear?: () => void;
  selectedEntity?: SearchableEntity | null;
  className?: string;
  /** Optional function to get entity icon/emoji. Defaults to using entity type. */
  getEntityIcon?: (type: string) => string;
}

/**
 * Default entity icon mapping
 * Consumers can override by passing getEntityIcon prop
 */
const defaultGetEntityIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    person: "👤",
    organization: "🏢",
    event: "📅",
    location: "📍",
    concept: "💡",
    file: "📄",
  };
  return iconMap[type.toLowerCase()] || "🔷";
};

export function EntitySearch({
  placeholder = "Search for entities to link...",
  onEntitySelect,
  onClear,
  selectedEntity,
  className = "",
  getEntityIcon = defaultGetEntityIcon,
}: EntitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<EntityMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const searchEntities = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setMatches([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use the graph search API - we'll need to create a search-specific endpoint
      const response = await fetch("/api/entity-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQuery: query,
          limit: 10,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMatches(result.entities || []);
        } else {
          console.error("Entity search failed:", result.error);
          setMatches([]);
        }
      } else {
        console.error("Entity search request failed:", response.statusText);
        setMatches([]);
      }
    } catch (error) {
      console.error("Entity search error:", error);
      setMatches([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEntities(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchEntities]);

  const handleEntitySelect = (entity: SearchableEntity) => {
    onEntitySelect(entity);
    setIsOpen(false);
    setSearchQuery("");
    setMatches([]);
  };

  const handleClear = () => {
    setSearchQuery("");
    setMatches([]);
    setIsOpen(false);
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      {selectedEntity ? (
        // Display selected entity
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {getEntityIcon(selectedEntity.type)}
            </span>
            <div>
              <p className="font-medium text-sm text-foreground">
                {selectedEntity.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedEntity.type}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </div>
      ) : (
        // Search interface
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full p-3 border border-input bg-background text-foreground rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
          />

          {isOpen && (searchQuery.length >= 2 || matches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
              {isSearching ? (
                <div className="p-3 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : matches.length === 0 && searchQuery.length >= 2 ? (
                <div className="p-3 text-center text-muted-foreground">
                  No entities found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-1">
                  {matches.map((match) => (
                    <div
                      key={match.entity.uid}
                      onClick={() => handleEntitySelect(match.entity)}
                      className="flex items-start gap-2 p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                    >
                      <span className="text-lg flex-shrink-0">
                        {getEntityIcon(match.entity.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {match.entity.name}
                          </p>
                          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {Math.round(match.similarity * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {match.entity.type}
                          {match.entity.tags?.length
                            ? ` • ${match.entity.tags.slice(0, 2).join(", ")}`
                            : ""}
                        </p>
                        {match.matchReasons.length > 0 && (
                          <p className="text-xs text-muted-foreground/60">
                            {match.matchReasons[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
