/**
 * DomainCardFactory Component
 *
 * Routes node data to appropriate domain-specific card components.
 * Falls back to generic card for unrecognized domains.
 */

import React from "react";

import { EntitySchemaRegistry, domainRegistry } from "@protolabsai/types";

import { BaseDomainCard } from "./BaseDomainCard";
import { ConfigurableCard } from "./ConfigurableCard";
import { FileCard } from "./FileCard";
import type { DomainName, DomainNodeData, DomainCardProps } from "./types";

/**
 * Generic fallback card for unimplemented domains
 * Uses whitelabel semantic color tokens for theme compatibility
 */
const GenericDomainCard: React.FC<DomainCardProps> = ({
  node,
  domain,
  ...props
}) => {
  const properties = node.properties || {};
  const metadata = node.metadata || {};

  return (
    <BaseDomainCard node={node} domain={domain} {...props}>
      <div className="text-xs text-muted-foreground italic mb-2">
        Domain-specific card not implemented yet
      </div>
      {/* Basic entity info */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">UID:</span>
          <span className="text-xs font-mono text-foreground">{node.uid}</span>
        </div>

        {Object.keys(properties).length > 0 && (
          <>
            <div className="text-xs font-medium text-foreground mt-3 mb-1">
              Properties
            </div>
            {Object.entries(properties)
              .slice(0, 5)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-foreground ml-2 truncate max-w-32">
                    {String(value).substring(0, 50)}
                  </span>
                </div>
              ))}
          </>
        )}

        {Object.keys(metadata).length > 0 && (
          <>
            <div className="text-xs font-medium text-foreground mt-3 mb-1">
              Metadata
            </div>
            {Object.entries(metadata)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-foreground ml-2 truncate max-w-32">
                    {String(value).substring(0, 30)}
                  </span>
                </div>
              ))}
          </>
        )}
      </div>
    </BaseDomainCard>
  );
};

/**
 * Determine domain from node data
 * Uses domain registry instead of hardcoded mapping
 */
function getDomainFromNode(node: DomainNodeData): DomainName | null {
  // Try to get domain from UID (via EntitySchemaRegistry)
  const registry = EntitySchemaRegistry.getInstance();
  const domainFromUID = registry.getDomainFromUID(node.uid);
  if (domainFromUID) {
    return domainFromUID as DomainName;
  }

  // Use domain registry to get domain from entity type
  const domainFromType = domainRegistry.getDomainFromEntityType(node.type);
  if (domainFromType) {
    return domainFromType as DomainName;
  }

  return null;
}

/**
 * Convert Cytoscape node to domain node data
 */
function convertToDomainNodeData(cytoscapeNode: any): DomainNodeData {
  const nodeData =
    cytoscapeNode.data?.("originalNode") || cytoscapeNode.data?.() || {};

  // Ensure uid is a string
  const rawUid = nodeData.uid || nodeData.id || "unknown";
  const uid = typeof rawUid === "string" ? rawUid : String(rawUid);

  return {
    uid,
    name: nodeData.name || nodeData.label || "Unknown Entity",
    type: nodeData.type || "Organization",
    properties: nodeData.properties || {},
    metadata: nodeData.metadata || nodeData,
  };
}

/**
 * Props for DomainCardFactory
 */
export interface DomainCardFactoryProps {
  /** Cytoscape node object */
  cytoscapeNode: any;

  /** Optional override for domain detection */
  forceDomain?: DomainName;

  /** Additional props to pass to domain card */
  cardProps?: Partial<DomainCardProps>;
}

/**
 * DomainCardFactory Component
 *
 * Routes nodes to appropriate card renderer:
 * 1. Component from domain config (if custom component specified)
 * 2. ConfigurableCard (configuration-based, default)
 * 3. GenericDomainCard (fallback)
 */
export const DomainCardFactory: React.FC<DomainCardFactoryProps> = ({
  cytoscapeNode,
  forceDomain,
  cardProps = {},
}) => {
  const node = convertToDomainNodeData(cytoscapeNode);
  const domain = forceDomain || getDomainFromNode(node);

  // If no domain detected, use generic card
  if (!domain) {
    return (
      <GenericDomainCard
        node={node}
        domain="social" // fallback
        {...cardProps}
      />
    );
  }

  // Get domain config
  const domainConfig = domainRegistry.getDomainConfig(domain);

  // Try entity-specific card config first, then fall back to domain card config
  const cardConfig =
    domainConfig?.ui?.entityCards?.[node.type] || domainConfig?.ui?.card;

  // 1. Check domain config for custom component
  if (cardConfig?.component && cardConfig.component !== "default") {
    // Handle string component names (FileCard, etc.)
    if (typeof cardConfig.component === "string") {
      const componentMap: Record<string, React.FC<DomainCardProps>> = {
        FileCard,
      };
      const Mapped = componentMap[cardConfig.component];
      if (Mapped) return <Mapped node={node} domain={domain} {...cardProps} />;
    } else {
      // Direct component reference
      const ConfigComponent = cardConfig.component;
      return <ConfigComponent node={node} domain={domain} {...cardProps} />;
    }
  }

  // 2. Use configuration-based renderer if config exists (PREFERRED)
  if (cardConfig) {
    return <ConfigurableCard node={node} domain={domain} {...cardProps} />;
  }

  // 3. Fallback to generic card
  return <GenericDomainCard node={node} domain={domain} {...cardProps} />;
};

DomainCardFactory.displayName = "DomainCardFactory";

// Backward compatibility export
export const DomainPopoverFactory = DomainCardFactory;

export default DomainCardFactory;
