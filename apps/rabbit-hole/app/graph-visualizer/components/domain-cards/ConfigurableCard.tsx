/**
 * ConfigurableCard Component
 *
 * Renders domain cards based on configuration from domain config.
 * Supports field ordering, section grouping, custom formatters, and size-aware rendering.
 */

import React from "react";

import { domainRegistry } from "@protolabsai/types";
import type {
  DomainCardConfig,
  DomainCardFieldConfig,
  DomainCardProps,
  DomainNodeData,
} from "@protolabsai/types";

import { BaseDomainCard, CardSection, PropertyRow } from "./BaseDomainCard";

/**
 * Render a card based on domain configuration
 */
export const ConfigurableCard: React.FC<DomainCardProps> = ({
  node,
  domain,
  size = "standard",
  ...props
}) => {
  // Get domain configuration
  const domainConfig = domainRegistry.getDomainConfig(domain);
  const cardConfig = domainConfig?.ui?.card;

  console.log("🎴 ConfigurableCard:", {
    domain,
    hasDomainConfig: !!domainConfig,
    hasCardConfig: !!cardConfig,
    cardConfigFields: cardConfig?.fields?.length,
    cardConfigSections: cardConfig?.sections?.length,
  });

  // If no card config, this shouldn't be called - but handle gracefully
  if (!cardConfig) {
    console.warn(
      `ConfigurableCard called for ${domain} but no card config found`
    );
    return null;
  }

  // Resolve inheritance
  const resolvedConfig = resolveCardConfig(cardConfig, domain);

  // Group fields by section
  const fieldsBySection = groupFieldsBySection(resolvedConfig, size, node);

  console.log("🎴 Resolved config:", {
    fields: resolvedConfig.fields.length,
    sections: resolvedConfig.sections?.length,
    fieldsBySection: Array.from(fieldsBySection.keys()),
  });

  // Render sections
  const sections = renderSections(fieldsBySection, node, resolvedConfig);

  return (
    <BaseDomainCard node={node} domain={domain as any} size={size} {...props}>
      {sections}
    </BaseDomainCard>
  );
};

/**
 * Resolve card configuration with inheritance
 */
function resolveCardConfig(
  config: DomainCardConfig,
  domain: string
): DomainCardConfig {
  if (!config.extends) {
    return config;
  }

  // Get parent configuration
  const parentDomain = domainRegistry.getDomainConfig(config.extends);
  const parentConfig = parentDomain?.ui?.card;

  if (!parentConfig) {
    return config;
  }

  // Recursively resolve parent
  const resolvedParent = resolveCardConfig(parentConfig, config.extends);

  // Merge configurations (child overrides parent)
  return {
    ...resolvedParent,
    ...config,
    fields: [...(resolvedParent.fields || []), ...(config.fields || [])],
    sections: [...(resolvedParent.sections || []), ...(config.sections || [])],
    formatters: {
      ...resolvedParent.formatters,
      ...config.formatters,
    },
  };
}

/**
 * Group fields by section and filter by size and visibility
 */
function groupFieldsBySection(
  config: DomainCardConfig,
  size: "compact" | "standard" | "detailed",
  node: DomainNodeData
): Map<string, DomainCardFieldConfig[]> {
  const sections = new Map<string, DomainCardFieldConfig[]>();

  // Filter fields by size and visibility
  const visibleFields = config.fields.filter((field) => {
    // Check size visibility
    if (field.sizes && !field.sizes.includes(size)) {
      return false;
    }

    // Check conditional visibility
    if (field.visible && !field.visible(node)) {
      return false;
    }

    return true;
  });

  // Sort by order
  const sortedFields = visibleFields.sort((a, b) => {
    return (a.order || 0) - (b.order || 0);
  });

  // Group by section
  sortedFields.forEach((field) => {
    const sectionId = field.section || "default";
    if (!sections.has(sectionId)) {
      sections.set(sectionId, []);
    }
    sections.get(sectionId)!.push(field);
  });

  return sections;
}

/**
 * Render sections with fields
 */
function renderSections(
  fieldsBySection: Map<string, DomainCardFieldConfig[]>,
  node: DomainNodeData,
  config: DomainCardConfig
): React.ReactNode {
  const sectionConfigs = config.sections || [];

  // Sort sections by order
  const sortedSections = Array.from(fieldsBySection.entries()).sort(
    ([idA], [idB]) => {
      const sectionA = sectionConfigs.find((s) => s.id === idA);
      const sectionB = sectionConfigs.find((s) => s.id === idB);
      return (sectionA?.order || 0) - (sectionB?.order || 0);
    }
  );

  return sortedSections.map(([sectionId, fields]) => {
    // Find section config
    const sectionConfig = sectionConfigs.find((s) => s.id === sectionId);
    const sectionTitle = sectionConfig?.title || sectionId;

    // Check section visibility
    if (sectionConfig?.visible && !sectionConfig.visible(node)) {
      return null;
    }

    return (
      <CardSection key={sectionId} title={sectionTitle}>
        {fields.map((field) => renderField(field, node, config))}
      </CardSection>
    );
  });
}

/**
 * Render individual field
 */
function renderField(
  field: DomainCardFieldConfig,
  node: DomainNodeData,
  config: DomainCardConfig
): React.ReactNode {
  const properties = node.properties || {};
  const value = properties[field.property];

  // Skip if no value
  if (value === undefined || value === null) {
    return null;
  }

  // Apply formatter if exists
  let formattedValue = value;
  if (field.formatter) {
    formattedValue = field.formatter(value, node);
  } else if (config.formatters?.[field.property]) {
    formattedValue = config.formatters[field.property](value, node);
  }

  return (
    <PropertyRow
      key={field.property}
      label={field.label}
      value={formattedValue}
      type={field.type}
    />
  );
}

ConfigurableCard.displayName = "ConfigurableCard";

export default ConfigurableCard;
