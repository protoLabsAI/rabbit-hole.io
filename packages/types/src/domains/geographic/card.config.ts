/**
 * Geographic Domain Card Configuration
 *
 * Pure configuration-based rendering for geographic entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Geographic domain card configuration
 */
export const geographicCardConfig = createCardConfig()
  .useDefaultComponent()

  // Location section
  .section({
    id: "location",
    title: "Location",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.region ||
          node.properties?.country ||
          node.properties?.continent ||
          node.properties?.capital
      ),
  })
  .fields([
    {
      property: "capital",
      label: "Capital",
      type: "text",
      section: "location",
      order: 1,
      visible: (node) => Boolean(node.properties?.capital),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "region",
      label: "Region",
      type: "text",
      section: "location",
      order: 2,
      visible: (node) => Boolean(node.properties?.region),
      sizes: ["standard", "detailed"],
    },
    {
      property: "country",
      label: "Country",
      type: "text",
      section: "location",
      order: 3,
      visible: (node) => Boolean(node.properties?.country),
      sizes: ["standard", "detailed"],
    },
    {
      property: "cityType",
      label: "Type",
      type: "badge",
      section: "location",
      order: 4,
      visible: (node) => Boolean(node.properties?.cityType),
      sizes: ["standard", "detailed"],
    },
  ])

  // Demographics section
  .section({
    id: "demographics",
    title: "Demographics",
    order: 2,
    visible: (node) =>
      Boolean(node.properties?.population || node.properties?.area),
  })
  .fields([
    {
      property: "population",
      label: "Population",
      type: "number",
      section: "demographics",
      order: 1,
      visible: (node) => Boolean(node.properties?.population),
      sizes: ["standard", "detailed"],
    },
    {
      property: "area",
      label: "Area (km²)",
      type: "number",
      section: "demographics",
      order: 2,
      visible: (node) => Boolean(node.properties?.area),
      sizes: ["detailed"],
    },
    {
      property: "languages",
      label: "Languages",
      type: "text",
      section: "demographics",
      order: 3,
      visible: (node) => Boolean(node.properties?.languages),
      sizes: ["detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
  ])

  // Political section
  .section({
    id: "political",
    title: "Political",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.government ||
          node.properties?.currency ||
          node.properties?.founded ||
          node.properties?.independence
      ),
  })
  .fields([
    {
      property: "government",
      label: "Government",
      type: "text",
      section: "political",
      order: 1,
      visible: (node) => Boolean(node.properties?.government),
      sizes: ["standard", "detailed"],
    },
    {
      property: "currency",
      label: "Currency",
      type: "text",
      section: "political",
      order: 2,
      visible: (node) => Boolean(node.properties?.currency),
      sizes: ["standard", "detailed"],
    },
    {
      property: "founded",
      label: "Founded",
      type: "text",
      section: "political",
      order: 3,
      visible: (node) => Boolean(node.properties?.founded),
      sizes: ["detailed"],
    },
    {
      property: "independence",
      label: "Independence",
      type: "text",
      section: "political",
      order: 4,
      visible: (node) => Boolean(node.properties?.independence),
      sizes: ["detailed"],
    },
    {
      property: "sovereignty",
      label: "Status",
      type: "badge",
      section: "political",
      order: 5,
      visible: (node) => Boolean(node.properties?.sovereignty),
      sizes: ["detailed"],
    },
  ])

  .build();
