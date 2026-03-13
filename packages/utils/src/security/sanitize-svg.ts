/**
 * SVG Sanitization Utilities (CLIENT-ONLY)
 *
 * Sanitizes SVG content to prevent XSS attacks via event handlers,
 * script tags, or malicious URLs.
 *
 * Uses isomorphic-dompurify for Node.js and browser compatibility.
 *
 * WARNING: This module is client-only and will throw a build error if
 * imported during SSR. For server-side sanitization, use @proto/utils/security-server
 */

import "client-only";
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize SVG string to remove XSS vectors
 *
 * Removes:
 * - <script> tags
 * - Event handlers (onclick, onload, onerror, etc.)
 * - javascript: URLs in href/xlink:href
 * - data: URLs that could execute scripts
 *
 * @param svg - SVG string (potentially untrusted, e.g., from LLM)
 * @returns Sanitized SVG safe for rendering
 *
 * @example
 * ```typescript
 * const userSvg = getLLMGeneratedSvg();
 * const safeSvg = sanitizeSvg(userSvg);
 * // Now safe to use in dangerouslySetInnerHTML
 * ```
 */
export function sanitizeSvg(svg: string): string {
  // Configure DOMPurify for SVG-specific sanitization
  const sanitized = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"], // Allow SVG <use> element
    ADD_ATTR: ["href", "xlink:href"], // Allow links (will be sanitized)
    FORBID_TAGS: ["script", "iframe", "object", "embed"], // Block executable tags
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onmouseout",
      "onmousemove",
      "onmouseenter",
      "onmouseleave",
      "onfocus",
      "onblur",
      "onchange",
      "oninput",
    ], // Block event handlers
  });

  return sanitized;
}

/**
 * Validate that a string is well-formed SVG
 *
 * Basic validation - checks for SVG tag presence.
 * Does NOT guarantee security - use sanitizeSvg() for that.
 */
export function isValidSvg(svg: string): boolean {
  if (!svg || typeof svg !== "string") return false;

  const trimmed = svg.trim();
  return trimmed.startsWith("<svg") && trimmed.includes("</svg>");
}
