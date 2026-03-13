/**
 * Transportation Domain Card Configuration
 *
 * Pure configuration-based rendering for transportation entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Transportation domain card configuration
 */
export const transportationCardConfig = createCardConfig()
  .useDefaultComponent()

  // Vehicle Info section
  .section({
    id: "vehicle",
    title: "Vehicle Information",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.type ||
          node.properties?.capacity ||
          node.properties?.manufacturer
      ),
  })
  .fields([
    {
      property: "type",
      label: "Type",
      type: "badge",
      section: "vehicle",
      order: 1,
      visible: (node) => Boolean(node.properties?.type),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "capacity",
      label: "Capacity",
      type: "number",
      section: "vehicle",
      order: 2,
      visible: (node) => Boolean(node.properties?.capacity),
      sizes: ["standard", "detailed"],
    },
    {
      property: "manufacturer",
      label: "Manufacturer",
      type: "text",
      section: "vehicle",
      order: 3,
      visible: (node) => Boolean(node.properties?.manufacturer),
      sizes: ["standard", "detailed"],
    },
    {
      property: "max_speed",
      label: "Max Speed",
      type: "number",
      section: "vehicle",
      order: 4,
      visible: (node) => Boolean(node.properties?.max_speed),
      sizes: ["detailed"],
    },
  ])

  // Route Details section
  .section({
    id: "route",
    title: "Route Details",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.origin ||
          node.properties?.destination ||
          node.properties?.distance
      ),
  })
  .fields([
    {
      property: "origin",
      label: "Origin",
      type: "text",
      section: "route",
      order: 1,
      visible: (node) => Boolean(node.properties?.origin),
      sizes: ["standard", "detailed"],
    },
    {
      property: "destination",
      label: "Destination",
      type: "text",
      section: "route",
      order: 2,
      visible: (node) => Boolean(node.properties?.destination),
      sizes: ["standard", "detailed"],
    },
    {
      property: "distance",
      label: "Distance (km)",
      type: "number",
      section: "route",
      order: 3,
      visible: (node) => Boolean(node.properties?.distance),
      sizes: ["detailed"],
    },
  ])

  // Operations section
  .section({
    id: "operations",
    title: "Operations",
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
      section: "operations",
      order: 1,
      visible: (node) => Boolean(node.properties?.operator),
      sizes: ["standard", "detailed"],
    },
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "operations",
      order: 2,
      visible: (node) => Boolean(node.properties?.status),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "service_type",
      label: "Service",
      type: "badge",
      section: "operations",
      order: 3,
      visible: (node) => Boolean(node.properties?.service_type),
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
