"use client";

/**
 * Horizontal Toolbar
 *
 * Single-user mode: chat, utility panel, and collaboration controls removed.
 * Now limited to undo/redo, canvas-specific buttons, and settings.
 *
 * Navigation controls (zoom, fit, lock) live in CanvasNavigationToolbar (bottom-left).
 */

import React from "react";

import { Icon } from "@protolabsai/icon-system";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@protolabsai/ui/atoms";

import { cn } from "@/lib/utils";

import { ToolbarSettings } from "./toolbar/ToolbarSettings";
import { UndoRedoButtons } from "./toolbar/UndoRedoButtons";

interface HorizontalToolbarProps {
  canvasSettings: React.ReactNode;
  canvasButtonsSlot?: React.ReactNode;
  isLoading?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
}

export function HorizontalToolbar({
  canvasSettings,
  canvasButtonsSlot,
  isLoading,
  canUndo = false,
  canRedo = false,
  onUndo = () => {},
  onRedo = () => {},
  className,
}: HorizontalToolbarProps) {
  return (
    <div
      className={cn(
        "absolute top-4 left-4 z-[60] bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border",
        className
      )}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        <UndoRedoButtons
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />

        {canvasButtonsSlot && <div className="h-4 w-px bg-border mx-1" />}

        {canvasButtonsSlot}

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

              <TabsContent value="toolbar" className="p-4">
                <ToolbarSettings />
              </TabsContent>

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
