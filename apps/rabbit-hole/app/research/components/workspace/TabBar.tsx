/**
 * Tab Bar Component
 *
 * VSCode-style tabs for workspace with session support
 */

"use client";

import React, { useState, useRef } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { Icon } from "@proto/icon-system";
import { useToast } from "@proto/ui/hooks";
import type { WorkspaceTab, CanvasType } from "@proto/workspace";

import "@/context-menu/registry/workspaceTabMenus.direct";
import { useContextMenu } from "@/context-menu";

import { getCanvasRenderer } from "./canvas/CanvasRegistry";

interface TabBarProps {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  isOwner: boolean;
  isViewMode: boolean;
  onViewModeToggle?: () => void;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
  onNewTab: (canvasType: CanvasType) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  isOwner,
  isViewMode,
  onViewModeToggle,
  onTabClick,
  onTabClose,
  onTabReorder,
  onNewTab,
}: TabBarProps) {
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    primaryEmailAddress: { emailAddress: "local@localhost" },
  } as any;
  const { toast } = useToast();
  const tier = getUserTierClient(user || null);
  const limits = getTierLimitsClient(tier);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canUseCollaboration = limits.maxActiveSessions > 0;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === toIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    onTabReorder(draggedIndex, toIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 px-2 h-10 overflow-x-auto">
      {/* Tabs */}
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          tab={tab}
          index={index}
          isActive={tab.id === activeTabId}
          isOwner={isOwner}
          isViewMode={isViewMode}
          isDragging={draggedIndex === index}
          isDragOver={dragOverIndex === index}
          onClick={() => onTabClick(tab.id)}
          onClose={() => onTabClose(tab.id)}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Owner-only controls */}
      {isOwner && (
        <>
          {/* New tab button - hidden in view mode */}
          {!isViewMode && (
            <button
              onClick={() => onNewTab("graph")}
              className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="New tab"
            >
              <Icon name="plus" size={16} />
            </button>
          )}
        </>
      )}

      {/* Spacer to push menu to right - Global menu now handles user menu */}
      <div className="flex-1" />
    </div>
  );
}

interface TabProps {
  tab: WorkspaceTab;
  index: number;
  isActive: boolean;
  isOwner: boolean;
  isViewMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onClose: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function Tab({
  tab,
  index,
  isActive,
  isOwner,
  isViewMode,
  isDragging,
  isDragOver,
  onClick,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TabProps) {
  const renderer = getCanvasRenderer(tab.canvasType);
  const iconName = renderer.icon;
  const isHidden = tab.visibility === "hidden";
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);
  const { openContextMenu } = useContextMenu();

  const canReorder = isOwner && !isViewMode;
  const canClose = isOwner && !isViewMode;

  const handleMouseDown = () => {
    if (!canReorder) return;

    dragTimeout.current = setTimeout(() => {
      setIsDragEnabled(true);
    }, 150); // 150ms delay
  };

  const handleMouseUp = () => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
      dragTimeout.current = null;
    }
    setIsDragEnabled(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDragEnabled) {
      e.preventDefault();
      return;
    }
    onDragStart();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isOwner) return;

    e.preventDefault();
    e.stopPropagation();

    openContextMenu("workspace-tab", e.clientX, e.clientY, {
      tab,
      type: tab.type,
      isOwner,
      isViewMode,
      onClose,
      onDuplicate: () => {
        // TODO: Implement tab duplication
      },
    });
  };

  return (
    <div
      draggable={canReorder}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragStart={handleDragStart}
      onDragOver={canReorder ? onDragOver : undefined}
      onDrop={canReorder ? onDrop : undefined}
      onDragEnd={canReorder ? onDragEnd : undefined}
      onContextMenu={handleContextMenu}
      className={`
        flex items-center gap-2 px-3 py-1.5 border-r transition-all
        ${isActive ? "bg-background" : "bg-muted/50 hover:bg-muted"}
        ${isHidden ? "opacity-50" : ""}
        ${isDragging ? "opacity-40 cursor-grabbing" : canReorder ? "cursor-pointer" : "cursor-default"}
        ${isDragOver ? "border-l-2 border-l-primary" : ""}
      `}
      onClick={onClick}
    >
      <Icon name={iconName} size={14} className="flex-shrink-0" />

      <span className="text-sm max-w-[120px] truncate">{tab.name}</span>

      {/* Session indicator */}
      {tab.type === "session" && (
        <Icon name="users" size={12} className="text-primary flex-shrink-0" />
      )}

      {/* Visibility indicator */}
      {tab.visibility === "hidden" && (
        <Icon
          name="lock"
          size={12}
          className="text-muted-foreground flex-shrink-0"
        />
      )}
    </div>
  );
}
