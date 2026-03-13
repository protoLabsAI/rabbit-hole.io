/**
 * ResizableChatLayout - Universal Resizable Chat Sidebar
 *
 * A reusable layout component that adds a resizable chat sidebar to any content.
 * Features:
 * - VSCode-style resizable panels
 * - Full collapse/expand functionality
 * - Layout persistence in localStorage
 * - Theme-aware styling
 * - Configurable chat interface
 * - Flexible content area
 *
 * @example
 * ```tsx
 * <ResizableChatLayout
 *   chatTitle="Research Agent"
 *   chatDescription="AI-powered research assistant"
 *   chatInterface={<ResearchChatInterface />}
 *   layoutId="research-layout"
 *   collapsible
 * >
 *   <YourMainContent />
 * </ResizableChatLayout>
 * ```
 */

"use client";

import React from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { Button } from "../../atoms/button";
import { Icon } from "../../atoms/icon";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../atoms/resizable";

export interface ResizableChatLayoutProps {
  /**
   * Content to display in the main area (right side)
   */
  children: React.ReactNode;

  /**
   * Chat interface component to display in the sidebar
   */
  chatInterface: React.ReactNode;

  /**
   * Title for the chat sidebar header
   */
  chatTitle: string;

  /**
   * Description text for the chat sidebar header
   */
  chatDescription?: string;

  /**
   * Unique ID for persisting layout state in localStorage
   * Different IDs allow different pages to have different layouts
   * @example "research-layout", "atlas-chat-layout"
   */
  layoutId: string;

  /**
   * Default width percentage for chat sidebar (0-100)
   * @default 33
   */
  defaultChatSize?: number;

  /**
   * Minimum width percentage for chat sidebar (0-100)
   * @default 20
   */
  minChatSize?: number;

  /**
   * Maximum width percentage for chat sidebar (0-100)
   * @default 50
   */
  maxChatSize?: number;

  /**
   * Position of the chat sidebar
   * @default "left"
   */
  chatPosition?: "left" | "right";

  /**
   * Whether to show the resize handle grip icon
   * @default true
   */
  showResizeHandle?: boolean;

  /**
   * Enable collapse/expand functionality
   * @default false
   */
  collapsible?: boolean;

  /**
   * Initial collapsed state (only used if collapsible is true)
   * @default false
   */
  defaultCollapsed?: boolean;

  /**
   * Callback when collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Additional CSS classes for the chat sidebar
   */
  chatClassName?: string;

  /**
   * Additional CSS classes for the main content area
   */
  contentClassName?: string;

  /**
   * Whether to show the chat header
   * @default true
   */
  showChatHeader?: boolean;

  /**
   * Custom header component (replaces default header if provided)
   */
  customChatHeader?: React.ReactNode;

  /**
   * Whether to show text label on collapsed toggle button
   * @default false
   */
  showTextOnCollapsedButton?: boolean;

  /**
   * Whether to hide the default floating toggle button
   * Useful when providing a custom toggle button elsewhere
   * @default false
   */
  hideFloatingToggle?: boolean;
}

