import { Icon } from "@protolabsai/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@protolabsai/ui/atoms";

import { PROVIDER_LABELS, CATEGORY_LABELS } from "../../constants";
import type { ProviderSettingsProps } from "../../types";

import { ParameterControls } from "./ParameterControls";

export function ProviderSettings({
  config,
  onConfigChange,
  currentModel,
  onValidate,
  validationResults = [],
  showResetButton = false,
  onReset,
}: ProviderSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provider Settings</CardTitle>
        <CardDescription>Configure LLM provider and model</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={config.provider}
            onValueChange={(value) =>
              onConfigChange({ provider: value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={config.category}
            onValueChange={(value) =>
              onConfigChange({ category: value as any })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Will use:{" "}
            <span className="font-mono bg-muted px-1 rounded">
              {currentModel}
            </span>
          </div>
          {validationResults.length > 0 && (
            <div className="space-y-1">
              {validationResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`text-xs px-2 py-1 rounded ${
                    result.valid
                      ? "bg-success-50 text-success-700"
                      : "bg-error-50 text-error-700"
                  }`}
                >
                  {result.valid ? (
                    <div className="flex items-center gap-1">
                      <Icon name="CheckCircle" className="h-3 w-3" />
                      <span>Valid</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1 font-medium">
                        <Icon name="AlertCircle" className="h-3 w-3" />
                        <span>Invalid: {result.model}</span>
                      </div>
                      {result.suggestion && (
                        <div className="mt-1 ml-4">
                          Suggestion: {result.suggestion}
                          {result.similarity && (
                            <span className="ml-1">
                              ({result.similarity}% match)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {onValidate && showResetButton && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onValidate}>
                Validate
              </Button>
              {onReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReset(config.category)}
                >
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        <ParameterControls config={config} onConfigChange={onConfigChange} />
      </CardContent>
    </Card>
  );
}
