"use client";

/**
 * EntityTypeSelector - Typeahead Popover for Entity Type Selection
 *
 * Displays searchable list of entity types grouped by domain.
 * Used when adding entities via context menu.
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { domainRegistry, getDomainIcon } from "@proto/types";
import { Popover, PopoverContent, PopoverTrigger } from "@proto/ui/atoms";

interface EntityTypeOption {
  type: string;
  domain: string;
  domainDisplayName: string;
  domainIcon: string;
}

interface EntityTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entityType: string) => void;
  anchorPosition?: { x: number; y: number };
}

export function EntityTypeSelector({
  isOpen,
  onClose,
  onSelect,
  anchorPosition,
}: EntityTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat list of all entity types with domain metadata
  const allTypes = useMemo(() => {
    const entityTypesByDomain = domainRegistry.getEntityTypesByDomain();
    const types: EntityTypeOption[] = [];

    // Add Custom option first
    types.push({
      type: "Entity",
      domain: "custom",
      domainDisplayName: "Custom",
      domainIcon: "📦",
    });

    // Add domain-grouped types
    Object.entries(entityTypesByDomain)
      .sort(([domainA], [domainB]) => domainA.localeCompare(domainB))
      .forEach(([domain, entityTypes]) => {
        const domainConfig = domainRegistry.getDomainConfig(domain);
        const displayName =
          domainConfig?.displayName ||
          domain.charAt(0).toUpperCase() + domain.slice(1);
        const icon = getDomainIcon(domain);

        entityTypes.forEach((type) => {
          types.push({
            type,
            domain,
            domainDisplayName: displayName,
            domainIcon: icon,
          });
        });
      });

    return types;
  }, []);

  // Filter types based on search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allTypes;
    }

    const query = searchQuery.toLowerCase();
    return allTypes.filter(
      (option) =>
        option.type.toLowerCase().includes(query) ||
        option.domain.toLowerCase().includes(query) ||
        option.domainDisplayName.toLowerCase().includes(query)
    );
  }, [allTypes, searchQuery]);

  // Group filtered results by domain
  const groupedResults = useMemo(() => {
    const groups = new Map<string, EntityTypeOption[]>();

    filteredTypes.forEach((option) => {
      const key = option.domain;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(option);
    });

    return Array.from(groups.entries()).map(([domain, options]) => ({
      domain,
      displayName: options[0].domainDisplayName,
      icon: options[0].domainIcon,
      types: options,
    }));
  }, [filteredTypes]);

  // Create index lookup map for O(1) access instead of O(n) indexOf
  const indexMap = useMemo(() => {
    const map = new Map<EntityTypeOption, number>();
    filteredTypes.forEach((option, index) => {
      map.set(option, index);
    });
    return map;
  }, [filteredTypes]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTypes]);

  // Auto-focus input and reset state when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setSearchQuery("");
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredTypes.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredTypes.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredTypes[highlightedIndex]) {
            onSelect(filteredTypes[highlightedIndex].type);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredTypes, highlightedIndex, onSelect, onClose]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    const highlightedElement = listRef.current?.querySelector(
      `[data-index="${highlightedIndex}"]`
    );
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            left: anchorPosition?.x ?? 0,
            top: anchorPosition?.y ?? 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Search Input */}
          <div className="p-3 border-b nodrag">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search entity types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Results List */}
          <div ref={listRef} className="overflow-y-auto flex-1 nodrag">
            {filteredTypes.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No entity types found
              </div>
            ) : (
              groupedResults.map((group) => (
                <div key={group.domain}>
                  {/* Domain Header */}
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                    <span>{group.icon}</span>
                    <span>{group.displayName}</span>
                  </div>

                  {/* Types in Domain */}
                  {group.types.map((option, groupIndex) => {
                    const globalIndex = indexMap.get(option) ?? -1;
                    const isHighlighted = globalIndex === highlightedIndex;

                    return (
                      <button
                        key={option.type}
                        type="button"
                        data-index={globalIndex}
                        onClick={() => {
                          onSelect(option.type);
                          onClose();
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                          isHighlighted ? "bg-accent" : ""
                        }`}
                      >
                        {option.type}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
