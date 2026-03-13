/**
 * Edge Optimization Status Component
 *
 * Read-only display of current edge optimization settings and statistics
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@proto/ui/atoms";
import {
  shouldShowEdgeLabels,
  getViewModeEdgeOptions,
  type ViewMode,
} from "@proto/utils/atlas";

import { cn } from "@/lib/utils";

export interface EdgeOptimizationStatusProps {
  viewMode: ViewMode;
  showLabels: boolean;
  edgeCount: number;
  className?: string;
}

export function EdgeOptimizationStatus({
  viewMode,
  showLabels,
  edgeCount,
  className,
}: EdgeOptimizationStatusProps) {
  const shouldShowLabels = shouldShowEdgeLabels(viewMode, showLabels);
  const edgeOptions = getViewModeEdgeOptions(viewMode);

  const getViewModeDescription = (mode: ViewMode) => {
    switch (mode) {
      case "full-atlas":
        return "🌐 Atlas mode: Labels hidden, edges deduplicated for clarity";
      case "ego":
        return "🎯 Ego mode: Labels visible, all edges shown for detail";
      case "community":
        return "🏘️ Community mode: Labels hidden, single edge per pair";
      case "timeslice":
        return "⏰ Timeslice mode: Labels hidden, most recent edges shown";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground">
          Edge Optimization
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Relationship Labels:</span>
            <span
              className={cn(
                "font-medium",
                shouldShowLabels ? "text-green-600" : "text-orange-600"
              )}
            >
              {shouldShowLabels ? "Visible" : "Hidden"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Edge Deduplication:</span>
            <span
              className={cn(
                "font-medium",
                edgeOptions.deduplicate
                  ? "text-blue-600"
                  : "text-muted-foreground"
              )}
            >
              {edgeOptions.deduplicate ? "Active" : "Off"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Edges Displayed:</span>
            <span className="font-medium text-foreground">
              {edgeCount} edges
            </span>
          </div>

          <Separator className="my-2" />

          <div className="text-xs text-muted-foreground">
            {getViewModeDescription(viewMode)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
