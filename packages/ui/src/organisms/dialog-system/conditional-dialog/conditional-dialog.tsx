/**
 * Conditional Dialog Components
 *
 * React components that wrap dialog triggers with access control.
 * Provides visual feedback for disabled states and loading states.
 */

"use client";

import React from "react";

interface ConditionalDialogTriggerProps {
  isEnabled: boolean;
  isChecking: boolean;
  onTrigger: () => void | Promise<void>;
  children: React.ReactNode;
  disabledReason?: string;
  className?: string;
}

/**
 * Generic trigger component that handles conditional dialog access
 */
export function ConditionalDialogTrigger({
  isEnabled,
  isChecking,
  onTrigger,
  children,
  disabledReason = "Access denied",
  className = "",
}: ConditionalDialogTriggerProps) {
  const handleClick = async () => {
    if (isEnabled && !isChecking) {
      await onTrigger();
    }
  };

  const buttonClasses = `
    transition-all duration-200 
    ${
      isEnabled && !isChecking
        ? "cursor-pointer hover:opacity-80"
        : "cursor-not-allowed opacity-50"
    }
    ${className}
  `;

  const content = isChecking ? (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
      <span>Checking access...</span>
    </div>
  ) : (
    children
  );

  return (
    <div
      onClick={handleClick}
      className={buttonClasses}
      title={!isEnabled ? disabledReason : undefined}
      role="button"
      tabIndex={isEnabled ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && isEnabled && !isChecking) {
          handleClick();
        }
      }}
    >
      {content}
    </div>
  );
}

/**
 * Context menu item with conditional access
 */
interface ConditionalMenuItemProps {
  label: string;
  isEnabled: boolean;
  isChecking: boolean;
  onAction: () => void | Promise<void>;
  disabledReason?: string;
  icon?: string;
  className?: string;
}

export function ConditionalMenuItem({
  label,
  isEnabled,
  isChecking,
  onAction,
  disabledReason,
  icon,
  className = "",
}: ConditionalMenuItemProps) {
  return (
    <ConditionalDialogTrigger
      isEnabled={isEnabled}
      isChecking={isChecking}
      onTrigger={onAction}
      disabledReason={disabledReason}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm
        ${isEnabled ? "hover:bg-accent" : ""}
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {!isEnabled && (
        <span className="ml-auto text-xs text-muted-foreground/60">🔒</span>
      )}
    </ConditionalDialogTrigger>
  );
}

/**
 * Button with conditional access and loading states
 */
interface ConditionalButtonProps {
  children: React.ReactNode;
  isEnabled: boolean;
  isChecking: boolean;
  onAction: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabledReason?: string;
  className?: string;
}

export function ConditionalButton({
  children,
  isEnabled,
  isChecking,
  onAction,
  variant = "secondary",
  size = "md",
  disabledReason,
  className = "",
}: ConditionalButtonProps) {
  const baseClasses = "rounded border font-medium transition-colors";

  const variantClasses = {
    primary: isEnabled
      ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
      : "bg-muted border-muted text-muted-foreground",
    secondary: isEnabled
      ? "bg-background border-border text-foreground hover:bg-muted"
      : "bg-muted border-muted text-muted-foreground",
    danger: isEnabled
      ? "bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90"
      : "bg-muted border-muted text-muted-foreground",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  return (
    <ConditionalDialogTrigger
      isEnabled={isEnabled}
      isChecking={isChecking}
      onTrigger={onAction}
      disabledReason={disabledReason}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </ConditionalDialogTrigger>
  );
}

/**
 * Usage examples:
 *
 * // Context menu with conditional access
 * <ConditionalMenuItem
 *   label="Merge Entity"
 *   isEnabled={mergeDialog.isEnabled}
 *   isChecking={mergeDialog.isChecking}
 *   onAction={() => mergeDialog.open(entity)}
 *   disabledReason="Requires administrator access"
 *   icon="🔀"
 * />
 *
 * // Button with conditional access
 * <ConditionalButton
 *   variant="primary"
 *   isEnabled={researchDialog.isEnabled}
 *   isChecking={researchDialog.isChecking}
 *   onAction={() => researchDialog.open(entityUid, entityName)}
 *   disabledReason="Sign in for research reports"
 * >
 *   Generate Report
 * </ConditionalButton>
 */
