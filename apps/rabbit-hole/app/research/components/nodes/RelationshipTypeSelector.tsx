"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { formatRelationshipType } from "../../lib/relationship-utils";

interface RelationshipTypeSelectorProps {
  availableTypes: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function RelationshipTypeSelector({
  availableTypes,
  value,
  onValueChange,
  placeholder = "Search relationship types...",
  disabled = false,
  id,
}: RelationshipTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter types based on search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTypes;
    }

    const query = searchQuery.toLowerCase();
    return availableTypes.filter((type) => type.toLowerCase().includes(query));
  }, [availableTypes, searchQuery]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTypes]);

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
            onValueChange(filteredTypes[highlightedIndex]);
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
    [filteredTypes, highlightedIndex, onValueChange]
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

  const displayValue = value ? formatRelationshipType(value) : "";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm text-left border rounded-md bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {displayValue || placeholder}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground"
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
                {filteredTypes.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No types found
                  </div>
                ) : (
                  filteredTypes.map((type, index) => {
                    const isHighlighted = index === highlightedIndex;
                    const isSelected = type === value;

                    return (
                      <button
                        key={type}
                        type="button"
                        data-index={index}
                        onClick={() => {
                          onValueChange(type);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                          isHighlighted ? "bg-accent" : ""
                        } ${isSelected ? "font-medium" : ""}`}
                      >
                        {formatRelationshipType(type)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
