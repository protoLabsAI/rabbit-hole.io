import { ClerkProvider } from "@clerk/nextjs";

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
    "dev-environment"
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
    "dev-environment"
  );

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      dynamic
      appearance={{
        variables: {
          colorPrimary: "hsl(var(--primary-500))",
          colorDanger: "hsl(var(--destructive))",
          colorSuccess: "hsl(var(--success-500))",
          colorWarning: "hsl(var(--warning-500))",
          colorNeutral: "hsl(var(--muted))",
          colorBackground: "hsl(var(--card))",
          colorInputBackground: "hsl(var(--background))",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",
          borderRadius: "0.5rem",
        },
        elements: {
          rootBox: "!bg-background",
          cardBox: "!bg-card/95 !border !border-border",
          card: "!bg-card !border !border-border",
          scrollBox: "!bg-card",
          pageScrollBox: "!bg-card",
          navbar: "!bg-muted/30 !border-b !border-border",
          navbarButton:
            "!text-foreground hover:!bg-muted data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground",
          profileSection: "!bg-card",
          profileSectionPrimaryButton:
            "!bg-primary !text-primary-foreground hover:!bg-primary/90",
          formButtonPrimary:
            "!bg-primary !text-primary-foreground hover:!bg-primary/90",
          formFieldInput: "!bg-background !border-border !text-foreground",
          header: "!bg-card",
          headerTitle: "!text-foreground",
          headerSubtitle: "!text-muted-foreground",
          footer: "!bg-card !border-t !border-border",
          modalContent: "!bg-card",
          modalCloseButton: "!text-foreground hover:!bg-muted",
        },
      }}
    >
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
    </ClerkProvider>
  );
}
