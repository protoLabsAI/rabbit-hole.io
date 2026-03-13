import { Label, Slider } from "@proto/ui/atoms";

import type { PlaygroundConfig } from "../../types";

interface ParameterControlsProps {
  config: PlaygroundConfig;
  onConfigChange: (config: Partial<PlaygroundConfig>) => void;
}

export function ParameterControls({
  config,
  onConfigChange,
}: ParameterControlsProps) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Temperature</Label>
          <span className="text-sm text-muted-foreground">
            {config.temperature.toFixed(2)}
          </span>
        </div>
        <Slider
          value={[config.temperature]}
          onValueChange={([value]) => onConfigChange({ temperature: value })}
          min={0}
          max={2}
          step={0.01}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Max Tokens</Label>
          <span className="text-sm text-muted-foreground">
            {config.maxTokens}
          </span>
        </div>
        <Slider
          value={[config.maxTokens]}
          onValueChange={([value]) => onConfigChange({ maxTokens: value })}
          min={100}
          max={4000}
          step={100}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Top P</Label>
          <span className="text-sm text-muted-foreground">
            {config.topP?.toFixed(2)}
          </span>
        </div>
        <Slider
          value={[config.topP || 1.0]}
          onValueChange={([value]) => onConfigChange({ topP: value })}
          min={0}
          max={1}
          step={0.01}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Frequency Penalty</Label>
          <span className="text-sm text-muted-foreground">
            {config.frequencyPenalty?.toFixed(2)}
          </span>
        </div>
        <Slider
          value={[config.frequencyPenalty || 0]}
          onValueChange={([value]) =>
            onConfigChange({ frequencyPenalty: value })
          }
          min={-2}
          max={2}
          step={0.01}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Presence Penalty</Label>
          <span className="text-sm text-muted-foreground">
            {config.presencePenalty?.toFixed(2)}
          </span>
        </div>
        <Slider
          value={[config.presencePenalty || 0]}
          onValueChange={([value]) =>
            onConfigChange({ presencePenalty: value })
          }
          min={-2}
          max={2}
          step={0.01}
        />
      </div>
    </>
  );
}
