/**
 * Layout Settings Component
 *
 * Controls for graph layout algorithm selection
 */

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

export interface LayoutSettingsProps {
  layoutType: "breadthfirst" | "force" | "atlas";
  onLayoutTypeChange: (type: "breadthfirst" | "force" | "atlas") => void;
  className?: string;
}

const LAYOUT_OPTIONS = [
  {
    value: "atlas",
    label: "🎯 Atlas Clusters",
    description: "Groups entities by type with clustering",
  },
  {
    value: "breadthfirst",
    label: "🌳 Breadth-First",
    description: "Tree-like hierarchy spreading outward",
  },
  {
    value: "force",
    label: "⚡ Force-Directed",
    description: "Physics simulation with edge optimization",
  },
] as const;

export function LayoutSettings({
  layoutType,
  onLayoutTypeChange,
  className,
}: LayoutSettingsProps) {
  const currentOption = LAYOUT_OPTIONS.find(
    (option) => option.value === layoutType
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-semibold text-foreground">
        Layout Algorithm
      </Label>

      <Select
        value={layoutType}
        onValueChange={(value) =>
          onLayoutTypeChange(value as typeof layoutType)
        }
      >
        <SelectTrigger className="w-full bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentOption && (
        <p className="text-xs text-muted-foreground">
          {currentOption.description}
        </p>
      )}
    </div>
  );
}
