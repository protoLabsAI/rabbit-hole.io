/**
 * Color Scale Types
 *
 * Defines 11-step color scales (50-950) used throughout the theme system
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemeColors {
  // Primary brand colors
  primary: ColorScale;
  secondary?: ColorScale;
  accent?: ColorScale;

  // Semantic colors
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;

  // Neutral colors
  gray: ColorScale;

  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
  };

  // Text colors
  foreground: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  // Border and overlay
  border: {
    primary: string;
    secondary: string;
    muted: string;
  };

  overlay: {
    light: string;
    medium: string;
    dark: string;
  };
}
