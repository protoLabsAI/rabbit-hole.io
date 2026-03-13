"use client";

import { useEffect } from "react";

import { useTheme } from "../context/ThemeProvider";

/**
 * DynamicBranding Component
 *
 * Updates document title and favicon based on current theme's branding configuration.
 * Must be a client component to access DOM and theme context.
 */
export function DynamicBranding() {
  const { branding } = useTheme();

  useEffect(() => {
    if (!branding) return;

    // Update document title
    document.title = branding.name;

    // Update favicon
    const existingFavicon = document.querySelector(
      'link[rel="icon"]'
    ) as HTMLLinkElement;

    if (existingFavicon) {
      existingFavicon.href = branding.favicon;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = branding.favicon;
      document.head.appendChild(link);
    }

    // Update meta description if tagline exists
    if (branding.tagline) {
      const existingDescription = document.querySelector(
        'meta[name="description"]'
      ) as HTMLMetaElement;

      if (existingDescription) {
        existingDescription.content = branding.tagline;
      }
    }
  }, [branding]);

  return null; // This component doesn't render anything
}
