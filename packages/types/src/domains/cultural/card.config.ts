/**
 * Cultural Domain Card Configuration
 *
 * Pure configuration-based rendering for cultural entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Cultural domain card configuration
 */
export const culturalCardConfig = createCardConfig()
  .useDefaultComponent()

  // Creator section
  .section({
    id: "creator",
    title: "Creator",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.authors ||
          node.properties?.director ||
          node.properties?.artist
      ),
  })
  .fields([
    {
      property: "authors",
      label: "Authors",
      type: "text",
      section: "creator",
      order: 1,
      visible: (node) => Boolean(node.properties?.authors),
      sizes: ["compact", "standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 2).join(", ") : String(value),
    },
    {
      property: "director",
      label: "Director",
      type: "text",
      section: "creator",
      order: 2,
      visible: (node) => Boolean(node.properties?.director),
      sizes: ["compact", "standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 2).join(", ") : String(value),
    },
    {
      property: "artist",
      label: "Artist",
      type: "text",
      section: "creator",
      order: 3,
      visible: (node) => Boolean(node.properties?.artist),
      sizes: ["compact", "standard", "detailed"],
    },
  ])

  // Publication section
  .section({
    id: "publication",
    title: "Publication",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.releaseDate ||
          node.properties?.publicationDate ||
          node.properties?.year ||
          node.properties?.publisher
      ),
  })
  .fields([
    {
      property: "releaseDate",
      label: "Released",
      type: "text",
      section: "publication",
      order: 1,
      visible: (node) => Boolean(node.properties?.releaseDate),
      sizes: ["standard", "detailed"],
    },
    {
      property: "publicationDate",
      label: "Published",
      type: "text",
      section: "publication",
      order: 1,
      visible: (node) =>
        !node.properties?.releaseDate &&
        Boolean(node.properties?.publicationDate),
      sizes: ["standard", "detailed"],
    },
    {
      property: "year",
      label: "Year",
      type: "text",
      section: "publication",
      order: 2,
      visible: (node) => Boolean(node.properties?.year),
      sizes: ["standard", "detailed"],
    },
    {
      property: "publisher",
      label: "Publisher",
      type: "text",
      section: "publication",
      order: 3,
      visible: (node) => Boolean(node.properties?.publisher),
      sizes: ["detailed"],
    },
    {
      property: "runtime",
      label: "Runtime (min)",
      type: "number",
      section: "publication",
      order: 4,
      visible: (node) => Boolean(node.properties?.runtime),
      sizes: ["detailed"],
    },
    {
      property: "pages",
      label: "Pages",
      type: "number",
      section: "publication",
      order: 5,
      visible: (node) => Boolean(node.properties?.pages),
      sizes: ["detailed"],
    },
  ])

  // Classification section
  .section({
    id: "classification",
    title: "Classification",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.genre ||
          node.properties?.style ||
          node.properties?.medium
      ),
  })
  .fields([
    {
      property: "genre",
      label: "Genre",
      type: "text",
      section: "classification",
      order: 1,
      visible: (node) => Boolean(node.properties?.genre),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
    {
      property: "style",
      label: "Style",
      type: "badge",
      section: "classification",
      order: 2,
      visible: (node) => Boolean(node.properties?.style),
      sizes: ["standard", "detailed"],
    },
    {
      property: "medium",
      label: "Medium",
      type: "badge",
      section: "classification",
      order: 3,
      visible: (node) => Boolean(node.properties?.medium),
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
