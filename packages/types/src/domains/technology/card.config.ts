/**
 * Technology Domain Card Configuration
 *
 * Pure configuration-based rendering for technology entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Technology domain card configuration
 */
export const technologyCardConfig = createCardConfig()
  .useDefaultComponent()

  // Specifications section
  .section({
    id: "specifications",
    title: "Specifications",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.version ||
          node.properties?.category ||
          node.properties?.model
      ),
  })
  .fields([
    {
      property: "version",
      label: "Version",
      type: "text",
      section: "specifications",
      order: 1,
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "category",
      label: "Category",
      type: "badge",
      section: "specifications",
      order: 2,
      sizes: ["standard", "detailed"],
    },
    {
      property: "model",
      label: "Model",
      type: "text",
      section: "specifications",
      order: 3,
      visible: (node) => Boolean(node.properties?.model),
      sizes: ["standard", "detailed"],
    },
    {
      property: "api_type",
      label: "Type",
      type: "badge",
      section: "specifications",
      order: 4,
      visible: (node) => Boolean(node.properties?.api_type),
      sizes: ["standard", "detailed"],
    },
  ])

  // Technical Details section
  .section({
    id: "technical",
    title: "Technical Details",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.language ||
          node.properties?.framework ||
          node.properties?.license ||
          node.properties?.architecture
      ),
  })
  .fields([
    {
      property: "language",
      label: "Language",
      type: "text",
      section: "technical",
      order: 1,
      visible: (node) => Boolean(node.properties?.language),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
    {
      property: "framework",
      label: "Framework",
      type: "text",
      section: "technical",
      order: 2,
      visible: (node) => Boolean(node.properties?.framework),
      sizes: ["standard", "detailed"],
    },
    {
      property: "license",
      label: "License",
      type: "badge",
      section: "technical",
      order: 3,
      visible: (node) => Boolean(node.properties?.license),
      sizes: ["standard", "detailed"],
    },
    {
      property: "architecture",
      label: "Architecture",
      type: "text",
      section: "technical",
      order: 4,
      visible: (node) => Boolean(node.properties?.architecture),
      sizes: ["detailed"],
    },
  ])

  // Availability section
  .section({
    id: "availability",
    title: "Availability",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.status ||
          node.properties?.release_date ||
          node.properties?.openSource
      ),
  })
  .fields([
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "availability",
      order: 1,
    },
    {
      property: "release_date",
      label: "Released",
      type: "text",
      section: "availability",
      order: 2,
      visible: (node) => Boolean(node.properties?.release_date),
      sizes: ["standard", "detailed"],
    },
    {
      property: "openSource",
      label: "Open Source",
      type: "badge",
      section: "availability",
      order: 3,
      visible: (node) => node.properties?.openSource === true,
      sizes: ["standard", "detailed"],
      formatter: () => "Open Source",
    },
    {
      property: "pricing_model",
      label: "Pricing",
      type: "badge",
      section: "availability",
      order: 4,
      visible: (node) => Boolean(node.properties?.pricing_model),
      sizes: ["detailed"],
    },
  ])

  .build();
