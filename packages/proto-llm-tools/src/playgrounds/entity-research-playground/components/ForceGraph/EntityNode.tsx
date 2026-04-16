import { Handle, Position, type NodeProps } from "@xyflow/react";

/**
 * Default entity colors by type (subset for playground)
 * Full implementation in @protolabsai/utils/atlas
 */
const ENTITY_COLORS: Record<string, string> = {
  Person: "#3B82F6",
  Organization: "#8B5CF6",
  Location: "#10B981",
  Event: "#F59E0B",
  Product: "#EC4899",
  Technology: "#06B6D4",
  Concept: "#6366F1",
  Document: "#84CC16",
};

const ENTITY_ICONS: Record<string, string> = {
  Person: "👤",
  Organization: "🏢",
  Location: "📍",
  Event: "📅",
  Product: "📦",
  Technology: "💻",
  Concept: "💡",
  Document: "📄",
};

function getEntityColor(entityType: string): string {
  return ENTITY_COLORS[entityType] || "#6B7280";
}

function getEntityImage(entityType: string): string {
  return ENTITY_ICONS[entityType] || "⚪";
}

/**
 * Entity data structure for force graph nodes
 */
export interface EntityNodeData {
  name: string;
  type: string;
  color?: string;
  icon?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Entity Card Node - Simplified for Playground
 *
 * Compact entity display with domain-specific styling.
 */
export function EntityNode({
  data,
  selected,
}: NodeProps & { data: EntityNodeData }) {
  const color = data.color || getEntityColor(data.type);
  const icon = data.icon || getEntityImage(data.type);

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-muted-foreground"
      />

      <div
        className="shadow-lg transition-shadow duration-300 hover:shadow-xl"
        style={{
          backgroundColor: color,
          border: `2px solid ${color}`,
          filter: selected ? "brightness(1.3) saturate(1.2)" : "none",
          padding: "8px 12px",
          width: "150px",
          borderRadius: "var(--radius)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span
              className="text-white font-semibold text-sm truncate"
              title={data.name || undefined}
            >
              {data.name}
            </span>
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
              {data.type}
            </span>
          </div>
        </div>

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-white/20 text-white px-2 py-0.5"
                style={{ borderRadius: "calc(var(--radius) * 0.75)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-muted-foreground"
      />
    </div>
  );
}
