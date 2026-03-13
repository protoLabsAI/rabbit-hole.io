/**
 * Theme Branding Configuration
 *
 * Defines whitelabel branding properties (logo, name, favicon, etc.)
 */

export interface ThemeBranding {
  /** Application name */
  name: string;

  /** Short tagline or description */
  tagline?: string;

  /** Logo icon (emoji or SVG string) */
  logo: string;

  /** Favicon (emoji, SVG data URI, or path to icon file) */
  favicon: string;

  /** Optional: Custom logo image path */
  logoImage?: string;

  /** Optional: Link for logo click */
  homeUrl?: string;
}
