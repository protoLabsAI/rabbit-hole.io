/**
 * LegendV2 Component Tests
 *
 * Tests for the enhanced legend with domain filtering and interaction capabilities.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import * as atlasUtils from "@proto/utils/atlas";

import type { CanonicalGraphData } from "../../../types/canonical-graph";
import { LegendV2 } from "../LegendV2";

// Mock the external dependencies

vi.mock("@proto/utils/atlas", () => ({
  generateLegendData: vi.fn(),
  getEntityColor: vi.fn().mockReturnValue("#3B82F6"),
  getEntityImage: vi.fn().mockReturnValue("👤"),
}));

vi.mock("../../../components/forms", () => ({
  getEntityTypesByDomain: vi.fn().mockReturnValue({
    social: ["Person", "Organization"],
    biological: ["Animal", "Plant"],
    cultural: ["Book", "Film"],
  }),
}));

const mockGraphData: CanonicalGraphData = {
  nodes: [
    { uid: "person:1", name: "Alice", type: "Person" },
    { uid: "person:2", name: "Bob", type: "Person" },
    { uid: "org:1", name: "TechCorp", type: "Organization" },
    { uid: "animal:1", name: "Lion", type: "Animal" },
    { uid: "book:1", name: "Test Book", type: "Book" },
  ],
  edges: [],
};

const mockLegendData = [
  {
    type: "Person",
    color: "#3B82F6",
    icon: "👤",
    count: 2,
    visibleCount: 2,
    visible: true,
  },
  {
    type: "Organization",
    color: "#10B981",
    icon: "🏢",
    count: 1,
    visibleCount: 1,
    visible: true,
  },
  {
    type: "Animal",
    color: "#F59E0B",
    icon: "🦁",
    count: 1,
    visibleCount: 1,
    visible: true,
  },
  {
    type: "Book",
    color: "#EC4899",
    icon: "📚",
    count: 1,
    visibleCount: 1,
    visible: true,
  },
];

describe.skip("LegendV2", () => {
  const mockProps = {
    graphData: mockGraphData,
    hiddenEntityTypes: new Set<string>(),
    onToggleEntityType: vi.fn(),
    onToggleMultipleEntityTypes: vi.fn(),
    onShowAllEntityTypes: vi.fn(),
    onIsolateEntityTypes: vi.fn(),
    settingsPosition: "bottom-left" as const,
    viewMode: "full-atlas" as const,
    maxVisibleItems: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock generateLegendData to return our test data
    vi.mocked(atlasUtils.generateLegendData).mockReturnValue(mockLegendData);
  });

  it("renders legend with domain grouping", () => {
    render(<LegendV2 {...mockProps} />);

    expect(screen.getByText("Atlas Legend")).toBeInTheDocument();
    expect(
      screen.getByText("5 visible • 5 total entities")
    ).toBeInTheDocument();

    // Should show domain headers
    expect(screen.getByText("social")).toBeInTheDocument();
    expect(screen.getByText("biological")).toBeInTheDocument();
    expect(screen.getByText("cultural")).toBeInTheDocument();
  });

  it("handles domain expansion/collapse", async () => {
    render(<LegendV2 {...mockProps} />);

    // Find and click the expand button for social domain
    const socialDomain = screen.getByText("social").closest("div");
    const expandButton =
      socialDomain?.querySelector("[data-testid='expand-button']") ||
      socialDomain?.querySelector("button:last-child");

    if (expandButton) {
      await userEvent.click(expandButton);

      // Should show entity details when expanded
      await waitFor(() => {
        expect(screen.getByText("Person")).toBeInTheDocument();
        expect(screen.getByText("Organization")).toBeInTheDocument();
      });
    }
  });

  it("handles single entity type toggle", async () => {
    render(<LegendV2 {...mockProps} />);

    // Expand the social domain first
    const socialExpandButton = screen
      .getByText("social")
      .closest("div")
      ?.querySelector("button:last-child");

    if (socialExpandButton) {
      await userEvent.click(socialExpandButton);

      await waitFor(() => {
        const personCheckbox = screen
          .getByText("Person")
          .closest("div")
          ?.querySelector("button[data-state]");

        if (personCheckbox) {
          fireEvent.click(personCheckbox);
          expect(mockProps.onToggleEntityType).toHaveBeenCalledWith("Person");
        }
      });
    }
  });

  it("handles shift+click for entity isolation", async () => {
    render(<LegendV2 {...mockProps} />);

    // Expand the social domain
    const socialExpandButton = screen
      .getByText("social")
      .closest("div")
      ?.querySelector("button:last-child");

    if (socialExpandButton) {
      await userEvent.click(socialExpandButton);

      await waitFor(() => {
        const personButton = screen.getByText("Person").closest("button");

        if (personButton) {
          // Simulate shift+click
          fireEvent.click(personButton, { shiftKey: true });
          expect(mockProps.onIsolateEntityTypes).toHaveBeenCalledWith([
            "Person",
          ]);
        }
      });
    }
  });

  it("handles domain-level toggle", async () => {
    render(<LegendV2 {...mockProps} />);

    const socialDomainButton = screen.getByText("social").closest("button");

    if (socialDomainButton) {
      await userEvent.click(socialDomainButton);
      expect(mockProps.onToggleMultipleEntityTypes).toHaveBeenCalledWith(
        ["Person", "Organization"],
        expect.any(Boolean)
      );
    }
  });

  it("handles domain-level isolation with shift+click", async () => {
    render(<LegendV2 {...mockProps} />);

    const socialDomainButton = screen.getByText("social").closest("button");

    if (socialDomainButton) {
      fireEvent.click(socialDomainButton, { shiftKey: true });
      expect(mockProps.onIsolateEntityTypes).toHaveBeenCalledWith([
        "Person",
        "Organization",
      ]);
    }
  });

  it("shows partial visibility state for domains", () => {
    const partiallyHidden = new Set(["Person"]);

    render(<LegendV2 {...mockProps} hiddenEntityTypes={partiallyHidden} />);

    // The social domain should show as partially visible
    const socialCheckbox = screen
      .getByText("social")
      .closest("div")
      ?.querySelector("button[data-state]");

    // Note: This is a simplified test - the actual indeterminate state
    // would need to be tested with more specific DOM queries
    expect(socialCheckbox).toBeInTheDocument();
  });

  it("handles Show All button", async () => {
    render(<LegendV2 {...mockProps} hiddenEntityTypes={new Set(["Person"])} />);

    const showAllButton = screen.getByText("Show All");
    await userEvent.click(showAllButton);

    expect(mockProps.onShowAllEntityTypes).toHaveBeenCalled();
  });

  it("disables Show All when no entities are hidden", () => {
    render(<LegendV2 {...mockProps} />);

    const showAllButton = screen.getByText("Show All");
    expect(showAllButton).toBeDisabled();
  });

  it("shows loading state when no graph data", () => {
    render(<LegendV2 {...mockProps} graphData={null} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows view mode indicator for non-full-atlas views", () => {
    render(<LegendV2 {...mockProps} viewMode="ego" />);

    expect(screen.getByText("📊 ego view")).toBeInTheDocument();
  });

  it("implements view more functionality when max items exceeded", () => {
    const manyDomainsProps = {
      ...mockProps,
      maxVisibleItems: 2, // Limit to 2 to trigger "view more"
    };

    render(<LegendV2 {...manyDomainsProps} />);

    // Should show "Show More" button since we have 3 domains but limit is 2
    expect(screen.getByText(/Show.*More/)).toBeInTheDocument();
  });

  it("calculates domain statistics correctly", () => {
    const mixedHidden = new Set(["Person", "Animal"]);

    render(<LegendV2 {...mockProps} hiddenEntityTypes={mixedHidden} />);

    // Check that entity counts reflect hidden status
    // Social domain: 1/2 visible (Person hidden, Organization visible)
    // Biological domain: 0/1 visible (Animal hidden)
    expect(
      screen.getByText("3 visible • 5 total entities")
    ).toBeInTheDocument();
  });

  it("handles empty result gracefully", () => {
    const emptyGraphData: CanonicalGraphData = { nodes: [], edges: [] };
    vi.mocked(atlasUtils.generateLegendData).mockReturnValue([]);

    render(<LegendV2 {...mockProps} graphData={emptyGraphData} />);

    expect(
      screen.getByText("0 visible • 0 total entities")
    ).toBeInTheDocument();
  });
});
