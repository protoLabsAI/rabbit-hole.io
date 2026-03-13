/**
 * Tests for ControlButtons Component
 *
 * Tests the action buttons for Import, Export, AI Research, and Graph Controls
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { ControlButtons } from "../ControlButtons";

describe.skip("ControlButtons", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render all control buttons", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    expect(screen.getByText("Import")).toBeTruthy();
    expect(screen.getByText("Export")).toBeTruthy();
    expect(screen.getByText("AI Research")).toBeTruthy();
  });

  it("should call onOpenBulkImport when Import button is clicked", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    fireEvent.click(screen.getByText("Import"));
    expect(mockProps.onOpenBulkImport).toHaveBeenCalledTimes(1);
  });

  it("should call onExport when Export button is clicked", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    fireEvent.click(screen.getByText("Export"));
    expect(mockProps.onExport).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenAddForm when AI Research button is clicked", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    fireEvent.click(screen.getByText("AI Research"));
    expect(mockProps.onOpenAddForm).toHaveBeenCalledTimes(1);
  });

  it("should have correct styling classes", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    const container = screen.getByTestId("control-buttons");
    expect(container).toBeTruthy();
    expect(container.className).toContain("flex");
    expect(container.className).toContain("items-center");
  });

  it("should render graph control buttons when provided", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
      onResetView: vi.fn(),
      onFitToScreen: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    expect(screen.getByText("Fit")).toBeTruthy();
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("should call onResetView when Reset button is clicked", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
      onResetView: vi.fn(),
      onFitToScreen: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    fireEvent.click(screen.getByText("Reset"));
    expect(mockProps.onResetView).toHaveBeenCalledTimes(1);
  });

  it("should call onFitToScreen when Fit button is clicked", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
      onResetView: vi.fn(),
      onFitToScreen: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    fireEvent.click(screen.getByText("Fit"));
    expect(mockProps.onFitToScreen).toHaveBeenCalledTimes(1);
  });

  it("should not render graph controls when callbacks not provided", () => {
    const mockProps = {
      onOpenBulkImport: vi.fn(),
      onOpenAddForm: vi.fn(),
      onExport: vi.fn(),
    };

    render(<ControlButtons {...mockProps} />);

    expect(screen.queryByText("Fit")).toBeNull();
    expect(screen.queryByText("Reset")).toBeNull();
  });
});
