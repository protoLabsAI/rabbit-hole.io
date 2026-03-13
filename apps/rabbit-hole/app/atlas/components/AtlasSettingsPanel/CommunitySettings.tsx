/**
 * Community Settings Component
 *
 * Controls for community view configuration with real-time validation
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

import { communitySettingsSchema } from "./AtlasSettingsSchemas";
import { FieldValidation, ValidationMessage } from "./ValidationFeedback";

interface CommunitySettingsProps {
  communityId: number | null;
  onCommunityIdChange: (id: number | null) => void;
  className?: string;
}

export function CommunitySettings({
  communityId,
  onCommunityIdChange,
  className,
}: CommunitySettingsProps) {
  // Real-time validation
  const validation = useMemo(() => {
    const result = communitySettingsSchema.safeParse({ communityId });
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.issues.map((e) => e.message),
    };
  }, [communityId]);

  return (
    <Card
      className={cn(
        "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-purple-900 dark:text-purple-100">
          Community Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-purple-700 dark:text-purple-300 mb-1 block">
            Community ID
          </Label>
          <Input
            type="number"
            value={communityId?.toString() || ""}
            onChange={(e) =>
              onCommunityIdChange(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            placeholder="Enter community ID (0-100)"
            className={cn(
              "border-purple-300 dark:border-purple-700 bg-background text-xs",
              !validation.isValid && "border-red-300 dark:border-red-700"
            )}
            min={0}
            max={100}
          />
          <FieldValidation
            fieldName="Community ID"
            value={communityId}
            errors={validation.errors}
            isValid={validation.isValid}
          />
        </div>

        <ValidationMessage
          message="💡 Run 'pnpm run db:communities' to detect communities first"
          type="info"
        />
      </CardContent>
    </Card>
  );
}
