/**
 * Legal Domain Card Configuration
 *
 * Pure configuration-based rendering for legal entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Legal domain card configuration
 */
export const legalCardConfig = createCardConfig()
  .useDefaultComponent()

  // Jurisdiction section
  .section({
    id: "jurisdiction",
    title: "Jurisdiction",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.jurisdiction ||
          node.properties?.court ||
          node.properties?.level
      ),
  })
  .fields([
    {
      property: "jurisdiction",
      label: "Jurisdiction",
      type: "badge",
      section: "jurisdiction",
      order: 1,
      visible: (node) => Boolean(node.properties?.jurisdiction),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "court",
      label: "Court",
      type: "text",
      section: "jurisdiction",
      order: 2,
      visible: (node) => Boolean(node.properties?.court),
      sizes: ["standard", "detailed"],
    },
    {
      property: "level",
      label: "Level",
      type: "badge",
      section: "jurisdiction",
      order: 3,
      visible: (node) => Boolean(node.properties?.level),
      sizes: ["standard", "detailed"],
    },
  ])

  // Case Details section
  .section({
    id: "case",
    title: "Case Details",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.decision_date ||
          node.properties?.filed_date ||
          node.properties?.parties
      ),
  })
  .fields([
    {
      property: "decision_date",
      label: "Decision Date",
      type: "text",
      section: "case",
      order: 1,
      visible: (node) => Boolean(node.properties?.decision_date),
      sizes: ["standard", "detailed"],
    },
    {
      property: "filed_date",
      label: "Filed",
      type: "text",
      section: "case",
      order: 2,
      visible: (node) => Boolean(node.properties?.filed_date),
      sizes: ["detailed"],
    },
    {
      property: "parties",
      label: "Parties",
      type: "text",
      section: "case",
      order: 3,
      visible: (node) => Boolean(node.properties?.parties),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 2).join(" v. ") : String(value),
    },
    {
      property: "outcome",
      label: "Outcome",
      type: "status",
      section: "case",
      order: 4,
      visible: (node) => Boolean(node.properties?.outcome),
      sizes: ["standard", "detailed"],
    },
  ])

  // Legal Status section
  .section({
    id: "status",
    title: "Legal Status",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.status ||
          node.properties?.enacted ||
          node.properties?.category
      ),
  })
  .fields([
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "status",
      order: 1,
      visible: (node) => Boolean(node.properties?.status),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "enacted",
      label: "Enacted",
      type: "text",
      section: "status",
      order: 2,
      visible: (node) => Boolean(node.properties?.enacted),
      sizes: ["standard", "detailed"],
    },
    {
      property: "category",
      label: "Category",
      type: "badge",
      section: "status",
      order: 3,
      visible: (node) => Boolean(node.properties?.category),
      sizes: ["detailed"],
    },
  ])

  .build();
