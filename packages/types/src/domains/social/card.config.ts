/**
 * Social Domain Card Configuration
 *
 * Pure configuration-based rendering for social entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Social domain card configuration
 */
export const socialCardConfig = createCardConfig()
  .useDefaultComponent()

  // Overview section
  .section({
    id: "overview",
    title: "Overview",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.status ||
          node.properties?.occupation ||
          node.properties?.role ||
          node.properties?.industry ||
          node.properties?.sector
      ),
  })
  .fields([
    {
      property: "status",
      label: "Status",
      type: "status",
      section: "overview",
      order: 1,
    },
    {
      property: "occupation",
      label: "Role",
      type: "text",
      section: "overview",
      order: 2,
      visible: (node) =>
        Boolean(node.properties?.occupation || node.properties?.role),
      sizes: ["standard", "detailed"],
    },
    {
      property: "role",
      label: "Role",
      type: "text",
      section: "overview",
      order: 2,
      visible: (node) =>
        !node.properties?.occupation && Boolean(node.properties?.role),
      sizes: ["standard", "detailed"],
    },
    {
      property: "industry",
      label: "Industry",
      type: "text",
      section: "overview",
      order: 3,
      visible: (node) =>
        Boolean(node.properties?.industry || node.properties?.sector),
      sizes: ["standard", "detailed"],
    },
    {
      property: "sector",
      label: "Industry",
      type: "text",
      section: "overview",
      order: 3,
      visible: (node) =>
        !node.properties?.industry && Boolean(node.properties?.sector),
      sizes: ["standard", "detailed"],
    },
  ])

  // About section
  .section({
    id: "about",
    title: "About",
    order: 2,
    visible: (node) =>
      Boolean(node.properties?.bio || node.properties?.description),
  })
  .fields([
    {
      property: "bio",
      label: "Bio",
      type: "text",
      section: "about",
      order: 1,
      visible: (node) => Boolean(node.properties?.bio),
      sizes: ["standard", "detailed"],
    },
    {
      property: "description",
      label: "Description",
      type: "text",
      section: "about",
      order: 1,
      visible: (node) =>
        !node.properties?.bio && Boolean(node.properties?.description),
      sizes: ["standard", "detailed"],
    },
  ])

  // Location & Contact section
  .section({
    id: "location",
    title: "Location & Contact",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.location ||
          node.properties?.website ||
          node.properties?.url ||
          node.properties?.nationality
      ),
  })
  .fields([
    {
      property: "location",
      label: "Location",
      type: "text",
      section: "location",
      order: 1,
      sizes: ["standard", "detailed"],
    },
    {
      property: "nationality",
      label: "Nationality",
      type: "text",
      section: "location",
      order: 2,
      sizes: ["standard", "detailed"],
    },
    {
      property: "website",
      label: "Website",
      type: "link",
      section: "location",
      order: 3,
      visible: (node) => Boolean(node.properties?.website),
      sizes: ["standard", "detailed"],
    },
    {
      property: "url",
      label: "Website",
      type: "link",
      section: "location",
      order: 3,
      visible: (node) =>
        !node.properties?.website && Boolean(node.properties?.url),
      sizes: ["standard", "detailed"],
    },
  ])

  // Timeline section
  .section({
    id: "timeline",
    title: "Timeline",
    order: 4,
    visible: (node) =>
      Boolean(
        node.properties?.founded ||
          node.properties?.established ||
          node.properties?.birth_date ||
          node.properties?.birthDate ||
          node.properties?.death_date ||
          node.properties?.deathDate
      ),
  })
  .fields([
    {
      property: "founded",
      label: "Founded",
      type: "text",
      section: "timeline",
      order: 1,
      visible: (node) => Boolean(node.properties?.founded),
      sizes: ["standard", "detailed"],
    },
    {
      property: "established",
      label: "Founded",
      type: "text",
      section: "timeline",
      order: 1,
      visible: (node) =>
        !node.properties?.founded && Boolean(node.properties?.established),
      sizes: ["standard", "detailed"],
    },
    {
      property: "birth_date",
      label: "Born",
      type: "date",
      section: "timeline",
      order: 2,
      visible: (node) => Boolean(node.properties?.birth_date),
      sizes: ["standard", "detailed"],
    },
    {
      property: "birthDate",
      label: "Born",
      type: "date",
      section: "timeline",
      order: 2,
      visible: (node) =>
        !node.properties?.birth_date && Boolean(node.properties?.birthDate),
      sizes: ["standard", "detailed"],
    },
    {
      property: "death_date",
      label: "Died",
      type: "date",
      section: "timeline",
      order: 3,
      visible: (node) => Boolean(node.properties?.death_date),
      sizes: ["standard", "detailed"],
    },
    {
      property: "deathDate",
      label: "Died",
      type: "date",
      section: "timeline",
      order: 3,
      visible: (node) =>
        !node.properties?.death_date && Boolean(node.properties?.deathDate),
      sizes: ["standard", "detailed"],
    },
  ])

  // Social Metrics section
  .section({
    id: "social",
    title: "Social",
    order: 5,
    visible: (node) =>
      Boolean(node.properties?.followers || node.properties?.members),
  })
  .fields([
    {
      property: "followers",
      label: "Followers",
      type: "number",
      section: "social",
      order: 1,
      visible: (node) => Boolean(node.properties?.followers),
      sizes: ["standard", "detailed"],
    },
    {
      property: "members",
      label: "Members",
      type: "number",
      section: "social",
      order: 1,
      visible: (node) =>
        !node.properties?.followers && Boolean(node.properties?.members),
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
