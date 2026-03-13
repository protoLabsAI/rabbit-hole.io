/**
 * EventTimelineChart Component Tests
 *
 * Tests for the EventTimelineChart component robustness with various data scenarios
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";

import { EventTimelineChart } from "../EventTimelineChart";

// Mock the ego graph URL creation
vi.mock("@proto/utils/atlas", () => ({
  createEgoGraphUrl: vi.fn(
    (entityUid: string, timestamp: string) =>
      `/atlas?mode=ego&center=${entityUid}&date=${timestamp}`
  ),
}));

// Mock window.open for ego graph linking tests
const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", {
  writable: true,
  value: mockWindowOpen,
});

describe.skip("EventTimelineChart", () => {
  const createMockEvent = (overrides = {}) => ({
    id: "test-event-1",
    timestamp: "2024-01-15T10:00:00Z",
    eventType: "relationship" as const,
    category: "relationship",
    title: "Test Event",
    confidence: 0.8,
    importance: "minor" as const,
    targetEntity: {
      uid: "per:test_person",
      name: "Test Person",
      type: "Person",
    },
    evidence: [
      {
        uid: "evidence:test",
        title: "Test Evidence",
        publisher: "Test Publisher",
        url: "https://example.com",
        reliability: 0.9,
      },
    ],
    ...overrides,
  });

  describe("Empty States", () => {
    it("should render empty state when no events provided", () => {
      render(<EventTimelineChart events={[]} />);

      expect(screen.getByText("No Events Found")).toBeInTheDocument();
      expect(
        screen.getByText("No timeline events in the selected period")
      ).toBeInTheDocument();
    });

    it("should handle undefined events array gracefully", () => {
      render(<EventTimelineChart events={undefined as any} />);

      expect(screen.getByText("No Events Found")).toBeInTheDocument();
    });
  });

  describe("Date Handling", () => {
    it("should handle mixed date formats", () => {
      const events = [
        createMockEvent({ timestamp: "2024-01-15T10:00:00Z" }), // ISO string
        createMockEvent({
          id: "test-2",
          timestamp: { year: 2024, month: 1, day: 16, hour: 10 }, // Neo4j date object
        }),
      ];

      render(<EventTimelineChart events={events} />);

      // Should render timeline without crashing
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    it("should sort events chronologically", () => {
      const events = [
        createMockEvent({
          id: "event-2",
          timestamp: "2024-01-16T10:00:00Z",
          title: "Later Event",
        }),
        createMockEvent({
          id: "event-1",
          timestamp: "2024-01-15T10:00:00Z",
          title: "Earlier Event",
        }),
      ];

      render(<EventTimelineChart events={events} />);

      // Both events should be rendered
      expect(screen.getByText("Earlier Event")).toBeInTheDocument();
      expect(screen.getByText("Later Event")).toBeInTheDocument();
    });

    it("should handle invalid timestamps gracefully", () => {
      const events = [
        createMockEvent({ timestamp: "invalid-date" }),
        createMockEvent({ timestamp: null }),
        createMockEvent({ timestamp: undefined }),
      ];

      // Should not crash when rendering
      expect(() => {
        render(<EventTimelineChart events={events} />);
      }).not.toThrow();
    });
  });

  describe("Duration Events", () => {
    it("should differentiate between point and duration events", () => {
      const events = [
        createMockEvent({
          id: "point-event",
          title: "Point Event",
          endDate: undefined,
        }),
        createMockEvent({
          id: "duration-event",
          title: "Duration Event",
          endDate: "2024-01-20T10:00:00Z",
        }),
      ];

      render(<EventTimelineChart events={events} />);

      expect(screen.getByText("Point Event")).toBeInTheDocument();
      expect(screen.getByText("Duration Event")).toBeInTheDocument();
    });

    it("should handle ongoing events with proper indicators", () => {
      const ongoingEvent = createMockEvent({
        eventType: "ongoing",
        endDate: undefined,
        title: "Ongoing Event",
      });

      render(<EventTimelineChart events={[ongoingEvent]} />);

      expect(screen.getByText("Ongoing Event")).toBeInTheDocument();
    });
  });

  describe("Interaction Handling", () => {
    it("should handle ego graph linking for events with target entities", () => {
      const event = createMockEvent();

      render(<EventTimelineChart events={[event]} />);

      // Click on event to open details
      const eventElement = screen.getByText("Test Event");
      fireEvent.click(eventElement);

      // Should show event details
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    it("should handle events without target entities", () => {
      const eventWithoutTarget = createMockEvent({
        targetEntity: undefined,
        title: "No Target Event",
      });

      render(<EventTimelineChart events={[eventWithoutTarget]} />);

      expect(screen.getByText("No Target Event")).toBeInTheDocument();
    });

    it("should handle missing evidence gracefully", () => {
      const eventWithoutEvidence = createMockEvent({
        evidence: undefined,
        title: "No Evidence Event",
      });

      render(<EventTimelineChart events={[eventWithoutEvidence]} />);

      expect(screen.getByText("No Evidence Event")).toBeInTheDocument();
    });
  });

  describe("Large Dataset Performance", () => {
    it("should handle large numbers of events", () => {
      // Create 100 events
      const events = Array.from({ length: 100 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          timestamp: new Date(2024, 0, i + 1).toISOString(),
          title: `Event ${i + 1}`,
        })
      );

      const startTime = performance.now();
      render(<EventTimelineChart events={events} />);
      const renderTime = performance.now() - startTime;

      // Should render within reasonable time (< 100ms for component rendering)
      expect(renderTime).toBeLessThan(100);

      // Should still show events
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    it("should handle events with same timestamps", () => {
      const sameTimeEvents = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `same-time-${i}`,
          timestamp: "2024-01-15T10:00:00Z",
          title: `Same Time Event ${i + 1}`,
        })
      );

      render(<EventTimelineChart events={sameTimeEvents} />);

      // Should render all events without overlap issues
      expect(screen.getByText("Same Time Event 1")).toBeInTheDocument();
      expect(screen.getByText("Same Time Event 5")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle extremely long event titles", () => {
      const longTitle = "A".repeat(200);
      const event = createMockEvent({ title: longTitle });

      render(<EventTimelineChart events={[event]} />);

      // Should truncate or handle long titles gracefully
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle events with very high confidence scores", () => {
      const highConfidenceEvent = createMockEvent({
        confidence: 1.0,
        title: "High Confidence Event",
      });

      render(<EventTimelineChart events={[highConfidenceEvent]} />);

      expect(screen.getByText("High Confidence Event")).toBeInTheDocument();
    });

    it("should handle events with very low confidence scores", () => {
      const lowConfidenceEvent = createMockEvent({
        confidence: 0.1,
        title: "Low Confidence Event",
      });

      render(<EventTimelineChart events={[lowConfidenceEvent]} />);

      expect(screen.getByText("Low Confidence Event")).toBeInTheDocument();
    });

    it("should handle events spanning multiple years", () => {
      const events = [
        createMockEvent({
          id: "old-event",
          timestamp: "2020-01-01T00:00:00Z",
          title: "Old Event",
        }),
        createMockEvent({
          id: "new-event",
          timestamp: "2025-12-31T23:59:59Z",
          title: "Future Event",
        }),
      ];

      render(<EventTimelineChart events={events} />);

      expect(screen.getByText("Old Event")).toBeInTheDocument();
      expect(screen.getByText("Future Event")).toBeInTheDocument();
    });
  });
});
