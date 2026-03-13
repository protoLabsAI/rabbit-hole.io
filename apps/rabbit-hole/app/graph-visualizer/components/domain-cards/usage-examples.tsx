/**
 * Domain Cards Usage Examples
 *
 * Demonstrates how to use domain cards in various UI contexts
 * throughout the application.
 */

import React from "react";

import { DomainCardFactory, type DomainNodeData } from "./index";

// Example entity data
const exampleEntities = {
  biological: {
    uid: "animal:polar_bear",
    name: "Polar Bear",
    type: "Animal" as const,
    properties: {
      scientificName: "Ursus maritimus",
      conservationStatus: "vulnerable",
      habitat: "Arctic ice floes",
      diet: "carnivore",
    },
  },
  social: {
    uid: "person:jane_goodall",
    name: "Jane Goodall",
    type: "Person" as const,
    properties: {
      occupation: "Primatologist",
      nationality: "British",
      bio: "Renowned primatologist and conservationist",
      status: "active",
    },
  },
};

/**
 * Example 1: Entity Search Results
 * Use cards to display search results with different sizes
 */
export const EntitySearchResults: React.FC = () => (
  <div className="space-y-3">
    <h3 className="text-lg font-semibold">Search Results</h3>

    {/* Compact cards for search results */}
    <div className="space-y-2">
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.biological }}
        cardProps={{
          size: "compact",
          onClick: (node) => console.log("Navigate to:", node.uid),
        }}
      />
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.social }}
        cardProps={{
          size: "compact",
          onClick: (node) => console.log("Navigate to:", node.uid),
        }}
      />
    </div>
  </div>
);

/**
 * Example 2: Entity Detail Sidebar
 * Use standard cards for detailed information panels
 */
export const EntityDetailSidebar: React.FC<{ entityData: DomainNodeData }> = ({
  entityData,
}) => (
  <div className="w-80 p-4 bg-gray-50 h-full">
    <h3 className="text-lg font-semibold mb-4">Entity Details</h3>

    <DomainCardFactory
      cytoscapeNode={{ data: () => entityData }}
      cardProps={{
        size: "detailed",
        onClick: (node) => console.log("Edit entity:", node.uid),
        className: "mb-4",
      }}
    />
  </div>
);

/**
 * Example 3: Timeline Event Cards
 * Use cards to display timeline events with context
 */
export const TimelineEventCards: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Timeline Events</h3>

    <div className="space-y-3">
      {[exampleEntities.biological, exampleEntities.social].map(
        (entity, index) => (
          <div key={entity.uid} className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
            <div className="flex-1">
              <DomainCardFactory
                cytoscapeNode={{ data: () => entity }}
                cardProps={{
                  size: "standard",
                  interactive: false,
                  className: "shadow-sm",
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  </div>
);

/**
 * Example 4: Dashboard Entity Grid
 * Use cards in a responsive grid layout
 */
export const DashboardEntityGrid: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Related Entities</h3>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.biological }}
        cardProps={{
          size: "standard",
          selectable: true,
          onClick: (node) => console.log("Select entity:", node.uid),
        }}
      />
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.social }}
        cardProps={{
          size: "standard",
          selectable: true,
          onClick: (node) => console.log("Select entity:", node.uid),
        }}
      />
    </div>
  </div>
);

/**
 * Example 5: Mobile-Optimized Cards
 * Cards adapted for mobile interfaces
 */
export const MobileEntityCards: React.FC = () => (
  <div className="space-y-3 px-4">
    <h3 className="text-lg font-semibold">Entities (Mobile)</h3>

    {/* Full-width compact cards for mobile */}
    <div className="space-y-2">
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.biological }}
        cardProps={{
          size: "compact",
          onClick: (node) => console.log("View details:", node.uid),
          className: "w-full",
        }}
      />
      <DomainCardFactory
        cytoscapeNode={{ data: () => exampleEntities.social }}
        cardProps={{
          size: "compact",
          onClick: (node) => console.log("View details:", node.uid),
          className: "w-full",
        }}
      />
    </div>
  </div>
);

// Export all examples for easy import
export const DomainCardExamples = {
  EntitySearchResults,
  EntityDetailSidebar,
  TimelineEventCards,
  DashboardEntityGrid,
  MobileEntityCards,
};
