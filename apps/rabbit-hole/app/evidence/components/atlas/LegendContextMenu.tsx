import React from "react";

interface LegendContextMenuProps {
  entityType: string;
  onToggleEntityType: (entityType: string) => void;
  onFilterBySentiment: (sentiment: string) => void;
  onShowLegendSettings: () => void;
}

// Hook to add context menu to legend items
export const useLegendContextMenu = (
  onToggleEntityType: (entityType: string) => void,
  onFilterBySentiment: (sentiment: string) => void,
  onShowLegendSettings: () => void,
  openContextMenu: (type: any, x: number, y: number, target?: any) => void
) => {
  const handleLegendRightClick = (
    event: React.MouseEvent,
    entityType?: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    openContextMenu("legend", event.clientX, event.clientY, {
      entityType,
      onToggleEntityType,
      onFilterBySentiment,
      onShowLegendSettings,
    });
  };

  return { handleLegendRightClick };
};

// Enhanced Legend component with context menu support
interface LegendItemProps {
  type: string;
  color: string;
  icon: string;
  count?: number;
  visible?: boolean;
  onRightClick: (event: React.MouseEvent, entityType: string) => void;
}

export const LegendItem: React.FC<LegendItemProps> = ({
  type,
  color,
  icon,
  count,
  visible = true,
  onRightClick,
}) => {
  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200 
        ${visible ? "opacity-100" : "opacity-50"}
        hover:scale-105 hover:shadow-sm
      `}
      onContextMenu={(e) => onRightClick(e, type)}
      title={`Right-click for ${type} options`}
    >
      <div
        className="w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-sm border-2 transition-all"
        style={{
          backgroundColor: `${color}15`,
          borderColor: color,
          borderWidth: visible ? "2px" : "1px",
        }}
      >
        {icon}
      </div>
      <div className="text-xs text-center text-slate-600">
        <div className="font-medium capitalize">{type}</div>
        {count !== undefined && (
          <div className="text-xs text-slate-400">({count})</div>
        )}
      </div>

      {/* Visual indicator for context menu availability */}
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-full h-full bg-blue-400 rounded-full animate-ping"></div>
      </div>
    </div>
  );
};

// Sentiment legend item with context menu
interface SentimentLegendItemProps {
  sentiment: "hostile" | "supportive" | "neutral" | "ambiguous";
  color: string;
  label: string;
  count?: number;
  visible?: boolean;
  onRightClick: (event: React.MouseEvent, sentiment: string) => void;
}

export const SentimentLegendItem: React.FC<SentimentLegendItemProps> = ({
  sentiment,
  color,
  label,
  count,
  visible = true,
  onRightClick,
}) => {
  return (
    <div
      className={`
        flex items-center cursor-pointer transition-all duration-200
        ${visible ? "opacity-100" : "opacity-50"}
        hover:bg-slate-50 rounded px-1 py-0.5
      `}
      onContextMenu={(e) => onRightClick(e, sentiment)}
      title={`Right-click for ${sentiment} options`}
    >
      <div
        className="w-4 h-0.5 mr-2 transition-all"
        style={{
          backgroundColor: color,
          opacity: visible ? 1 : 0.5,
        }}
      ></div>
      <span className="text-slate-600 text-xs">
        {label}
        {count !== undefined && (
          <span className="text-slate-400 ml-1">({count})</span>
        )}
      </span>
    </div>
  );
};
