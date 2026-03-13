"use client";

import { useState, useMemo, useRef, useEffect } from "react";

import { Badge } from "./badge";

interface TypeaheadProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "single" | "multi";
  maxSuggestions?: number;
}

export function Typeahead({
  items,
  value,
  onChange,
  placeholder = "Select...",
  mode = "single",
  maxSuggestions = 10,
}: TypeaheadProps) {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse selected items based on mode
  const selectedItems = useMemo(
    () =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [value]
  );

  // Get available items (exclude selected ones in multi mode)
  const availableItems = useMemo(
    () =>
      mode === "multi"
        ? items.filter((item) => !selectedItems.includes(item))
        : items,
    [items, selectedItems, mode]
  );

  // Filter items based on input
  const filtered = useMemo(
    () =>
      availableItems
        .filter((item) => item.toLowerCase().includes(input.toLowerCase()))
        .slice(0, maxSuggestions),
    [input, availableItems, maxSuggestions]
  );

  // Handle item selection
  const handleSelect = (item: string) => {
    if (mode === "multi") {
      const updated = [...selectedItems, item];
      onChange(updated.join(", "));
    } else {
      onChange(item);
    }
    setInput("");
    setIsOpen(false);
  };

  // Handle item removal (multi mode)
  const handleRemove = (item: string) => {
    const updated = selectedItems.filter((s) => s !== item);
    onChange(updated.join(", "));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue =
    mode === "multi" ? input : input || selectedItems[0] || "";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="border border-border rounded-md p-2 bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
        {mode === "multi" && selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedItems.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => handleRemove(item)}
              >
                {item} ✕
              </Badge>
            ))}
          </div>
        )}
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            mode === "multi" && selectedItems.length > 0
              ? "Add more..."
              : placeholder
          }
          className="w-full text-sm outline-none bg-transparent text-foreground placeholder:text-foreground-muted"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 border border-border rounded-md bg-background shadow-lg">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-background-secondary focus:bg-background-secondary focus:outline-none text-sm text-foreground transition-colors first:rounded-t-md last:rounded-b-md"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {isOpen && filtered.length === 0 && input && (
        <div className="absolute z-50 w-full mt-1 border border-border rounded-md bg-background shadow-lg">
          <div className="px-3 py-2 text-sm text-foreground-muted">
            No results found
          </div>
        </div>
      )}
    </div>
  );
}
