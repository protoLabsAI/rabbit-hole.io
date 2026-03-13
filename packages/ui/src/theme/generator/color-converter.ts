/**
 * Color Conversion Utilities
 *
 * Converts colors between hex, RGB, and HSL formats for Tailwind CSS variables
 */

/**
 * Convert hex color to RGB format for Tailwind opacity modifiers
 */
export function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r} ${g} ${b}`;
}

/**
 * Convert hex color to HSL format for Tailwind
 */
export function hexToHsl(hex: string): string {
  // Handle rgba() format with alpha channel
  if (hex.startsWith("rgba(")) {
    const match = hex.match(
      /rgba?\((\d+),?\s*(\d+),?\s*(\d+)(?:,?\s*([\d.]+))?\)/
    );
    if (match) {
      const r = parseInt(match[1]) / 255;
      const g = parseInt(match[2]) / 255;
      const b = parseInt(match[3]) / 255;
      const alpha = match[4] ? parseFloat(match[4]) : 1;
      const hsl = rgbToHsl(r, g, b);

      // Include alpha if not 1
      if (alpha < 1) {
        return `${hsl} / ${alpha}`;
      }
      return hsl;
    }
  }

  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return rgbToHsl(r, g, b);
}

/**
 * Convert RGB (0-1 range) to HSL format
 */
export function rgbToHsl(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}
