"use client";
// Test: Trigger Docker PR workflow

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@proto/ui/atoms";
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@proto/ui/molecules";

import { TrustedBy } from "./components/landing/TrustedBy";
import { useTheme } from "./context/ThemeProvider";

export default function HomePage() {
  const { branding } = useTheme();
  const router = useRouter();
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const newClickCount = logoClicks + 1;
    setLogoClicks(newClickCount);

    if (newClickCount === 3) {
      setLogoClicks(0);
      router.push("/sign-in");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col gap-16 items-center justify-center min-h-screen px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center gap-8 max-w-5xl mx-auto">
          {/* Announcement */}
          <Link href="#">
            <Announcement>
              <AnnouncementTag>Coming Soon</AnnouncementTag>
              <AnnouncementTitle>
                Evidence-based knowledge graphs
              </AnnouncementTitle>
            </Announcement>
          </Link>

          {/* Hero Title with Logo */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleLogoClick}
              className="text-6xl sm:text-7xl md:text-8xl cursor-pointer hover:opacity-80 transition-opacity"
              type="button"
              aria-label="Logo"
            >
              {branding?.logo || "✏️"}
            </button>
            <h1 className="mb-0 text-balance font-medium text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] tracking-tight">
              {branding?.name || "research-graph.com"}
            </h1>
          </div>

          {/* Description */}
          <p className="mt-0 mb-0 text-balance text-xl md:text-2xl text-muted-foreground max-w-3xl">
            {branding?.tagline ||
              "Build powerful evidence-based knowledge graphs with AI-powered research and analysis"}
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">Join Waitlist</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>

        {/* Trusted By Section - Toggle visibility by setting visible={false} */}
        <div className="w-full">
          <TrustedBy visible={true} animated={true} />
        </div>
      </div>
    </div>
  );
}
