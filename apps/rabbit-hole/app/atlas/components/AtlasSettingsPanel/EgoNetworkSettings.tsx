/**
 * Ego Network Settings Component
 *
 * Controls for ego network configuration with real-time validation
 */

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

import type { EgoSettings } from "./AtlasSettingsSchemas";
import { egoSettingsSchema } from "./AtlasSettingsSchemas";
import { RangeValidation, FieldValidation } from "./ValidationFeedback";

interface EgoNetworkSettingsProps {
  egoSettings: EgoSettings;
  onEgoSettingsChange: (settings: Partial<EgoSettings>) => void;
  existingEntities: Array<{ id: string; label: string; entityType: string }>;
  onCenterEntitySelect: (entityId: string | null, entityLabel?: string) => void;
  className?: string;
}

const HOP_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const NODE_LIMIT_OPTIONS = [25, 50, 100, 150];

export function EgoNetworkSettings({
  egoSettings,
  onEgoSettingsChange,
  existingEntities,
  onCenterEntitySelect,
  className,
}: EgoNetworkSettingsProps) {
  // Real-time validation
  const validation = useMemo(() => {
    const result = egoSettingsSchema.safeParse(egoSettings);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.issues.map((e) => e.message),
      fieldErrors: result.success
        ? {}
        : result.error.issues.reduce(
            (acc, error) => {
              const path = error.path[0] as string;
              if (!acc[path]) acc[path] = [];
              acc[path].push(error.message);
              return acc;
            },
            {} as Record<string, string[]>
          ),
    };
  }, [egoSettings]);

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-primary">
          Ego Network Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Center Entity Selection */}
        <div>
          <Label className="text-xs text-primary mb-1 block">
            Center Entity
          </Label>
          <Select
            value={egoSettings.centerEntity || ""}
            onValueChange={(value) => {
              const entity = existingEntities.find((e) => e.id === value);
              onCenterEntitySelect(value || null, entity?.label);
            }}
          >
            <SelectTrigger className="w-full border-primary/30 bg-background text-xs">
              <SelectValue placeholder="Select entity..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Select entity...</SelectItem>
              {existingEntities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.label} ({entity.entityType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldValidation
            fieldName="Center Entity"
            value={egoSettings.centerEntity}
            errors={validation.fieldErrors.centerEntity}
            isValid={!!egoSettings.centerEntity}
          />
        </div>

        {/* Hops and Node Limit */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Label className="text-xs text-primary mb-1 block">Hops</Label>
            <Select
              value={egoSettings.hops.toString()}
              onValueChange={(value) =>
                onEgoSettingsChange({ hops: parseInt(value) })
              }
            >
              <SelectTrigger
                className={cn(
                  "border-primary/30 bg-background text-xs",
                  validation.fieldErrors.hops &&
                    "border-red-300 dark:border-red-700"
                )}
              >
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
            <RangeValidation
              value={egoSettings.hops}
              min={1}
              max={10}
              optimal={{ min: 1, max: 3 }}
              unit=" hops"
            />
          </div>

          <div className="flex-1">
            <Label className="text-xs text-primary mb-1 block">
              Node Limit
            </Label>
            <Select
              value={egoSettings.nodeLimit.toString()}
              onValueChange={(value) =>
                onEgoSettingsChange({ nodeLimit: parseInt(value) })
              }
            >
              <SelectTrigger
                className={cn(
                  "border-primary/30 bg-background text-xs",
                  validation.fieldErrors.nodeLimit &&
                    "border-red-300 dark:border-red-700"
                )}
              >
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
            <RangeValidation
              value={egoSettings.nodeLimit}
              min={25}
              max={150}
              optimal={{ min: 25, max: 100 }}
              unit=" nodes"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
