/**
 * Economic Domain Card Configuration
 *
 * Pure configuration-based rendering for economic entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Economic domain card configuration
 */
export const economicCardConfig = createCardConfig()
  .useDefaultComponent()

  // Business section
  .section({
    id: "business",
    title: "Business",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.industry ||
          node.properties?.sector ||
          node.properties?.founded ||
          node.properties?.headquarters
      ),
  })
  .fields([
    {
      property: "industry",
      label: "Industry",
      type: "badge",
      section: "business",
      order: 1,
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "sector",
      label: "Sector",
      type: "badge",
      section: "business",
      order: 2,
      visible: (node) =>
        !node.properties?.industry && Boolean(node.properties?.sector),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "founded",
      label: "Founded",
      type: "text",
      section: "business",
      order: 3,
      visible: (node) => Boolean(node.properties?.founded),
      sizes: ["standard", "detailed"],
    },
    {
      property: "headquarters",
      label: "Headquarters",
      type: "text",
      section: "business",
      order: 4,
      visible: (node) => Boolean(node.properties?.headquarters),
      sizes: ["standard", "detailed"],
    },
  ])

  // Financials section
  .section({
    id: "financials",
    title: "Financials",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.market_cap ||
          node.properties?.revenue ||
          node.properties?.employees
      ),
  })
  .fields([
    {
      property: "market_cap",
      label: "Market Cap",
      type: "number",
      section: "financials",
      order: 1,
      visible: (node) => Boolean(node.properties?.market_cap),
      sizes: ["standard", "detailed"],
      formatter: (value) => `$${Number(value).toLocaleString()}`,
    },
    {
      property: "revenue",
      label: "Revenue",
      type: "number",
      section: "financials",
      order: 2,
      visible: (node) => Boolean(node.properties?.revenue),
      sizes: ["detailed"],
      formatter: (value) => `$${Number(value).toLocaleString()}`,
    },
    {
      property: "employees",
      label: "Employees",
      type: "number",
      section: "financials",
      order: 3,
      visible: (node) => Boolean(node.properties?.employees),
      sizes: ["standard", "detailed"],
    },
  ])

  // Trading section
  .section({
    id: "trading",
    title: "Trading",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.ticker ||
          node.properties?.exchange ||
          node.properties?.status
      ),
  })
  .fields([
    {
      property: "ticker",
      label: "Ticker",
      type: "text",
      section: "trading",
      order: 1,
      visible: (node) => Boolean(node.properties?.ticker),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "exchange",
      label: "Exchange",
      type: "text",
      section: "trading",
      order: 2,
      visible: (node) => Boolean(node.properties?.exchange),
      sizes: ["standard", "detailed"],
    },
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "trading",
      order: 3,
      visible: (node) => Boolean(node.properties?.status),
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
