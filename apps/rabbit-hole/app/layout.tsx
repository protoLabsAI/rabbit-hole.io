import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@protolabsai/ui/atoms";
import {
  getValidatedThemeName,
  getTheme,
  ThemeGenerator,
} from "@protolabsai/ui/theme";

import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_HANDLE,
} from "./_lib/site-config";
import { DebugUtilsInitializer } from "./components/DebugUtilsInitializer";
import { DomainRegistryInitializer } from "./components/DomainRegistryInitializer";
import { DynamicBranding } from "./components/DynamicBranding";
import { GlobalUserMenuWrapper } from "./components/layout/GlobalUserMenuWrapper";
import { WebVitalsMonitor } from "./components/WebVitalsMonitor";
import { ThemeProvider } from "./context/ThemeProvider";
import { ContextMenuRenderer } from "./context-menu";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Site metadata — identity lives in `_lib/site-config`, shared with the
// dynamic OG/Twitter images, robots, and sitemap. The OG/Twitter image URLs
// are auto-injected by `opengraph-image.tsx` / `twitter-image.tsx`.
export function generateMetadata(): Metadata {
  const twitter: Metadata["twitter"] = {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ...(TWITTER_HANDLE ? { site: TWITTER_HANDLE, creator: TWITTER_HANDLE } : {}),
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_TITLE,
      template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    applicationName: SITE_NAME,
    alternates: { canonical: "/" },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "32x32" },
      ],
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: SITE_URL,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      locale: "en_US",
      // image auto-injected from app/opengraph-image.tsx
    },
    twitter,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: SITE_NAME,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F7F4" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validate theme name from env var with Zod schema
  const defaultTheme = getValidatedThemeName(
    process.env.NEXT_PUBLIC_DEFAULT_THEME,
    "default"
  );

  // Generate theme CSS server-side so it lands in the initial HTML —
  // prevents the flash of unstyled content before client JS hydrates.
  const themeCSS = ThemeGenerator.generateCSSVariables(getTheme(defaultTheme));

  // Structured data for search engines. WebSite + Organization only — no
  // SearchAction yet, since there's no `?q=` query entrypoint to honor.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#org` },
        inLanguage: "en",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          id="dynamic-theme"
          dangerouslySetInnerHTML={{ __html: themeCSS }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultThemeName={defaultTheme}>
          <DebugUtilsInitializer />
          <DomainRegistryInitializer />
          <DynamicBranding />
          <WebVitalsMonitor />
          <GlobalUserMenuWrapper />
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
          <ContextMenuRenderer />
        </ThemeProvider>
      </body>
    </html>
  );
}
