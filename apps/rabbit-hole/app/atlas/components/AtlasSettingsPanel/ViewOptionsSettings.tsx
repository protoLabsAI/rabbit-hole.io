/**
 * View Options Settings Component
 *
 * Checkbox controls for various display options
 */

import { Checkbox, Label } from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

import type { ViewOptions } from "./AtlasSettingsSchemas";

export interface ViewOptionsSettingsProps {
  viewOptions: ViewOptions;
  onViewOptionsChange: (options: Partial<ViewOptions>) => void;
  className?: string;
}

export function ViewOptionsSettings({
  viewOptions,
  onViewOptionsChange,
  className,
}: ViewOptionsSettingsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-semibold text-foreground">
        View Options
      </Label>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showTimeline"
            checked={viewOptions.showTimeline}
            onCheckedChange={(checked) =>
              onViewOptionsChange({ showTimeline: !!checked })
            }
          />
          <Label
            htmlFor="showTimeline"
            className="text-sm text-foreground cursor-pointer"
          >
            Show Timeline Chart
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showLabels"
            checked={viewOptions.showLabels}
            onCheckedChange={(checked) =>
              onViewOptionsChange({ showLabels: !!checked })
            }
          />
          <Label
            htmlFor="showLabels"
            className="text-sm text-foreground cursor-pointer"
          >
            Show Entity Labels
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="highlightConnections"
            checked={viewOptions.highlightConnections}
            onCheckedChange={(checked) =>
              onViewOptionsChange({ highlightConnections: !!checked })
            }
          />
          <Label
            htmlFor="highlightConnections"
            className="text-sm text-foreground cursor-pointer"
          >
            Highlight Connections on Select
          </Label>
        </div>
      </div>
    </div>
  );
}
