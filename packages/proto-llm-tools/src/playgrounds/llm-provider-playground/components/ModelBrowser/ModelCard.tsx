import { Badge } from "@proto/ui/atoms";

import type { ProviderModel } from "../../types";

interface ModelCardProps {
  model: ProviderModel;
  isActive: boolean;
  categories: string[];
  currentCategory: string;
  onClick: () => void;
}

export function ModelCard({
  model,
  isActive,
  categories,
  currentCategory,
  onClick,
}: ModelCardProps) {
  return (
    <div
      className={`border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer ${
        isActive ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate">{model.name}</div>
            {isActive && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          {model.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {model.description}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {categories.length > 0 && (
              <>
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={cat === currentCategory ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {cat}
                  </Badge>
                ))}
              </>
            )}
            {model.contextWindow && (
              <Badge variant="outline" className="text-xs">
                {model.contextWindow.toLocaleString()} tokens
              </Badge>
            )}
            {model.capabilities?.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs opacity-60">
                {cap}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
