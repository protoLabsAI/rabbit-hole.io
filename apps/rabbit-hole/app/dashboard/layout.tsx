/**
 * Dashboard Layout
 *
 * Layout wrapper for the development dashboard with navigation and metadata.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Development Dashboard | Rabbit Hole",
  description:
    "Administrative interface for managing system components during development",
  robots: "noindex, nofollow", // Don't index development tools
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
