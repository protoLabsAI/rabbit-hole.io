/**
 * View Mode Settings Component
 *
 * Dropdown for selecting atlas view mode with descriptions
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

export interface ViewModeSettingsProps {
  value: "full-atlas" | "ego" | "community" | "timeslice";
  onValueChange: (value: string) => void;
  className?: string;
}

const VIEW_MODE_OPTIONS = [
  {
    value: "full-atlas",
    label: "🌐 Full Atlas",
    description: "Complete entity network (traditional)",
  },
  {
    value: "ego",
    label: "🎯 Ego Network",
    description: "Focused entity + neighbors (50-150 nodes)",
  },
  {
    value: "community",
    label: "🏘️ Community View",
    description: "Community cluster from detection (100-500 nodes)",
  },
  {
    value: "timeslice",
    label: "⏰ Time Slice",
    description: "Activity within time window (200-1000 nodes)",
  },
] as const;

export function ViewModeSettings({
  value,
  onValueChange,
  className,
}: ViewModeSettingsProps) {
  const currentOption = VIEW_MODE_OPTIONS.find(
    (option) => option.value === value
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-semibold text-foreground">View Mode</Label>

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_MODE_OPTIONS.map((option) => (
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
