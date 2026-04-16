"use client";

import { useState, useMemo, useCallback } from "react";

import { Icon } from "@protolabsai/icon-system";
import { domainRegistry } from "@protolabsai/types";

import { Button, Badge } from "../atoms";

export interface DomainEntityTypeSelectorProps {
  // ==================== Selection State ====================
  selectedEntityTypes: string[];
  onSelectionChange: (types: string[]) => void;

  // ==================== Mode ====================
  mode?: "select" | "filter";

  // ==================== Configuration ====================
  includeDomains?: string[];
  excludeDomains?: string[];
  defaultExpanded?: string[];
  accordionMode?: boolean;

  // ==================== Constraints ====================
  minSelection?: number;
  maxSelection?: number;
  disabled?: boolean;

  // ==================== Display Options ====================
  showCounts?: Map<string, number>;
  showDomainIcons?: boolean;
  collapsible?: boolean;
  compact?: boolean;

  // ==================== Presets ====================
  presets?: Array<{
    label: string;
    types: string[];
    icon?: string;
  }>;
  showGlobalControls?: boolean;

  // ==================== Validation ====================
  validate?: (types: string[]) => { valid: boolean; message?: string };
  onValidationChange?: (valid: boolean, message?: string) => void;
}

export function DomainEntityTypeSelector({
  selectedEntityTypes,
  onSelectionChange,
  mode = "select",
  accordionMode = true,
  showCounts,
  showDomainIcons = true,
  collapsible = true,
  compact = false,
  presets,
  showGlobalControls = true,
  minSelection = 0,
  maxSelection = Infinity,
  disabled = false,
  includeDomains,
  excludeDomains,
  defaultExpanded = [],
  validate,
  onValidationChange,
}: DomainEntityTypeSelectorProps) {
  // State
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(defaultExpanded)
  );

  // Get entity types from domain registry
  const entityTypesByDomain = useMemo(() => {
    let types = domainRegistry.getEntityTypesByDomain();

    if (includeDomains) {
      types = Object.fromEntries(
        Object.entries(types).filter(([domain]) =>
          includeDomains.includes(domain)
        )
      );
    }

    if (excludeDomains) {
      types = Object.fromEntries(
        Object.entries(types).filter(
          ([domain]) => !excludeDomains.includes(domain)
        )
      );
    }

    return types;
  }, [includeDomains, excludeDomains]);

  // Convert to Set for O(1) lookups
  const selectedSet = useMemo(
    () => new Set(selectedEntityTypes),
    [selectedEntityTypes]
  );

  // Toggle entity type
  const toggleEntityType = useCallback(
    (type: string) => {
      if (disabled) return;

      const isSelected = selectedSet.has(type);
      const newSelection = isSelected
        ? selectedEntityTypes.filter((t) => t !== type)
        : [...selectedEntityTypes, type];

      // Validate constraints
      if (
        newSelection.length < minSelection ||
        newSelection.length > maxSelection
      ) {
        return;
      }

      // Custom validation
      if (validate) {
        const validation = validate(newSelection);
        if (!validation.valid) {
          onValidationChange?.(false, validation.message);
          return;
        }
        onValidationChange?.(true);
      }

      onSelectionChange(newSelection);
    },
    [
      disabled,
      selectedSet,
      selectedEntityTypes,
      onSelectionChange,
      minSelection,
      maxSelection,
      validate,
      onValidationChange,
    ]
  );

  // Toggle domain
  const toggleDomain = useCallback(
    (domain: string, types: string[]) => {
      if (disabled) return;

      const allSelected = types.every((t) => selectedSet.has(t));

      const newSelection = allSelected
        ? selectedEntityTypes.filter((t) => !types.includes(t))
        : [...new Set([...selectedEntityTypes, ...types])];

      // Validate constraints
      if (
        newSelection.length < minSelection ||
        newSelection.length > maxSelection
      ) {
        return;
      }

      // Custom validation
      if (validate) {
        const validation = validate(newSelection);
        if (!validation.valid) {
          onValidationChange?.(false, validation.message);
          return;
        }
        onValidationChange?.(true);
      }

      onSelectionChange(newSelection);
    },
    [
      disabled,
      selectedSet,
      selectedEntityTypes,
      onSelectionChange,
      minSelection,
      maxSelection,
      validate,
      onValidationChange,
    ]
  );

  // Toggle expanded
  const toggleExpanded = useCallback(
    (domain: string) => {
      if (!collapsible) return;

      setExpandedDomains((prev) => {
        const next = new Set(prev);

        if (accordionMode) {
          // Close all, open only this one
          return next.has(domain) ? new Set() : new Set([domain]);
        } else {
          // Toggle individual domain
          if (next.has(domain)) {
            next.delete(domain);
          } else {
            next.add(domain);
          }
          return next;
        }
      });
    },
    [accordionMode, collapsible]
  );

  // Get domain state
  const getDomainState = useCallback(
    (types: string[]) => {
      const selectedCount = types.filter((t) => selectedSet.has(t)).length;

      if (selectedCount === 0) return "none";
      if (selectedCount === types.length) return "all";
      return "partial";
    },
    [selectedSet]
  );

  // Apply preset
  const applyPreset = useCallback(
    (types: string[]) => {
      if (disabled) return;

      // Compute candidate selection - deduplicate and filter to valid types
      const allValidTypes = new Set(Object.values(entityTypesByDomain).flat());
      const candidateSelection = [...new Set(types)].filter((t) =>
        allValidTypes.has(t)
      );

      // Enforce max constraint by trimming if needed
      let finalSelection = candidateSelection;
      if (finalSelection.length > maxSelection) {
        finalSelection = finalSelection.slice(0, maxSelection);
      }

      // Check min constraint
      if (finalSelection.length < minSelection) {
        onValidationChange?.(
          false,
          `Preset requires at least ${minSelection} types, but only ${finalSelection.length} valid types available`
        );
        return;
      }

      // Custom validation
      if (validate) {
        const validation = validate(finalSelection);
        if (!validation.valid) {
          onValidationChange?.(false, validation.message);
          return;
        }
        onValidationChange?.(true);
      }

      onSelectionChange(finalSelection);
    },
    [
      disabled,
      entityTypesByDomain,
      maxSelection,
      minSelection,
      validate,
      onValidationChange,
      onSelectionChange,
    ]
  );

  // Select all
  const selectAll = useCallback(() => {
    if (disabled) return;

    // Compute candidate selection - all available types
    const allTypes = Object.values(entityTypesByDomain).flat();

    // Deduplicate first (by creating a Set to remove duplicates)
    const uniqueTypes = Array.from(new Set(allTypes));

    // Enforce max constraint by trimming the deduplicated list
    let finalSelection = uniqueTypes;
    if (finalSelection.length > maxSelection) {
      finalSelection = finalSelection.slice(0, maxSelection);
    }

    // Check min constraint (should always pass for select all, but validate anyway)
    if (finalSelection.length < minSelection) {
      onValidationChange?.(
        false,
        `Cannot select all: only ${finalSelection.length} types available but ${minSelection} required`
      );
      return;
    }

    // Custom validation
    if (validate) {
      const validation = validate(finalSelection);
      if (!validation.valid) {
        onValidationChange?.(false, validation.message);
        return;
      }
      onValidationChange?.(true);
    }

    onSelectionChange(finalSelection);
  }, [
    disabled,
    entityTypesByDomain,
    maxSelection,
    minSelection,
    validate,
    onValidationChange,
    onSelectionChange,
  ]);

  // Clear all
  const clearAll = useCallback(() => {
    if (disabled) return;
    // Only clear if minSelection is 0, otherwise respect the constraint
    if (minSelection === 0) {
      onSelectionChange([]);
    }
  }, [disabled, minSelection, onSelectionChange]);

  const totalSelected = selectedEntityTypes.length;
  const totalAvailable = Object.values(entityTypesByDomain).flat().length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`px-4 border-b border-border bg-muted/30 ${compact ? "py-2" : "py-2.5"}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div
            className={`font-medium text-foreground ${compact ? "text-xs" : "text-sm"}`}
          >
            {mode === "filter" ? "Entity Filters" : "Entity Type Selection"}
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalSelected} selected
          </Badge>
        </div>

        {/* Presets */}
        {presets && presets.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.types)}
                disabled={disabled}
                className={compact ? "text-xs h-7 px-2" : "text-xs"}
              >
                {preset.icon && (
                  <Icon name={preset.icon} size={12} className="mr-1" />
                )}
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {/* Global Controls */}
        {showGlobalControls && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={disabled || totalSelected === totalAvailable}
              className={compact ? "text-xs h-7 px-2" : "text-xs"}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={disabled || totalSelected === 0}
              className={compact ? "text-xs h-7 px-2" : "text-xs"}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Domain Sections */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(entityTypesByDomain).map(([domain, types]) => {
          const isExpanded = expandedDomains.has(domain);
          const domainState = getDomainState(types);
          const domainConfig = domainRegistry.getDomainConfig(domain);
          const domainCount = types.reduce(
            (sum, type) => sum + (showCounts?.get(type) || 0),
            0
          );

          return (
            <div key={domain} className="border-b border-border">
              {/* Domain Header */}
              <div
                className={`px-4 bg-muted/20 ${compact ? "py-1.5" : "py-2"}`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(domain)}
                    disabled={disabled}
                    className="flex items-center gap-2 flex-1 text-left hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {collapsible && (
                      <>
                        {isExpanded ? (
                          <Icon
                            name="chevron-down"
                            size={compact ? 14 : 16}
                            className="text-muted-foreground"
                          />
                        ) : (
                          <Icon
                            name="chevron-right"
                            size={compact ? 14 : 16}
                            className="text-muted-foreground"
                          />
                        )}
                      </>
                    )}
                    {showDomainIcons && domainConfig?.ui.icon && (
                      <span className={compact ? "text-sm" : "text-base"}>
                        {domainConfig.ui.icon}
                      </span>
                    )}
                    <span
                      className={`font-medium text-foreground capitalize ${compact ? "text-xs" : "text-sm"}`}
                    >
                      {domainConfig?.displayName || domain}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({types.length} types)
                    </span>
                    {showCounts && domainCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        • {domainCount} entities
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDomain(domain, types)}
                    disabled={disabled}
                    className="ml-2 px-2 py-1 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      domainState === "all"
                        ? "Deselect all in domain"
                        : "Select all in domain"
                    }
                  >
                    {domainState === "all" ? (
                      <Icon
                        name="check"
                        size={compact ? 10 : 12}
                        className="text-success"
                      />
                    ) : domainState === "none" ? (
                      <Icon
                        name="x"
                        size={compact ? 10 : 12}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <span className="w-3 h-3 block bg-muted-foreground/30 rounded-sm" />
                    )}
                  </button>
                </div>
              </div>

              {/* Entity Type Checkboxes */}
              {(isExpanded || !collapsible) && (
                <div className={`px-4 space-y-1 ${compact ? "py-1" : "py-2"}`}>
                  {types.map((type) => {
                    const isSelected = selectedSet.has(type);
                    const count = showCounts?.get(type) || 0;

                    return (
                      <label
                        key={type}
                        className={`flex items-center justify-between rounded hover:bg-accent/50 cursor-pointer transition-colors group ${
                          compact ? "py-1 px-1.5" : "py-1.5 px-2"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEntityType(type)}
                            disabled={disabled}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span
                            className={`${compact ? "text-xs" : "text-sm"} ${
                              isSelected
                                ? "text-foreground"
                                : "text-muted-foreground"
                            } group-hover:text-foreground transition-colors`}
                          >
                            {type}
                          </span>
                        </div>
                        {showCounts && count > 0 && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              isSelected
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground bg-muted"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
