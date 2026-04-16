"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import {
  getTheme,
  getThemeNames,
  isValidThemeName,
  type AvailableThemeName,
  ThemeGenerator,
  type ThemeConfig,
  startThemeTransition,
} from "@protolabsai/ui/theme";

interface ThemeContextType {
  currentTheme: ThemeConfig;
  themeName: AvailableThemeName;
  colorScheme: "light" | "dark" | "system";
  branding: ThemeConfig["branding"];
  setTheme: (themeName: AvailableThemeName) => void;
  setColorScheme: (scheme: "light" | "dark" | "system") => void;
  toggleColorScheme: () => void;
  availableThemeNames: AvailableThemeName[];
  applyTheme: (theme: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultThemeName?: AvailableThemeName;
}

export function ThemeProvider({
  children,
  defaultThemeName = "default",
}: ThemeProviderProps) {
  // Initialize with default theme
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(
    getTheme(defaultThemeName)
  );
  const [themeName, setThemeName] =
    useState<AvailableThemeName>(defaultThemeName);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | "system">(
    "system"
  );

  useEffect(() => {
    // Load theme from env var (via defaultThemeName prop)
    const theme = getTheme(defaultThemeName);

    setThemeName(defaultThemeName);
    setColorScheme("system");
    setCurrentTheme(theme);
    applyThemeToDOM(theme, "system");

    // Apply domain overrides if present (async import for client-side)
    if (theme.domainOverrides) {
      import("@protolabsai/types")
        .then(({ applyThemeToDomains, domainRegistry }) => {
          applyThemeToDomains(theme, domainRegistry);
        })
        .catch((err) => console.warn("Failed to apply domain overrides:", err));
    }
  }, [defaultThemeName]);

  const applyThemeToDOM = (
    theme: ThemeConfig,
    scheme: "light" | "dark" | "system"
  ) => {
    const root = document.documentElement;

    // Apply theme name
    root.setAttribute("data-theme", theme.name);

    // Handle color scheme
    let effectiveScheme: "light" | "dark";
    if (scheme === "system") {
      effectiveScheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
    } else {
      effectiveScheme = scheme;
    }

    root.setAttribute("data-color-scheme", effectiveScheme);

    // Add/remove dark class for Tailwind dark mode
    if (effectiveScheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Generate and inject CSS variables
    const css = ThemeGenerator.generateCSSVariables(theme);

    // Remove existing theme style tag
    const existingStyle = document.getElementById("dynamic-theme");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new theme style tag
    const style = document.createElement("style");
    style.id = "dynamic-theme";
    style.textContent = css;
    document.head.appendChild(style);
  };

  const setTheme = async (newThemeName: AvailableThemeName) => {
    if (!isValidThemeName(newThemeName)) {
      console.warn(`Theme "${newThemeName}" not found in registry`);
      return;
    }

    const theme = getTheme(newThemeName);

    // Use View Transitions API for smooth theme change
    await startThemeTransition(
      () => {
        setThemeName(newThemeName);
        setCurrentTheme(theme);
        applyThemeToDOM(theme, colorScheme);
      },
      { variant: "polygon", duration: 500 }
    );

    // Apply domain overrides if present (async import)
    if (theme.domainOverrides) {
      import("@protolabsai/types")
        .then(({ applyThemeToDomains, domainRegistry }) => {
          applyThemeToDomains(theme, domainRegistry);
        })
        .catch((err) => console.warn("Failed to apply domain overrides:", err));
    }
  };

  const setColorSchemeHandler = async (scheme: "light" | "dark" | "system") => {
    // Use View Transitions API for smooth color scheme change
    await startThemeTransition(
      () => {
        setColorScheme(scheme);
        applyThemeToDOM(currentTheme, scheme);
      },
      { variant: "polygon", duration: 500 }
    );
  };

  const toggleColorScheme = () => {
    // Cycle through: system → light → dark → system
    const newScheme =
      colorScheme === "system"
        ? "light"
        : colorScheme === "light"
          ? "dark"
          : "system";
    setColorSchemeHandler(newScheme);
  };

  const applyTheme = (theme: ThemeConfig) => {
    setCurrentTheme(theme);
    applyThemeToDOM(theme, colorScheme);
  };

  const value: ThemeContextType = {
    currentTheme,
    themeName,
    colorScheme,
    branding: currentTheme.branding,
    setTheme,
    setColorScheme: setColorSchemeHandler,
    toggleColorScheme,
    availableThemeNames: getThemeNames(),
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook for listening to system color scheme changes
 */
export function useSystemColorScheme() {
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemScheme(e.matches ? "dark" : "light");
    };

    // Set initial value
    setSystemScheme(mediaQuery.matches ? "dark" : "light");

    // Listen for changes
    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return systemScheme;
}
