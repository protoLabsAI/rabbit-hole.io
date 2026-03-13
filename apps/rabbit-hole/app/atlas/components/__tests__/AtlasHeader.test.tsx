/**
 * Tests for AtlasHeader Component
 *
 * Tests the atlas brand/logo display component
 * @vitest-environment jsdom
 */

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";

import { AtlasHeader } from "../AtlasHeader";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe.skip("AtlasHeader", () => {
  afterEach(() => {
    cleanup();
    mockPush.mockClear();
  });

  it("should render the rabbit emoji logo", () => {
    render(<AtlasHeader />);

    const logoElement = screen.getByText("🐰");
    expect(logoElement).toBeTruthy();
  });

  it("should render the rabbit-hole.io title", () => {
    render(<AtlasHeader />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe("rabbit-hole.io");
  });

  it("should render the header container", () => {
    render(<AtlasHeader />);

    const headerContainer = screen.getByTestId("atlas-header");
    expect(headerContainer).toBeTruthy();
  });

  it("should render the brand section as a clickable button", () => {
    render(<AtlasHeader />);

    const brandSection = screen.getByTestId("brand-section");
    expect(brandSection).toBeTruthy();
    expect(brandSection.tagName.toLowerCase()).toBe("button");
  });

  it("should navigate to atlas when logo is clicked (default behavior)", () => {
    render(<AtlasHeader />);

    const brandButton = screen.getByTestId("brand-section");
    fireEvent.click(brandButton);

    expect(mockPush).toHaveBeenCalledWith("/atlas");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("should call custom onLogoClick handler when provided", () => {
    const mockOnLogoClick = vi.fn();
    render(<AtlasHeader onLogoClick={mockOnLogoClick} />);

    const brandButton = screen.getByTestId("brand-section");
    fireEvent.click(brandButton);

    expect(mockOnLogoClick).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    render(<AtlasHeader />);

    const brandButton = screen.getByTestId("brand-section");
    expect(brandButton.getAttribute("title")).toBe("Go to Atlas home");
  });
});
