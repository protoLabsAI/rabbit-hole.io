/**
 * Research Settings Panel
 *
 * UI controls for research page settings (hops, nodeLimit, filters).
 * Uses Zod schemas from @proto/types as single source of truth.
 */

"use client";

import { useState, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import {
  ResearchSettings,
  ResearchSettingsSchema,
  SENTIMENT_OPTIONS,
  HOPS_OPTIONS,
  validateResearchSettings,
} from "@proto/types";
import { DomainEntityTypeSelector } from "@proto/ui/organisms";

interface ResearchSettingsPanelProps {
  currentSettings: ResearchSettings;
  onSettingsChange: (settings: Partial<ResearchSettings>) => void;
  onClose: () => void;
  isOpen: boolean;
  // UI state controls
  showLabels: boolean;
  showEdgeLabels: boolean;
  onUIStateChange: (state: {
    showLabels?: boolean;
    showEdgeLabels?: boolean;
  }) => void;
  // Time window controls
  timeWindow: { from: string; to: string };
  onTimeWindowChange: (timeWindow: { from: string; to: string }) => void;
}

export function ResearchSettingsPanel({
  currentSettings,
  onSettingsChange,
  onClose,
  isOpen,
  showLabels,
  showEdgeLabels,
  onUIStateChange,
  timeWindow,
  onTimeWindowChange,
}: ResearchSettingsPanelProps) {
  const [localSettings, setLocalSettings] =
    useState<ResearchSettings>(currentSettings);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update local state when prop changes
  useEffect(() => {
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  const handleApply = () => {
    // Validate before applying
    const result = validateResearchSettings(localSettings);

    if (!result.success) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaults = ResearchSettingsSchema.parse({});
    setLocalSettings(defaults);
    setValidationError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-4 z-30 w-96 bg-card border border-border rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon name="settings" size={20} className="text-primary" />
          <h3 className="font-semibold text-foreground">Research Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close settings"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* Settings Form */}
      <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Hops Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Network Depth (Hops)
            </label>
            <span className="text-sm text-muted-foreground">
              {localSettings.hops}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={localSettings.hops}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                hops: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {HOPS_OPTIONS.map((opt) => (
              <span key={opt.value} className="text-center flex-1">
                {opt.label}
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2 p-2 bg-accent/50 rounded text-xs text-muted-foreground">
            <Icon name="info" size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              {HOPS_OPTIONS.find((opt) => opt.value === localSettings.hops)
                ?.description || "Select hops"}
              <br />
              <span className="text-primary font-medium">
                AI sees {localSettings.hops + 1} hops
              </span>{" "}
              (loads extra for context)
            </p>
          </div>
        </div>

        {/* Node Limit Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Max Nodes
            </label>
            <span className="text-sm text-muted-foreground">
              {localSettings.nodeLimit}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={localSettings.nodeLimit}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                nodeLimit: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>50</span>
            <span>100</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher values may slow performance on large networks
          </p>
        </div>

        {/* Visual Controls */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Visual Controls
          </label>

          {/* Show Node Labels */}
          <label className="flex items-center justify-between p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Show Node Labels</span>
              <span className="text-xs text-muted-foreground">
                Entity names on graph
              </span>
            </div>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) =>
                onUIStateChange({ showLabels: e.target.checked })
              }
              className="w-4 h-4 accent-primary"
            />
          </label>

          {/* Show Edge Labels */}
          <label className="flex items-center justify-between p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Show Edge Labels</span>
              <span className="text-xs text-muted-foreground">
                Relationship names on connections
              </span>
            </div>
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) =>
                onUIStateChange({ showEdgeLabels: e.target.checked })
              }
              className="w-4 h-4 accent-primary"
            />
          </label>
        </div>

        {/* Sentiment Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Sentiment Filter
          </label>
          <div className="space-y-2">
            {SENTIMENT_OPTIONS.map((sentiment) => {
              const isSelected =
                localSettings.sentiments?.includes(sentiment.value) ?? false;
              const isAllSelected = localSettings.sentiments === null;

              return (
                <label
                  key={sentiment.value}
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected || isSelected}
                    disabled={isAllSelected}
                    onChange={(e) => {
                      if (localSettings.sentiments === null) return;

                      const newSentiments = e.target.checked
                        ? [...(localSettings.sentiments || []), sentiment.value]
                        : (localSettings.sentiments || []).filter(
                            (s) => s !== sentiment.value
                          );

                      setLocalSettings({
                        ...localSettings,
                        sentiments:
                          newSentiments.length === 0 ? null : newSentiments,
                      });
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        sentiment.color === "red"
                          ? "#ef4444"
                          : sentiment.color === "green"
                            ? "#22c55e"
                            : sentiment.color === "orange"
                              ? "#f97316"
                              : "#6b7280",
                    }}
                  />
                  <span className="text-sm text-foreground">
                    {sentiment.label}
                  </span>
                </label>
              );
            })}
          </div>
          <button
            onClick={() =>
              setLocalSettings({ ...localSettings, sentiments: null })
            }
            className="text-xs text-primary hover:underline"
          >
            {localSettings.sentiments === null
              ? "✓ All sentiments"
              : "Show all sentiments"}
          </button>
        </div>

        {/* Entity Types Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Entity Type Filter
            </label>
            <button
              onClick={() =>
                setLocalSettings({ ...localSettings, entityTypes: null })
              }
              className="text-xs text-primary hover:underline"
            >
              {localSettings.entityTypes === null
                ? "✓ All types"
                : "Show all types"}
            </button>
          </div>

          <div className="border border-border rounded-lg h-64 overflow-hidden">
            <DomainEntityTypeSelector
              selectedEntityTypes={localSettings.entityTypes || []}
              onSelectionChange={(types) =>
                setLocalSettings({
                  ...localSettings,
                  entityTypes: types.length === 0 ? null : types,
                })
              }
              mode="filter"
              compact
              accordionMode={false}
              showGlobalControls={false}
              disabled={localSettings.entityTypes === null}
            />
          </div>
        </div>

        {/* Time Window Filter */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Time Range Filter
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                From Date
              </label>
              <input
                type="date"
                value={timeWindow.from}
                onChange={(e) =>
                  onTimeWindowChange({ ...timeWindow, from: e.target.value })
                }
                className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                To Date
              </label>
              <input
                type="date"
                value={timeWindow.to}
                onChange={(e) =>
                  onTimeWindowChange({ ...timeWindow, to: e.target.value })
                }
                className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Filter entities and relationships by date range
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {validationError}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-accent/30">
        <button
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to Defaults
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
