"use client";

/**
 * Horizontal Toolbar
 *
 * Capability-driven toolbar with:
 * - AI Chat and Collaboration controls
 * - Undo/Redo buttons
 * - Canvas-specific buttons (injected via slot)
 * - Settings with tabs (Toolbar, Canvas)
 *
 * Note: Navigation controls (zoom, fit, lock) moved to CanvasNavigationToolbar (bottom-left)
 */

import React from "react";

import { Icon } from "@proto/icon-system";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@proto/ui/atoms";
import { PaidFeaturePopover } from "@proto/ui/organisms";

import { cn } from "@/lib/utils";

import type {
  ToolbarButtonCapabilities,
  CanvasType,
} from "../../types/workspace";

import { TabCollaborationMenu } from "./TabCollaborationMenu";
import { ToolbarSettings } from "./toolbar/ToolbarSettings";
import { UndoRedoButtons } from "./toolbar/UndoRedoButtons";

interface HorizontalToolbarProps {
  capabilities: ToolbarButtonCapabilities;
  canvasType: CanvasType;
  canvasSettings: React.ReactNode;
  canvasButtonsSlot?: React.ReactNode;
  onToggleChat: () => void;
  canUseAIChat?: boolean; // Tier enforcement for AI chat
  onToggleUtilityPanel?: () => void; // Toggle utility panel
  isUtilityPanelCollapsed?: boolean; // Whether utility panel is collapsed
  isLoading?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
  // Collaboration props
  workspaceId?: string;
  tabId?: string;
  tabName?: string;
  canvasData?: any;
  canUseCollaboration?: boolean; // Tier enforcement for collaboration
  workspaceReady?: boolean; // Whether workspace is fully loaded
  onSessionCreated?: (sessionId: string, shareLink: string) => void;
  onSessionEnded?: () => void;
  activeSessionId?: string | null;
}

export function HorizontalToolbar({
  capabilities,
  canvasType,
  canvasSettings,
  canvasButtonsSlot,
  canvasData,
  onToggleChat,
  canUseAIChat = false,
  onToggleUtilityPanel,
  isUtilityPanelCollapsed = false,
  isLoading,
  canUndo = false,
  canRedo = false,
  onUndo = () => {},
  onRedo = () => {},
  className,
  workspaceId,
  tabId,
  tabName,
  canUseCollaboration = false,
  workspaceReady = false,
  onSessionCreated,
  onSessionEnded,
  activeSessionId,
}: HorizontalToolbarProps) {
  // Only show collaboration for supported canvas types
  const supportsCollaboration = ["graph", "map", "gantt"].includes(canvasType);
  return (
    <div
      className={cn(
        "absolute top-4 left-4 z-[60] bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border",
        className
      )}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        {/* Chat toggle - with tier restriction */}
        <PaidFeaturePopover
          hasAccess={canUseAIChat}
          trigger="both"
          hoverDelay={800}
          feature={{
            name: "AI Chat",
            icon: <Icon name="sparkles" size={20} className="text-primary" />,
            description:
              "Unlock AI-powered research assistance with natural language queries, entity discovery, and intelligent relationship suggestions.",
            benefits: [
              "100 AI queries per day",
              "Research agent chat interface",
              "Auto relationship discovery",
              "Smart entity suggestions",
            ],
            tier: "basic",
          }}
          align="start"
          side="right"
          disabledClassName="p-2 rounded-md transition-colors text-muted-foreground/40"
        >
          <button
            type="button"
            onClick={onToggleChat}
            className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Toggle AI Chat"
          >
            <Icon name="message-square" size={16} />
          </button>
        </PaidFeaturePopover>

        {/* Utility Panel toggle */}
        {onToggleUtilityPanel && (
          <button
            type="button"
            onClick={onToggleUtilityPanel}
            className={cn(
              "p-2 rounded-md transition-colors",
              isUtilityPanelCollapsed
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-foreground bg-muted"
            )}
            title={
              isUtilityPanelCollapsed
                ? "Show Utility Panel"
                : "Hide Utility Panel"
            }
          >
            <Icon name="panel-bottom" size={16} />
          </button>
        )}

        {/* Collaboration - with tier restriction */}
        {supportsCollaboration && workspaceId && tabId && (
          <>
            <PaidFeaturePopover
              hasAccess={canUseCollaboration}
              trigger="both"
              hoverDelay={800}
              feature={{
                name: "Real-Time Collaboration",
                icon: <Icon name="globe" size={20} className="text-primary" />,
                description:
                  "Share your canvas with others for real-time collaborative editing. Perfect for team research and data analysis.",
                benefits: [
                  "Share per-canvas collaboration sessions",
                  "Real-time sync with teammates",
                  "Guest editor or viewer modes",
                  "Session controls and management",
                ],
                tier: "basic",
              }}
              align="start"
              side="right"
              disabledClassName="p-2 rounded-md transition-colors text-muted-foreground/40"
            >
              <div className="relative">
                <TabCollaborationMenu
                  tabId={tabId}
                  tabName={tabName || "Canvas"}
                  workspaceId={workspaceId}
                  workspaceReady={workspaceReady}
                  activeSessionId={activeSessionId || null}
                  canvasData={canvasData}
                  canvasType={canvasType}
                  onSessionCreated={onSessionCreated}
                  onEndSession={onSessionEnded}
                />
              </div>
            </PaidFeaturePopover>
          </>
        )}

        {/* Separator */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* Undo/Redo (editing mode only) */}
        <UndoRedoButtons
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />

        {/* Separator before canvas-specific buttons */}
        {canvasButtonsSlot && <div className="h-4 w-px bg-border mx-1" />}

        {/* Canvas-specific buttons */}
        {canvasButtonsSlot}

        {/* Separator before settings */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* Settings with tabs */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Settings"
            >
              <Icon name="settings" size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 p-0 z-[70]"
            align="start"
            side="right"
          >
            <Tabs defaultValue="toolbar" className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                <TabsTrigger value="toolbar">Toolbar</TabsTrigger>
                <TabsTrigger value="canvas">Canvas</TabsTrigger>
              </TabsList>

              {/* Toolbar Settings Tab */}
              <TabsContent value="toolbar" className="p-4">
                <ToolbarSettings />
              </TabsContent>

              {/* Canvas-Specific Settings Tab */}
              <TabsContent value="canvas" className="p-4">
                {canvasSettings || (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No canvas-specific settings available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-2 border-l">
            <Icon
              name="loader"
              size={16}
              className="animate-spin text-muted-foreground"
            />
          </div>
        )}
      </div>
    </div>
  );
}
