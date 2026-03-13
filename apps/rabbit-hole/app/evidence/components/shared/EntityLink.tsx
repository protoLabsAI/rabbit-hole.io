/**
 * EntityLink Component - Rabbit Hole Schema
 *
 * Reusable component for navigating to an entity's ego view.
 * Provides consistent navigation behavior across the application
 * with customizable styling and interaction patterns.
 */

import { useCallback } from "react";

/**
 * Research URL format compatibility notice:
 * All entity navigation should use settings JSON object format:
 * /research?entity=X&settings={"hops":N,"nodeLimit":M}
 * NOT individual parameters like /research?entity=X&hops=N&nodeLimit=M
 */

interface EntityLinkProps {
  entityUid: string;
  entityName: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  egoSettings?: {
    hops?: number;
    nodeLimit?: number;
  };
  onClick?: (entityUid: string, entityName: string) => void;
  onNavigate?: (entityUid: string, entityName: string) => void; // Custom navigation handler
}

export function EntityLink({
  entityUid,
  entityName,
  children,
  className = "",
  title,
  egoSettings = { hops: 2, nodeLimit: 50 },
  onClick,
  onNavigate,
}: EntityLinkProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Call custom onClick handler if provided
      onClick?.(entityUid, entityName);

      // Use custom navigation handler if provided, otherwise use global event
      if (onNavigate) {
        onNavigate(entityUid, entityName);
      } else {
        // Emit global navigation event for Atlas integration
        window.dispatchEvent(
          new CustomEvent("navigateToEntity", {
            detail: {
              entityUid,
              entityName,
              egoSettings,
            },
          })
        );
      }
    },
    [entityUid, entityName, egoSettings, onClick, onNavigate]
  );

  const linkClassName = `cursor-pointer transition-colors ${className}`;

  return (
    <span
      onClick={handleClick}
      className={linkClassName}
      title={title || `Navigate to ${entityName}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {children}
    </span>
  );
}

/**
 * Specialized EntityLink variants for common use cases
 */

export function FamilyMemberLink({
  entityUid,
  entityName,
  className = "hover:text-pink-700 font-medium text-slate-900",
}: {
  entityUid: string;
  entityName: string;
  className?: string;
}) {
  return (
    <EntityLink
      entityUid={entityUid}
      entityName={entityName}
      className={className}
      egoSettings={{ hops: 2, nodeLimit: 50 }} // Standard ego view
    >
      {entityName}
    </EntityLink>
  );
}

export function BusinessEntityLink({
  entityUid,
  entityName,
  className = "hover:text-green-700 font-medium text-slate-900",
}: {
  entityUid: string;
  entityName: string;
  className?: string;
}) {
  return (
    <EntityLink
      entityUid={entityUid}
      entityName={entityName}
      className={className}
      egoSettings={{ hops: 2, nodeLimit: 50 }} // Standard ego view
    >
      {entityName}
    </EntityLink>
  );
}

export function PoliticalEntityLink({
  entityUid,
  entityName,
  className = "hover:text-blue-700 font-medium text-slate-900",
}: {
  entityUid: string;
  entityName: string;
  className?: string;
}) {
  return (
    <EntityLink
      entityUid={entityUid}
      entityName={entityName}
      className={className}
      egoSettings={{ hops: 2, nodeLimit: 50 }} // Standard ego view
    >
      {entityName}
    </EntityLink>
  );
}

/**
 * Hook for entity navigation in components that need direct access
 */
export function useEntityNavigation() {
  const navigateToEntity = useCallback(
    (
      entityUid: string,
      entityName: string,
      egoSettings = { hops: 2, nodeLimit: 50 }
    ) => {
      window.dispatchEvent(
        new CustomEvent("navigateToEntity", {
          detail: { entityUid, entityName, egoSettings },
        })
      );
    },
    []
  );

  return { navigateToEntity };
}
