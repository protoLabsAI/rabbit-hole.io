/**
 * Panel Wrapper
 *
 * Wrapper component that provides context/props to dashboard panels.
 * This allows panels to receive workspace-specific data while keeping
 * the PanelHub generic and reusable.
 */

"use client";

interface PanelWrapperProps {
  /**
   * The panel component to render
   */
  Panel: React.ComponentType<any>;

  /**
   * Workspace ID to pass to panels
   */
  workspaceId: string;

  /**
   * Additional props to pass to the panel
   */
  [key: string]: any;
}

export function PanelWrapper({
  Panel,
  workspaceId,
  ...props
}: PanelWrapperProps) {
  return <Panel workspaceId={workspaceId} {...props} />;
}
