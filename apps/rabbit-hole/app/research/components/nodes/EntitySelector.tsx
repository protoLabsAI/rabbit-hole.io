"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { domainRegistry, getDomainIcon } from "@proto/types";
import { Badge } from "@proto/ui/atoms";

interface Entity {
  uid: string;
  name: string;
  type: string;
}

interface EntitySelectorProps {
  availableEntities: Entity[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EntitySelector({
  availableEntities,
  value,
  onValueChange,
  placeholder = "Search entities...",
  disabled = false,
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms delay after user stops typing)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Filter entities based on debounced search query
  const filteredEntities = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return availableEntities;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return availableEntities.filter(
      (entity: Entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.type.toLowerCase().includes(query)
    );
  }, [availableEntities, debouncedSearchQuery]);

  // Group filtered entities by domain
  const groupedEntities = useMemo(() => {
    const groups = new Map<
      string,
      {
        domain: string;
        displayName: string;
        icon: string;
        entities: Entity[];
      }
    >();

    filteredEntities.forEach((entity) => {
      const domainName = domainRegistry.getDomainFromEntityType(entity.type);
      const domain = domainName || "unknown";

      if (!groups.has(domain)) {
        const domainConfig = domainRegistry.getDomainConfig(domain);
        groups.set(domain, {
          domain,
          displayName:
            domainConfig?.displayName ||
            domain.charAt(0).toUpperCase() + domain.slice(1),
          icon: getDomainIcon(domain),
          entities: [],
        });
      }

      groups.get(domain)!.entities.push(entity);
    });

    // Sort groups by domain name
    return Array.from(groups.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, [filteredEntities]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredEntities]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredEntities.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredEntities.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredEntities[highlightedIndex]) {
            onValueChange(filteredEntities[highlightedIndex].uid);
            setIsOpen(false);
            setSearchQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          break;
      }
    },
    [filteredEntities, highlightedIndex, onValueChange]
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

  const selectedEntity = availableEntities.find((e) => e.uid === value);
  const displayValue = selectedEntity
    ? `${selectedEntity.name} (${selectedEntity.type})`
    : "";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm text-left border rounded-md bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {displayValue || placeholder}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
            }}
          />

          {/* Dropdown Content */}
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
            <div className="flex flex-col max-h-[300px]">
              {/* Search Input */}
              <div className="p-2 border-b">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Results List */}
              <div ref={listRef} className="overflow-y-auto flex-1">
                {filteredEntities.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No entities found
                  </div>
                ) : (
                  groupedEntities.map((group) => (
                    <div key={group.domain}>
                      {/* Domain Header */}
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2 sticky top-0">
                        <span>{group.icon}</span>
                        <span>{group.displayName}</span>
                        <span className="text-xs font-normal">
                          ({group.entities.length})
                        </span>
                      </div>

                      {/* Entities in Domain */}
                      {group.entities.map((entity) => {
                        const entityIndex = filteredEntities.indexOf(entity);
                        const isHighlighted = entityIndex === highlightedIndex;
                        const isSelected = entity.uid === value;

                        return (
                          <button
                            key={entity.uid}
                            type="button"
                            data-index={entityIndex}
                            onClick={() => {
                              onValueChange(entity.uid);
                              setIsOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                              isHighlighted ? "bg-accent" : ""
                            } ${isSelected ? "font-medium" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {entity.type}
                              </Badge>
                              <span className="truncate">{entity.name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
