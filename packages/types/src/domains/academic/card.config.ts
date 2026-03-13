/**
 * Academic Domain Card Configuration
 *
 * Pure configuration-based rendering for academic entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Academic domain card configuration
 */
export const academicCardConfig = createCardConfig()
  .useDefaultComponent()

  // Institution section
  .section({
    id: "institution",
    title: "Institution",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.location ||
          node.properties?.founded ||
          node.properties?.enrollment
      ),
  })
  .fields([
    {
      property: "location",
      label: "Location",
      type: "text",
      section: "institution",
      order: 1,
      visible: (node) => Boolean(node.properties?.location),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "founded",
      label: "Founded",
      type: "text",
      section: "institution",
      order: 2,
      visible: (node) => Boolean(node.properties?.founded),
      sizes: ["standard", "detailed"],
    },
    {
      property: "enrollment",
      label: "Enrollment",
      type: "number",
      section: "institution",
      order: 3,
      visible: (node) => Boolean(node.properties?.enrollment),
      sizes: ["standard", "detailed"],
    },
  ])

  // Academic section
  .section({
    id: "academic",
    title: "Academic",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.field ||
          node.properties?.ranking ||
          node.properties?.methodology
      ),
  })
  .fields([
    {
      property: "field",
      label: "Field",
      type: "badge",
      section: "academic",
      order: 1,
      visible: (node) => Boolean(node.properties?.field),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "ranking",
      label: "Ranking",
      type: "text",
      section: "academic",
      order: 2,
      visible: (node) => Boolean(node.properties?.ranking),
      sizes: ["standard", "detailed"],
    },
    {
      property: "methodology",
      label: "Methodology",
      type: "text",
      section: "academic",
      order: 3,
      visible: (node) => Boolean(node.properties?.methodology),
      sizes: ["detailed"],
    },
  ])

  // Publication section
  .section({
    id: "publication",
    title: "Publication",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.year ||
          node.properties?.journal ||
          node.properties?.citations
      ),
  })
  .fields([
    {
      property: "year",
      label: "Year",
      type: "text",
      section: "publication",
      order: 1,
      visible: (node) => Boolean(node.properties?.year),
      sizes: ["standard", "detailed"],
    },
    {
      property: "journal",
      label: "Journal",
      type: "text",
      section: "publication",
      order: 2,
      visible: (node) => Boolean(node.properties?.journal),
      sizes: ["standard", "detailed"],
    },
    {
      property: "citations",
      label: "Citations",
      type: "number",
      section: "publication",
      order: 3,
      visible: (node) => Boolean(node.properties?.citations),
      sizes: ["standard", "detailed"],
    },
    {
      property: "impact_factor",
      label: "Impact Factor",
      type: "number",
      section: "publication",
      order: 4,
      visible: (node) => Boolean(node.properties?.impact_factor),
      sizes: ["detailed"],
    },
  ])

  .build();
