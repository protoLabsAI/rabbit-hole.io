/**
 * Timeline Section Layout
 *
 * Provides consistent layout and metadata for timeline-related pages
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multi-Entity Timeline Comparison | Rabbit Hole",
  description:
    "Compare timeline events across multiple entities to uncover patterns, relationships, and insights through interactive visualization.",
  keywords: [
    "timeline",
    "comparison",
    "entity analysis",
    "events",
    "research",
    "investigation",
  ],
  openGraph: {
    title: "Multi-Entity Timeline Comparison",
    description:
      "Advanced timeline analysis and comparison tool for investigative research",
    type: "website",
  },
};

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
