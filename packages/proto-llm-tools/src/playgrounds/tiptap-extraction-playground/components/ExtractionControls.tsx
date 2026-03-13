"use client";

import { useMemo } from "react";

import { Icon } from "@proto/icon-system";
import { Button, Label, RadioGroup, RadioGroupItem, Slider } from "@proto/ui";

import type { ExtractionMode } from "../../../workflows/multi-phase-extraction";
import { getAllDomainUIMetadata } from "../../../workflows/multi-phase-extraction-utils";

interface ExtractionControlsProps {
  domains: string[];
  onDomainsChange: (domains: string[]) => void;
  mode: ExtractionMode;
  onModeChange: (mode: ExtractionMode) => void;
  confidenceThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onExtract: () => void;
  isLoading: boolean;
}

const MODES = [
  {
    value: "discover" as const,
    label: "Discover",
    description: "Find entities only",
  },
  {
    value: "structure" as const,
    label: "Structure",
    description: "Required fields",
  },
  {
    value: "enrich" as const,
    label: "Enrich",
    description: "Complete profiles",
  },
  {
    value: "deep_dive" as const,
    label: "Deep Dive",
    description: "Including relationships",
  },
];

export function ExtractionControls({
  domains,
  onDomainsChange,
  mode,
  onModeChange,
  confidenceThreshold,
  onThresholdChange,
  onExtract,
  isLoading,
}: ExtractionControlsProps) {
  // Get available domains from domain registry
  const availableDomains = useMemo(() => {
    return getAllDomainUIMetadata().filter((d) => d.category === "core");
  }, []);

  const toggleDomain = (domain: string) => {
    if (domains.includes(domain)) {
      onDomainsChange(domains.filter((d) => d !== domain));
    } else {
      onDomainsChange([...domains, domain]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Domains to Extract
        </Label>
        <div className="flex flex-wrap gap-2">
          {availableDomains.map((domain) => (
            <Button
              key={domain.value}
              variant={domains.includes(domain.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDomain(domain.value)}
              className="text-xs"
              style={
                domains.includes(domain.value)
                  ? { backgroundColor: domain.color, borderColor: domain.color }
                  : undefined
              }
            >
              <span className="mr-1">{domain.icon}</span>
              {domain.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">
          Extraction Mode
        </Label>
        <RadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ExtractionMode)}
        >
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <div
                key={m.value}
                className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => onModeChange(m.value)}
              >
                <RadioGroupItem value={m.value} id={m.value} />
                <Label
                  htmlFor={m.value}
                  className="flex flex-col cursor-pointer flex-1"
                >
                  <span className="font-medium text-sm">{m.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.description}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">
          Confidence Threshold: {Math.round(confidenceThreshold * 100)}%
        </Label>
        <Slider
          value={[confidenceThreshold]}
          onValueChange={([value]) => onThresholdChange(value)}
          min={0.5}
          max={0.95}
          step={0.05}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Only show extractions with confidence above this threshold
        </p>
      </div>

      <Button
        onClick={onExtract}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            <Icon name="sparkles" className="mr-2 h-4 w-4" />
            Extract Entities
          </>
        )}
      </Button>
    </div>
  );
}
