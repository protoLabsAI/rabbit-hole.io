/**
 * Time Slice Settings Component
 *
 * Controls for time window configuration with real-time validation
 */

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

import type { TimeWindow } from "./AtlasSettingsSchemas";
import { timeWindowSchema } from "./AtlasSettingsSchemas";
import { DateRangeValidation } from "./ValidationFeedback";

interface TimeSliceSettingsProps {
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: Partial<TimeWindow>) => void;
  className?: string;
}

export function TimeSliceSettings({
  timeWindow,
  onTimeWindowChange,
  className,
}: TimeSliceSettingsProps) {
  // Real-time validation
  const validation = useMemo(() => {
    const result = timeWindowSchema.safeParse(timeWindow);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.issues.map((e) => e.message),
      hasDateRangeError: result.success
        ? false
        : result.error.issues.some(
            (e) => e.path.includes("to") || e.path.includes("range_warning")
          ),
    };
  }, [timeWindow]);

  return (
    <Card
      className={cn(
        "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-900 dark:text-green-100">
          Time Window
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Label className="text-xs text-green-700 dark:text-green-300 mb-1 block">
              From
            </Label>
            <Input
              type="date"
              value={timeWindow.from}
              onChange={(e) => onTimeWindowChange({ from: e.target.value })}
              className={cn(
                "border-green-300 dark:border-green-700 bg-background text-xs",
                validation.hasDateRangeError &&
                  "border-red-300 dark:border-red-700"
              )}
            />
          </div>

          <div className="flex-1">
            <Label className="text-xs text-green-700 dark:text-green-300 mb-1 block">
              To
            </Label>
            <Input
              type="date"
              value={timeWindow.to}
              onChange={(e) => onTimeWindowChange({ to: e.target.value })}
              className={cn(
                "border-green-300 dark:border-green-700 bg-background text-xs",
                validation.hasDateRangeError &&
                  "border-red-300 dark:border-red-700"
              )}
            />
          </div>
        </div>

        {/* Validation feedback */}
        <DateRangeValidation
          fromDate={timeWindow.from}
          toDate={timeWindow.to}
        />
      </CardContent>
    </Card>
  );
}
