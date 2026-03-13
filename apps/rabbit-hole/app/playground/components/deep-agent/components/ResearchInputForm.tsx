"use client";

import { ALL_ENTITY_TYPES } from "@proto/types";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

export type ResearchDepth = "basic" | "detailed" | "comprehensive";

export interface ResearchInputFormProps {
  entityName: string;
  entityType: string;
  researchDepth: ResearchDepth;
  isLoading: boolean;
  isRunning?: boolean;
  isStopping?: boolean;
  hasStopped?: boolean;
  onEntityNameChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onResearchDepthChange: (value: ResearchDepth) => void;
  onSubmit: () => void;
  onStop?: () => void;
}

export function ResearchInputForm({
  entityName,
  entityType,
  researchDepth,
  isLoading,
  isRunning,
  isStopping,
  hasStopped,
  onEntityNameChange,
  onEntityTypeChange,
  onResearchDepthChange,
  onSubmit,
  onStop,
}: ResearchInputFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="entityName">Entity Name</Label>
        <Input
          id="entityName"
          value={entityName}
          onChange={(e) => onEntityNameChange(e.target.value)}
          placeholder="e.g., Albert Einstein"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entityType">Entity Type</Label>
        <Select
          value={entityType}
          onValueChange={onEntityTypeChange}
          disabled={isLoading}
        >
          <SelectTrigger id="entityType">
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            {ALL_ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Research Depth</Label>
        <div className="flex gap-2">
          {(["basic", "detailed", "comprehensive"] as ResearchDepth[]).map(
            (depth) => (
              <Button
                key={depth}
                variant={researchDepth === depth ? "default" : "outline"}
                onClick={() => onResearchDepthChange(depth)}
                size="sm"
                disabled={isLoading}
              >
                {depth.charAt(0).toUpperCase() + depth.slice(1)}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Button states: Running -> Stopping -> Stopped -> Start */}
      {isRunning ? (
        <Button
          onClick={onStop}
          variant="destructive"
          disabled={isStopping}
          className="w-full"
        >
          {isStopping ? "Stopping..." : "Stop Research"}
        </Button>
      ) : hasStopped ? (
        <div className="space-y-2">
          <div className="text-sm text-amber-600 text-center py-2 bg-amber-50 rounded border border-amber-200">
            Research stopped. Backend may finish current step.
          </div>
          <Button onClick={onSubmit} disabled={!entityName} className="w-full">
            Start New Research
          </Button>
        </div>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isLoading || !entityName}
          className="w-full"
        >
          {isLoading ? "Starting..." : "Start Research"}
        </Button>
      )}
    </div>
  );
}
