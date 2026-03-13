/**
 * Server-only SVG Sanitization
 *
 * This module is for Node.js/SSR environments only.
 * Configures jsdom to prevent resource loading errors.
 */

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Create JSDOM instance with minimal configuration to prevent resource loading
const window = new JSDOM("<!DOCTYPE html>", {
  url: "http://localhost",
  // Disable resource loading to prevent ENOENT errors
  resources: "usable",
  // Disable scripts
  runScripts: undefined,
  // Prevent external resource fetching
  beforeParse(window: any) {
    // Override fetch to prevent resource loading
    window.fetch = () => Promise.reject(new Error("Resource loading disabled"));
  },
}).window;

// Create DOMPurify instance with configured window
const DOMPurify = createDOMPurify(window as any);

/**
 * Sanitize SVG string to remove XSS vectors (Server-side version)
 *
 * @param svg - SVG string (potentially untrusted)
 * @returns Sanitized SVG safe for rendering
 */
export function sanitizeSvg(svg: string): string {
  const sanitized = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    ADD_ATTR: ["href", "xlink:href"],
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
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
    ],
  });

  return sanitized;
}

/**
 * Validate that a string is well-formed SVG
 */
export function isValidSvg(svg: string): boolean {
  if (!svg || typeof svg !== "string") return false;
  const trimmed = svg.trim();
  return trimmed.startsWith("<svg") && trimmed.includes("</svg>");
}
