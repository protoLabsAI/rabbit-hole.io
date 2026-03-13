import { Handle, Position, type NodeProps } from "@xyflow/react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";
import { getEntityColor } from "@proto/utils/atlas";

export interface EntityData {
  uid: string;
  name: string;
  type: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Custom Entity Node Component for Force Graph
 *
 * Renders entity data with domain-specific styling and connection handles.
 */
export function EntityNodeComponent({
  data,
  selected,
}: NodeProps & { data: EntityData }) {
  const color = getEntityColor(data.type);
  const propertiesCount = data.properties
    ? Object.keys(data.properties).length
    : 0;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-card
        shadow-lg transition-all duration-200
        ${selected ? "ring-2 ring-primary ring-offset-2" : ""}
        hover:shadow-xl
      `}
      style={{
        borderColor: color,
        minWidth: "180px",
        maxWidth: "220px",
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{data.name}</div>
            <Badge
              variant="outline"
              className="text-xs mt-1"
              style={{ borderColor: color, color }}
            >
              {data.type}
            </Badge>
          </div>
          <Icon
            name="sparkles"
            size={16}
            className="text-primary flex-shrink-0"
          />
        </div>

        {propertiesCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {propertiesCount} properties
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
