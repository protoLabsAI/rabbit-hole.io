"use client";

import React from "react";

import { themeDisplayInfo, type AvailableThemeName } from "@proto/ui/theme";

import { useTheme } from "../../context/ThemeProvider";
import { cn } from "../../lib/utils";

interface ThemeSelectorProps {
  className?: string;
  showColorSchemeToggle?: boolean;
}

export function ThemeSelector({
  className = "",
  showColorSchemeToggle = true,
}: ThemeSelectorProps) {
  const {
    themeName,
    colorScheme,
    setTheme,
    setColorScheme,
    toggleColorScheme,
    availableThemeNames,
  } = useTheme();

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-card border rounded-lg",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-card-foreground">
        Theme Settings
      </h3>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-2">
          Theme
        </label>
        <select
          value={themeName}
          onChange={(e) => setTheme(e.target.value as AvailableThemeName)}
          className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          {availableThemeNames.map((themeKey) => (
            <option key={themeKey} value={themeKey}>
              {themeDisplayInfo[themeKey].name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {themeDisplayInfo[themeName].description}
        </p>
      </div>

      {/* Color Scheme Selection */}
      {showColorSchemeToggle && (
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Color Scheme
          </label>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((scheme) => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md border transition-colors",
                  colorScheme === scheme
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Toggle Button */}
      <button
        onClick={toggleColorScheme}
        className="w-full py-2 px-4 bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-muted transition-colors"
      >
        Toggle Dark/Light Mode
      </button>
    </div>
  );
}

/**
 * Compact theme selector for navigation bars
 */
interface CompactThemeSelectorProps {
  className?: string;
}

export function CompactThemeSelector({
  className = "",
}: CompactThemeSelectorProps) {
  const { toggleColorScheme, colorScheme } = useTheme();

  return (
    <button
      onClick={toggleColorScheme}
      className={cn(
        "p-2 rounded-md transition-colors hover:bg-muted",
        "text-foreground hover:text-foreground",
        className
      )}
      title={`Switch to ${colorScheme === "light" ? "dark" : "light"} mode`}
    >
      {colorScheme === "light" ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="5"></circle>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
      )}
    </button>
  );
}
