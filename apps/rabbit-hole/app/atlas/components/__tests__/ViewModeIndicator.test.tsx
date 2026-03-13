/**
 * Tests for ViewModeIndicator Component
 *
 * Tests the dynamic view status display with different view modes
 * @vitest-environment jsdom
 */

import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";

import { ViewModeIndicator } from "../ViewModeIndicator";

describe("ViewModeIndicator", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render full-atlas view mode", () => {
    render(
      <ViewModeIndicator
        viewMode="full-atlas"
        centerEntity={null}
        communityId={null}
        timeWindow={{ from: "", to: "" }}
        isBounded={false}
        existingEntities={[]}
      />
    );

    expect(screen.getByText("🌐 Full Atlas")).toBeTruthy();
  });

  it("should render ego view mode with center entity", () => {
    const existingEntities = [
      { id: "person-123", label: "John Doe", entityType: "person" },
    ];

    render(
      <ViewModeIndicator
        viewMode="ego"
        centerEntity="person-123"
        communityId={null}
        timeWindow={{ from: "", to: "" }}
        isBounded={false}
        existingEntities={existingEntities}
      />
    );

    expect(screen.getByText(/🎯 Ego: John Doe/)).toBeTruthy();
  });

  it("should render ego view mode with select entity prompt", () => {
    render(
      <ViewModeIndicator
        viewMode="ego"
        centerEntity={null}
        communityId={null}
        timeWindow={{ from: "", to: "" }}
        isBounded={false}
        existingEntities={[]}
      />
    );

    expect(screen.getByText(/🎯 Ego: Select Entity/)).toBeTruthy();
  });

  it("should render community view mode", () => {
    render(
      <ViewModeIndicator
        viewMode="community"
        centerEntity={null}
        communityId={5}
        timeWindow={{ from: "", to: "" }}
        isBounded={false}
        existingEntities={[]}
      />
    );

    expect(screen.getByText("🏘️ Community 5")).toBeTruthy();
  });

  it("should render timeslice view mode", () => {
    render(
      <ViewModeIndicator
        viewMode="timeslice"
        centerEntity={null}
        communityId={null}
        timeWindow={{ from: "2024-01-01", to: "2024-12-31" }}
        isBounded={false}
        existingEntities={[]}
      />
    );

    expect(screen.getByText("⏰ 2024-01-01 to 2024-12-31")).toBeTruthy();
  });

  it("should show bounded indicator when bounded is true", () => {
    render(
      <ViewModeIndicator
        viewMode="full-atlas"
        centerEntity={null}
        communityId={null}
        timeWindow={{ from: "", to: "" }}
        isBounded={true}
        existingEntities={[]}
      />
    );

    expect(screen.getByText("Bounded")).toBeTruthy();
  });

  it("should render container with correct styling", () => {
    render(
      <ViewModeIndicator
        viewMode="full-atlas"
        centerEntity={null}
        communityId={null}
        timeWindow={{ from: "", to: "" }}
        isBounded={false}
        existingEntities={[]}
      />
    );

    const container = screen.getByTestId("view-mode-indicator");
    expect(container).toBeTruthy();
    expect(container.className).toContain("flex");
    expect(container.className).toContain("items-center");
  });
});
