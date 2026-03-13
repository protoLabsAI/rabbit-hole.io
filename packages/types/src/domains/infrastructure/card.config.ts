/**
 * Infrastructure Domain Card Configuration
 *
 * Pure configuration-based rendering for infrastructure entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Infrastructure domain card configuration
 */
export const infrastructureCardConfig = createCardConfig()
  .useDefaultComponent()

  // Specifications section
  .section({
    id: "specifications",
    title: "Specifications",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.type ||
          node.properties?.capacity ||
          node.properties?.length ||
          node.properties?.height
      ),
  })
  .fields([
    {
      property: "type",
      label: "Type",
      type: "badge",
      section: "specifications",
      order: 1,
      visible: (node) => Boolean(node.properties?.type),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "capacity",
      label: "Capacity",
      type: "number",
      section: "specifications",
      order: 2,
      visible: (node) => Boolean(node.properties?.capacity),
      sizes: ["standard", "detailed"],
    },
    {
      property: "length",
      label: "Length (m)",
      type: "number",
      section: "specifications",
      order: 3,
      visible: (node) => Boolean(node.properties?.length),
      sizes: ["standard", "detailed"],
    },
    {
      property: "height",
      label: "Height (m)",
      type: "number",
      section: "specifications",
      order: 4,
      visible: (node) => Boolean(node.properties?.height),
      sizes: ["detailed"],
    },
  ])

  // Construction section
  .section({
    id: "construction",
    title: "Construction",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.constructed ||
          node.properties?.architect ||
          node.properties?.cost
      ),
  })
  .fields([
    {
      property: "constructed",
      label: "Built",
      type: "text",
      section: "construction",
      order: 1,
      visible: (node) => Boolean(node.properties?.constructed),
      sizes: ["standard", "detailed"],
    },
    {
      property: "architect",
      label: "Architect",
      type: "text",
      section: "construction",
      order: 2,
      visible: (node) => Boolean(node.properties?.architect),
      sizes: ["detailed"],
    },
    {
      property: "cost",
      label: "Cost",
      type: "number",
      section: "construction",
      order: 3,
      visible: (node) => Boolean(node.properties?.cost),
      sizes: ["detailed"],
      formatter: (value) => `$${Number(value).toLocaleString()}`,
    },
  ])

  // Operation section
  .section({
    id: "operation",
    title: "Operation",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.operator ||
          node.properties?.status ||
          node.properties?.service_type
      ),
  })
  .fields([
    {
      property: "operator",
      label: "Operator",
      type: "text",
      section: "operation",
      order: 1,
      visible: (node) => Boolean(node.properties?.operator),
      sizes: ["standard", "detailed"],
    },
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "operation",
      order: 2,
      visible: (node) => Boolean(node.properties?.status),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "service_type",
      label: "Service",
      type: "badge",
      section: "operation",
      order: 3,
      visible: (node) => Boolean(node.properties?.service_type),
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
