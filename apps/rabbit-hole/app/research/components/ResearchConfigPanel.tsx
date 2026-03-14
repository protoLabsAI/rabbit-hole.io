"use client";

/**
 * ResearchConfigPanel
 *
 * Collapsible panel above the chat input that lets users configure
 * research depth, max entities, max recursion depth, and search providers
 * before starting a research session.
 */

import { useState } from "react";

import { Icon } from "@proto/icon-system";
import type { ResearchDepth, ResearchSessionConfig } from "@proto/types";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  Slider,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

const DEPTH_OPTIONS: {
  value: ResearchDepth;
  label: string;
  description: string;
}[] = [
  {
    value: "basic",
    label: "Shallow",
    description: "Single-pass research — fastest results",
  },
  {
    value: "detailed",
    label: "Standard",
    description: "2–3 passes with gap-filling (default)",
  },
  {
    value: "comprehensive",
    label: "Deep",
    description: "5+ passes with recursive entity expansion",
  },
];

const SEARCH_PROVIDERS = [
  { id: "tavily", label: "Tavily" },
  { id: "duckduckgo", label: "DuckDuckGo" },
  { id: "wikipedia", label: "Wikipedia" },
] as const;

interface ResearchConfigPanelProps {
  config: ResearchSessionConfig;
  onConfigChange: (config: ResearchSessionConfig) => void;
}

export function ResearchConfigPanel({
  config,
  onConfigChange,
}: ResearchConfigPanelProps) {
  const [open, setOpen] = useState(false);

  const updateConfig = (partial: Partial<ResearchSessionConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const toggleProvider = (providerId: string) => {
    const providers = config.searchProviders.includes(providerId)
      ? config.searchProviders.filter((p) => p !== providerId)
      : [...config.searchProviders, providerId];
    // Ensure at least one provider is always selected
    if (providers.length > 0) {
      updateConfig({ searchProviders: providers });
    }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-t border-border"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-4 py-2 h-auto font-normal"
        >
          <div className="flex items-center gap-2">
            <Icon name="settings" size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Research Settings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {DEPTH_OPTIONS.find((o) => o.value === config.depth)?.label ??
                config.depth}{" "}
              · {config.maxEntities} entities
            </span>
            <Icon
              name="chevron-down"
              size={16}
              className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {/* Depth selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Research Depth</Label>
          <Select
            value={config.depth}
            onValueChange={(value: ResearchDepth) =>
              updateConfig({ depth: value })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Max entities slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Max Entities</Label>
            <span className="text-xs text-muted-foreground">
              {config.maxEntities}
            </span>
          </div>
          <Slider
            value={[config.maxEntities]}
            onValueChange={([value]) => updateConfig({ maxEntities: value })}
            min={10}
            max={200}
            step={10}
            className="w-full"
          />
        </div>

        {/* Max depth slider — only for comprehensive mode */}
        {config.depth === "comprehensive" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Max Depth</Label>
              <span className="text-xs text-muted-foreground">
                {config.maxDepth}
              </span>
            </div>
            <Slider
              value={[config.maxDepth]}
              onValueChange={([value]) => updateConfig({ maxDepth: value })}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Search provider toggles */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Search Providers</Label>
          <div className="space-y-2">
            {SEARCH_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between"
              >
                <Label className="text-xs" htmlFor={`provider-${provider.id}`}>
                  {provider.label}
                </Label>
                <Switch
                  id={`provider-${provider.id}`}
                  checked={config.searchProviders.includes(provider.id)}
                  onCheckedChange={() => toggleProvider(provider.id)}
                  disabled={
                    config.searchProviders.length === 1 &&
                    config.searchProviders.includes(provider.id)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
