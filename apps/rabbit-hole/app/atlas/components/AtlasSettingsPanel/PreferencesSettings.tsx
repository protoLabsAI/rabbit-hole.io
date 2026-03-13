/**
 * Preferences Settings Component
 *
 * Controls for user preference configuration
 */

import { Icon } from "@proto/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

import type { AtlasPreferences } from "./useAtlasPreferences";

interface PreferencesSettingsProps {
  preferences: AtlasPreferences;
  onPreferencesChange: (preferences: Partial<AtlasPreferences>) => void;
  onResetPreferences: () => void;
  className?: string;
}

const POSITION_OPTIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
] as const;

const LAYOUT_OPTIONS = [
  { value: "atlas", label: "Atlas Layout" },
  { value: "force", label: "Force Layout" },
  { value: "breadthfirst", label: "Breadth First" },
] as const;

const HOP_OPTIONS = [1, 2, 3, 4, 5];
const NODE_LIMIT_OPTIONS = [25, 50, 75, 100, 150];

export function PreferencesSettings({
  preferences,
  onPreferencesChange,
  onResetPreferences,
  className,
}: PreferencesSettingsProps) {
  return (
    <Card
      className={cn(
        "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Icon name="settings" size={16} />
          User Preferences
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings Panel Position */}
        <div>
          <Label className="text-xs text-slate-700 dark:text-slate-300 mb-1 block">
            Settings Panel Position
          </Label>
          <Select
            value={preferences.settingsPosition}
            onValueChange={(value) =>
              onPreferencesChange({
                settingsPosition: value as AtlasPreferences["settingsPosition"],
              })
            }
          >
            <SelectTrigger className="border-slate-300 dark:border-slate-700 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Default Layout */}
        <div>
          <Label className="text-xs text-slate-700 dark:text-slate-300 mb-1 block">
            Default Layout Type
          </Label>
          <Select
            value={preferences.defaultLayoutType}
            onValueChange={(value) =>
              onPreferencesChange({
                defaultLayoutType:
                  value as AtlasPreferences["defaultLayoutType"],
              })
            }
          >
            <SelectTrigger className="border-slate-300 dark:border-slate-700 bg-background text-xs">
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
        </div>

        {/* Default View Options */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-700 dark:text-slate-300 block">
            Default View Options
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="default-show-labels"
                checked={preferences.defaultShowLabels}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ defaultShowLabels: !!checked })
                }
              />
              <Label
                htmlFor="default-show-labels"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Show labels by default
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="default-highlight-connections"
                checked={preferences.defaultHighlightConnections}
                onCheckedChange={(checked) =>
                  onPreferencesChange({
                    defaultHighlightConnections: !!checked,
                  })
                }
              />
              <Label
                htmlFor="default-highlight-connections"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Highlight connections by default
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="default-show-timeline"
                checked={preferences.defaultShowTimeline}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ defaultShowTimeline: !!checked })
                }
              />
              <Label
                htmlFor="default-show-timeline"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Show timeline by default
              </Label>
            </div>
          </div>
        </div>

        {/* Default Ego Network Settings */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-700 dark:text-slate-300 block">
            Default Ego Network Settings
          </Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                Hops
              </Label>
              <Select
                value={preferences.defaultEgoHops.toString()}
                onValueChange={(value) =>
                  onPreferencesChange({ defaultEgoHops: parseInt(value) })
                }
              >
                <SelectTrigger className="border-slate-300 dark:border-slate-700 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOP_OPTIONS.map((hops) => (
                    <SelectItem key={hops} value={hops.toString()}>
                      {hops} Hop{hops > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                Node Limit
              </Label>
              <Select
                value={preferences.defaultEgoNodeLimit.toString()}
                onValueChange={(value) =>
                  onPreferencesChange({ defaultEgoNodeLimit: parseInt(value) })
                }
              >
                <SelectTrigger className="border-slate-300 dark:border-slate-700 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_LIMIT_OPTIONS.map((limit) => (
                    <SelectItem key={limit} value={limit.toString()}>
                      {limit} Nodes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Performance & Validation Options */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-700 dark:text-slate-300 block">
            Interface Options
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-performance-warnings"
                checked={preferences.enablePerformanceWarnings}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ enablePerformanceWarnings: !!checked })
                }
              />
              <Label
                htmlFor="enable-performance-warnings"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Show performance warnings
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-validation-feedback"
                checked={preferences.enableValidationFeedback}
                onCheckedChange={(checked) =>
                  onPreferencesChange({ enableValidationFeedback: !!checked })
                }
              />
              <Label
                htmlFor="enable-validation-feedback"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Show validation feedback
              </Label>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetPreferences}
            className="w-full text-xs"
          >
            <Icon name="refresh" size={12} className="mr-1" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
