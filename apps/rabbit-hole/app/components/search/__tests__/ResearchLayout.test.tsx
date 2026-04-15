import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

import { ResearchLayout } from "../ResearchLayout";
import type { ActivityEvent } from "../types";

// ─── Minimal test doubles ────────────────────────────────────────────

vi.mock("../EntityCard", () => ({
  EntityCard: ({ entity }: any) => (
    <div data-testid="entity-card">{entity.name}</div>
  ),
}));
vi.mock("../CommunityCard", () => ({
  CommunityCard: ({ community }: any) => (
    <div data-testid="community-card">{community.summary}</div>
  ),
}));
vi.mock("../SourceCard", () => ({
  SourceCard: ({ source }: any) => (
    <div data-testid="source-card">{source.title}</div>
  ),
}));

// ─── Chat mode tests ─────────────────────────────────────────────────

describe("ResearchLayout — chat mode", () => {
  test("renders children when no drawer content", () => {
    render(
      <ResearchLayout mode="chat">
        <p>Chat answer text</p>
      </ResearchLayout>
    );
    expect(screen.getByText("Chat answer text")).toBeTruthy();
  });

  test("shows sources in right panel when sources present", () => {
    const sources = [
      {
        title: "Test Source",
        url: "https://example.com",
        type: "web" as const,
      },
    ];
    render(
      <ResearchLayout mode="chat" sources={sources} isStreaming={false}>
        <p>Answer</p>
      </ResearchLayout>
    );
    expect(screen.getAllByTestId("source-card").length).toBeGreaterThan(0);
  });

  test("shows activity events in right panel", () => {
    const events: ActivityEvent[] = [
      {
        type: "search.started",
        data: { source: "web", query: "test query" },
        timestamp: Date.now(),
      },
    ];
    const sources = [
      { title: "A Source", url: "https://example.com", type: "web" as const },
    ];
    render(
      <ResearchLayout mode="chat" activityEvents={events} sources={sources}>
        <p>Answer</p>
      </ResearchLayout>
    );
    expect(screen.getByText(/Searching web/i)).toBeTruthy();
  });

  test("toggles drawer collapse/expand on button click", () => {
    const sources = [
      { title: "Source", url: "https://example.com", type: "web" as const },
    ];
    render(
      <ResearchLayout mode="chat" sources={sources}>
        <p>Answer</p>
      </ResearchLayout>
    );
    // Collapse button should be present in expanded state
    const collapseBtn = screen.getByTitle("Collapse");
    fireEvent.click(collapseBtn);
    // After collapse, the expanded panel is gone; the icon button to reopen appears
    const expandBtn = screen.getByTitle(/item/i);
    expect(expandBtn).toBeTruthy();
  });

  test("renders mobile bottom sheet when mobileOpen=true", () => {
    const sources = [
      {
        title: "Mobile Source",
        url: "https://example.com",
        type: "web" as const,
      },
    ];
    render(
      <ResearchLayout
        mode="chat"
        sources={sources}
        mobileOpen={true}
        onMobileClose={vi.fn()}
      >
        <p>Answer</p>
      </ResearchLayout>
    );
    // Bottom sheet content should include Sources heading
    const sourceHeadings = screen.getAllByText("Sources");
    expect(sourceHeadings.length).toBeGreaterThan(0);
  });
});

// ─── Deep research mode tests ────────────────────────────────────────

describe("ResearchLayout — deep-research mode", () => {
  test("renders children inside centered max-w-3xl container", () => {
    render(
      <ResearchLayout mode="deep-research">
        <p>Research report content</p>
      </ResearchLayout>
    );
    expect(screen.getByText("Research report content")).toBeTruthy();
  });

  test("shows Activity and Sources tabs in drawer", () => {
    render(
      <ResearchLayout mode="deep-research" isStreaming={true}>
        <p>Report</p>
      </ResearchLayout>
    );
    expect(screen.getByText("Activity")).toBeTruthy();
    expect(screen.getByText("Sources")).toBeTruthy();
  });

  test("open-drawer button calls onDrawerToggle when drawer is closed", () => {
    const onToggle = vi.fn();
    render(
      <ResearchLayout
        mode="deep-research"
        drawerOpen={false}
        onDrawerToggle={onToggle}
      >
        <p>Report</p>
      </ResearchLayout>
    );
    const openBtn = screen.getByTitle("Open drawer");
    fireEvent.click(openBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  test("renders key findings section when findings provided", () => {
    const findings = ["Finding 1", "Finding 2"];
    render(
      <ResearchLayout
        mode="deep-research"
        findings={findings}
        isStreaming={true}
      >
        <p>Report</p>
      </ResearchLayout>
    );
    expect(screen.getByText(/Key Findings/)).toBeTruthy();
  });
});
