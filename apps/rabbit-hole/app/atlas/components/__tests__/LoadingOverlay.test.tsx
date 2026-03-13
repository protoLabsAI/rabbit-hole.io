/**
 * Tests for LoadingOverlay Component
 *
 * Tests the loading state display with spinner and dynamic messages
 * @vitest-environment jsdom
 */

import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";

import { LoadingOverlay } from "../LoadingOverlay";

describe("LoadingOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("should not render when not loading", () => {
    render(
      <LoadingOverlay
        isLoading={false}
        viewMode="full-atlas"
        graphData={null}
      />
    );

    expect(screen.queryByTestId("loading-overlay")).toBeFalsy();
  });

  it("should render loading overlay when loading", () => {
    render(
      <LoadingOverlay isLoading={true} viewMode="full-atlas" graphData={null} />
    );

    expect(screen.getByTestId("loading-overlay")).toBeTruthy();
    expect(screen.getByTestId("loading-spinner")).toBeTruthy();
  });

  it("should show Knowledge Graph message for full-atlas mode", () => {
    render(
      <LoadingOverlay isLoading={true} viewMode="full-atlas" graphData={null} />
    );

    expect(screen.getByText(/Loading Knowledge Graph/)).toBeTruthy();
  });

  it("should show Graph Tiles message for other modes", () => {
    render(<LoadingOverlay isLoading={true} viewMode="ego" graphData={null} />);

    expect(screen.getByText(/Loading Graph Tiles/)).toBeTruthy();
  });

  it("should show view-specific subtitle for ego mode", () => {
    render(<LoadingOverlay isLoading={true} viewMode="ego" graphData={null} />);

    expect(
      screen.getByText("Bounded ego network for performance")
    ).toBeTruthy();
  });

  it("should show view-specific subtitle for community mode", () => {
    render(
      <LoadingOverlay isLoading={true} viewMode="community" graphData={null} />
    );

    expect(screen.getByText("Community cluster subgraph")).toBeTruthy();
  });

  it("should show view-specific subtitle for timeslice mode", () => {
    render(
      <LoadingOverlay isLoading={true} viewMode="timeslice" graphData={null} />
    );

    expect(screen.getByText("Time-filtered activity view")).toBeTruthy();
  });

  it("should show graph data stats for full-atlas with data", () => {
    const mockGraphData = {
      nodes: [{ id: "1" }, { id: "2" }],
      edges: [{ id: "1" }],
    };

    render(
      <LoadingOverlay
        isLoading={true}
        viewMode="full-atlas"
        graphData={mockGraphData}
      />
    );

    expect(screen.getByText("2 entities • 1 relationships")).toBeTruthy();
  });

  it("should show initializing message for full-atlas without data", () => {
    render(
      <LoadingOverlay isLoading={true} viewMode="full-atlas" graphData={null} />
    );

    expect(screen.getByText("Initializing...")).toBeTruthy();
  });
});
