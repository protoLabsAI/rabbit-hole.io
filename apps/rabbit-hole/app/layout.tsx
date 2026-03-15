import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@proto/ui/atoms";
import { getValidatedThemeName, getTheme } from "@proto/ui/theme";

import { DebugUtilsInitializer } from "./components/DebugUtilsInitializer";
import { DomainRegistryInitializer } from "./components/DomainRegistryInitializer";
import { DynamicBranding } from "./components/DynamicBranding";
import { GlobalUserMenuWrapper } from "./components/layout/GlobalUserMenuWrapper";
import { WebVitalsMonitor } from "./components/WebVitalsMonitor";
import { ThemeProvider } from "./context/ThemeProvider";
import { ContextMenuRenderer } from "./context-menu";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Generate metadata dynamically based on theme
export function generateMetadata(): Metadata {
  const themeName = getValidatedThemeName(
    process.env.NEXT_PUBLIC_DEFAULT_THEME,
    "prod-environment"
  );
  const theme = getTheme(themeName);

  // All themes must have branding, but TypeScript doesn't know that
  if (!theme.branding) {
    throw new Error(`Theme ${themeName} missing branding configuration`);
  }

  return {
    title: theme.branding.name,
    description: theme.branding.tagline || "Knowledge graph platform",
    icons: {
      icon: theme.branding.favicon,
      apple: "/icon-192.svg",
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: theme.branding.name,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
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
    "prod-environment"
  );

  return (
    <html lang="en" suppressHydrationWarning>
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