export function ResizableChatLayout({
  children,
  chatInterface,
  chatTitle,
  chatDescription,
  layoutId,
  defaultChatSize = 33,
  minChatSize = 20,
  maxChatSize = 50,
  chatPosition = "left",
  showResizeHandle = true,
  collapsible = false,
  defaultCollapsed = false,
  onCollapseChange,
  className = "",
  chatClassName = "",
  contentClassName = "",
  showChatHeader = true,
  customChatHeader,
  showTextOnCollapsedButton = false,
  hideFloatingToggle = false,
}: ResizableChatLayoutProps) {
  // Track collapsed state
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const chatPanelRef = React.useRef<ImperativePanelHandle | null>(null);
  const onCollapseChangeRef = React.useRef(onCollapseChange);

  // Keep ref updated
  React.useEffect(() => {
    onCollapseChangeRef.current = onCollapseChange;
  }, [onCollapseChange]);

  // Sync internal state with external defaultCollapsed prop changes
  React.useEffect(() => {
    if (defaultCollapsed !== isCollapsed) {
      setIsCollapsed(defaultCollapsed);

      // Also update the panel ref
      if (chatPanelRef.current) {
        if (defaultCollapsed) {
          chatPanelRef.current.collapse();
        } else {
          chatPanelRef.current.expand();
        }
      }
    }
  }, [defaultCollapsed, isCollapsed]);

  // Handle collapse toggle - stable function using functional state updates
  const handleCollapseToggle = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;

      // Collapse or expand the panel
      if (chatPanelRef.current) {
        if (newState) {
          chatPanelRef.current.collapse();
        } else {
          chatPanelRef.current.expand();
        }
      }

      onCollapseChangeRef.current?.(newState);
      return newState;
    });
  }, []);

  // Calculate content panel sizes (inverse of chat sizes)
  const defaultContentSize = 100 - defaultChatSize;
  const minContentSize = 100 - maxChatSize;

  // Render chat panel
  const chatPanel = (
    <ResizablePanel
      ref={chatPanelRef}
      defaultSize={defaultChatSize}
      minSize={minChatSize}
      maxSize={maxChatSize}
      collapsible={collapsible}
      collapsedSize={0}
      onCollapse={() => setIsCollapsed(true)}
      onExpand={() => setIsCollapsed(false)}
    >
      <div
        className={`h-full ${
          chatPosition === "left" ? "border-r" : "border-l"
        } border-border bg-card flex flex-col overflow-hidden ${chatClassName}`}
      >
        {/* Chat Header */}
        {showChatHeader && !customChatHeader && (
          <div className="px-4 py-3 border-b border-border bg-card/95 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">
                {chatTitle}
              </h1>
              {chatDescription && (
                <p className="text-xs text-muted-foreground mt-1">
                  {chatDescription}
                </p>
              )}
            </div>
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapseToggle}
                className="ml-2 h-8 w-8 p-0"
                title={isCollapsed ? "Expand chat" : "Collapse chat"}
              >
                {chatPosition === "left" ? (
                  <Icon name="chevron-left" size={16} />
                ) : (
                  <Icon name="chevron-right" size={16} />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Custom Header */}
        {customChatHeader && <div>{customChatHeader}</div>}

        {/* Chat Interface */}
        <div className="flex-1 min-h-0 overflow-hidden">{chatInterface}</div>
      </div>
    </ResizablePanel>
  );

  // Render content panel
  const contentPanel = (
    <ResizablePanel defaultSize={defaultContentSize} minSize={minContentSize}>
      <div className={`h-full relative ${contentClassName}`}>
        {/* Floating toggle button when collapsed */}
        {collapsible && isCollapsed && !hideFloatingToggle && (
          <Button
            variant="default"
            size={showTextOnCollapsedButton ? "sm" : "icon"}
            onClick={handleCollapseToggle}
            className={`absolute ${
              chatPosition === "left" ? "left-4" : "right-4"
            } top-4 z-50 shadow-lg`}
            title={`Expand ${chatTitle}`}
          >
            <Icon
              name="message-square"
              size={16}
              className={showTextOnCollapsedButton ? "mr-2" : ""}
            />
            {showTextOnCollapsedButton && chatTitle}
          </Button>
        )}
        {children}
      </div>
    </ResizablePanel>
  );

  // Render resize handle (visually hide when collapsed but keep in DOM)
  const resizeHandle = (
    <ResizableHandle
      withHandle={showResizeHandle}
      className={`bg-border hover:bg-border/80 transition-colors ${
        isCollapsed ? "invisible pointer-events-none" : ""
      }`}
    />
  );

  return (
    <div className={`h-screen bg-background ${className}`}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full w-full"
        autoSaveId={layoutId}
      >
        {chatPosition === "left" ? (
          <>
            {chatPanel}
            {resizeHandle}
            {contentPanel}
          </>
        ) : (
          <>
            {contentPanel}
            {resizeHandle}
            {chatPanel}
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

// Re-export for convenience
export {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "../../atoms/resizable";
