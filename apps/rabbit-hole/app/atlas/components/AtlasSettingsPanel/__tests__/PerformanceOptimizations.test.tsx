/**
 * Performance Optimizations Tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";

import {
  LazySettingsSection,
  LazyEgoNetworkSettings,
} from "../LazySettingsComponents";
import { useOptimizedSettingsState } from "../OptimizedSettingsComponents";
import {
  usePerformanceMonitor,
  atlasSettingsPerformanceMonitor,
} from "../PerformanceMonitor";

// Mock the original components
vi.mock("../EgoNetworkSettings", () => ({
  EgoNetworkSettings: ({ egoSettings, onEgoSettingsChange }: any) => (
    <div data-testid="ego-network-settings">
      Hops: {egoSettings.hops}
      <button
        onClick={() => onEgoSettingsChange({ hops: egoSettings.hops + 1 })}
      >
        Increment
      </button>
    </div>
  ),
}));

vi.mock("../ViewModeSettings", () => ({
  ViewModeSettings: ({ value, onValueChange }: any) => (
    <div data-testid="view-mode-settings">
      Mode: {value}
      <button onClick={() => onValueChange("community")}>Change Mode</button>
    </div>
  ),
}));

describe.skip("Performance Optimizations", () => {
  beforeEach(() => {
    atlasSettingsPerformanceMonitor.clear();
  });

  describe("LazySettingsSection", () => {
    it("only renders components for the active view mode", async () => {
      const egoProps = {
        egoSettings: { hops: 2, nodeLimit: 50 },
        onEgoSettingsChange: vi.fn(),
        existingEntities: [],
        onCenterEntitySelect: vi.fn(),
      };

      const { rerender } = render(
        <LazySettingsSection viewMode="ego" egoNetworkProps={egoProps} />
      );

      // Should render ego network settings
      await waitFor(() => {
        expect(screen.getByTestId("ego-network-settings")).toBeInTheDocument();
      });

      // Switch to community mode
      rerender(
        <LazySettingsSection
          viewMode="community"
          communityProps={{ communityId: 1, onCommunityIdChange: vi.fn() }}
        />
      );

      // Should not render ego network settings anymore
      expect(
        screen.queryByTestId("ego-network-settings")
      ).not.toBeInTheDocument();
    });

    it("shows loading skeleton while lazy component loads", () => {
      render(
        <LazySettingsSection
          viewMode="ego"
          egoNetworkProps={{
            egoSettings: { hops: 2, nodeLimit: 50 },
            onEgoSettingsChange: vi.fn(),
            existingEntities: [],
            onCenterEntitySelect: vi.fn(),
          }}
        />
      );

      // Loading skeleton should be present initially
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("LazyEgoNetworkSettings", () => {
    it("memoizes callback props to prevent unnecessary re-renders", async () => {
      const onEgoSettingsChange = vi.fn();
      const props = {
        egoSettings: { hops: 2, nodeLimit: 50 },
        onEgoSettingsChange,
        existingEntities: [],
        onCenterEntitySelect: vi.fn(),
      };

      const { rerender } = render(<LazyEgoNetworkSettings {...props} />);

      await waitFor(() => {
        expect(screen.getByTestId("ego-network-settings")).toBeInTheDocument();
      });

      // Rerender with same props - should not cause re-render due to memoization
      rerender(<LazyEgoNetworkSettings {...props} />);

      // Component should still be there and callback should work
      const incrementButton = screen.getByText("Increment");
      await userEvent.click(incrementButton);

      expect(onEgoSettingsChange).toHaveBeenCalledWith({ hops: 3 });
    });
  });

  describe("Performance Monitoring", () => {
    it("tracks component render times", () => {
      const TestComponent = () => {
        const { measureRender } = usePerformanceMonitor();

        React.useEffect(() => {
          measureRender("TestComponent", { testProp: true });
        });

        return <div>Test Component</div>;
      };

      render(<TestComponent />);

      const metrics = atlasSettingsPerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("TestComponent-render");
    });

    it("warns about slow operations in development", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        // Mock implementation - suppress console output during tests
      });
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Simulate a slow operation
      atlasSettingsPerformanceMonitor.start("slow-operation");
      // Manually set a high duration to trigger warning
      atlasSettingsPerformanceMonitor["startTimes"].set(
        "slow-operation",
        performance.now() - 20
      );
      atlasSettingsPerformanceMonitor.end("slow-operation");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Slow Atlas Settings operation"),
        undefined
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it("provides performance summary", () => {
      atlasSettingsPerformanceMonitor.start("test-operation-1");
      atlasSettingsPerformanceMonitor.end("test-operation-1");

      atlasSettingsPerformanceMonitor.start("test-operation-1");
      atlasSettingsPerformanceMonitor.end("test-operation-1");

      const summary = atlasSettingsPerformanceMonitor.getSummary();

      expect(summary["test-operation-1"]).toBeDefined();
      expect(summary["test-operation-1"].count).toBe(2);
      expect(summary["test-operation-1"].avgTime).toBeGreaterThan(0);
    });
  });

  describe("Optimized Components", () => {
    it("memoizes components to prevent unnecessary re-renders", () => {
      let renderCount = 0;

      const TestOptimizedComponent = React.memo(
        ({ value }: { value: string }) => {
          renderCount++;
          return <div>{value}</div>;
        }
      );
      TestOptimizedComponent.displayName = "TestOptimizedComponent";

      const { rerender } = render(<TestOptimizedComponent value="test" />);
      expect(renderCount).toBe(1);

      // Rerender with same props - should not increase render count
      rerender(<TestOptimizedComponent value="test" />);
      expect(renderCount).toBe(1);

      // Rerender with different props - should increase render count
      rerender(<TestOptimizedComponent value="changed" />);
      expect(renderCount).toBe(2);
    });
  });

  describe("useOptimizedSettingsState", () => {
    it("tracks render count in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        // Mock implementation - suppress console output during tests
      });

      const TestComponent = () => {
        const { renderCount } = useOptimizedSettingsState();
        return <div>Render count: {renderCount}</div>;
      };

      const { rerender } = render(<TestComponent />);

      // Force multiple re-renders to trigger warning
      for (let i = 0; i < 12; i++) {
        rerender(<TestComponent key={i} />);
      }

      // Should warn about excessive re-renders
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("has rendered"),
        expect.any(Number),
        expect.stringContaining("times")
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});
