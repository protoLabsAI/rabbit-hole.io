/**
 * Tests for Legend Component
 *
 * Tests the entity legend with filtering, statistics, and interactions
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { Legend } from "../Legend";

describe("Legend", () => {
  const mockGraphData = {
    nodes: [
      { id: "1", entityType: "person" },
      { id: "2", entityType: "organization" },
      { id: "3", entityType: "person" },
    ],
    edges: [{ id: "e1" }, { id: "e2" }],
  };

  const defaultProps = {
    graphData: mockGraphData,
    hiddenEntityTypes: new Set<string>(),
    onToggleEntityType: vi.fn(),
    onShowAllEntityTypes: vi.fn(),
    onLegendRightClick: vi.fn(),
    settingsPosition: "bottom-right" as const,
    viewMode: "full-atlas" as const,
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render legend title", () => {
    render(<Legend {...defaultProps} />);

    expect(screen.getByText("Legend")).toBeTruthy();
  });

  it("should render entity statistics", () => {
    render(<Legend {...defaultProps} />);

    expect(screen.getByText("3 entities • 2 relationships")).toBeTruthy();
  });

  it("should render legend items container", () => {
    render(<Legend {...defaultProps} />);

    const container = screen.getByTestId("legend-container");
    expect(container).toBeTruthy();
    // Legend items are rendered by the real LegendItem component
  });

  it("should show Show All button when entities are hidden", () => {
    const hiddenTypes = new Set(["person"]);

    render(<Legend {...defaultProps} hiddenEntityTypes={hiddenTypes} />);

    const showAllButton = screen.getByText("Show All");
    expect(showAllButton).toBeTruthy();
    expect(showAllButton.className).toContain("opacity-100");
    expect(showAllButton.className).not.toContain("pointer-events-none");
  });

  it("should hide Show All button when no entities are hidden", () => {
    render(<Legend {...defaultProps} />);

    const showAllButton = screen.getByText("Show All");
    expect(showAllButton.className).toContain("opacity-0");
    expect(showAllButton.className).toContain("pointer-events-none");
  });

  it("should call onShowAllEntityTypes when Show All is clicked", () => {
    const hiddenTypes = new Set(["person"]);

    render(<Legend {...defaultProps} hiddenEntityTypes={hiddenTypes} />);

    fireEvent.click(screen.getByText("Show All"));
    expect(defaultProps.onShowAllEntityTypes).toHaveBeenCalledTimes(1);
  });

  it("should show bounded view indicator for non-full-atlas modes", () => {
    render(<Legend {...defaultProps} viewMode="ego" />);

    expect(
      screen.getByText(/📊 Bounded ego view for performance/)
    ).toBeTruthy();
  });

  it("should show empty state when no graph data", () => {
    render(<Legend {...defaultProps} graphData={null} />);

    expect(screen.getByText("loading...")).toBeTruthy();
  });

  it("should show no entities message when no legend items", () => {
    const emptyGraphData = { nodes: [], edges: [] };

    render(<Legend {...defaultProps} graphData={emptyGraphData} />);

    expect(screen.getByText("No entities loaded")).toBeTruthy();
  });

  it("should position correctly based on settingsPosition", () => {
    render(<Legend {...defaultProps} settingsPosition="bottom-left" />);

    const container = screen.getByTestId("legend-container");
    expect(container.className).toContain("bottom-4");
    expect(container.className).toContain("left-20");
  });
});
