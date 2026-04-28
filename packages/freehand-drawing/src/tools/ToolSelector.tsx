import { Icon } from "@protolabsai/icon-system";
import { cn } from "@protolabsai/ui";

import { TOOL_REGISTRY, type ToolType } from "./registry";

/**
 * Tool Selector Grid
 *
 * Displays available tools as icon buttons in a grid layout.
 * Supports categorization and active state indication.
 */

interface ToolSelectorProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

export function ToolSelector({ activeTool, onToolChange }: ToolSelectorProps) {
  const tools = Object.values(TOOL_REGISTRY);

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Tools
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.type}
            onClick={() => onToolChange(tool.type)}
            className={cn(
              "p-2.5 rounded-md transition-all flex items-center justify-center",
              activeTool === tool.type
                ? "bg-primary/20 text-primary ring-2 ring-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={`${tool.name} - ${tool.description}`}
          >
            <Icon name={tool.icon as any} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
