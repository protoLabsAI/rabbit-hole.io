/**
 * SVG to Image Export Utilities (CLIENT-ONLY)
 *
 * Converts SVG strings to raster image formats (JPEG, PNG) for download.
 * Uses html2canvas for high-quality rendering.
 *
 * WARNING: This module is client-only (uses document, html2canvas) and will
 * throw a build error if imported during SSR.
 */

import "client-only";
import html2canvas from "html2canvas";

import { sanitizeSvg } from "../security/sanitize-svg";

export interface SvgToImageOptions {
  /** Output filename (without extension) */
  filename: string;
  /** Image format - defaults to 'jpeg' */
  format?: "jpeg" | "png";
  /** JPEG quality (0-1) - only applies to JPEG format */
  quality?: number;
  /** Output width in pixels - defaults to 2000 */
  width?: number;
  /** Output height in pixels - defaults to 2000 */
  height?: number;
  /** Background color - defaults to 'white' for JPEG, 'transparent' for PNG */
  backgroundColor?: string;
}

/**
 * Download SVG as a raster image (JPEG or PNG)
 *
 * Creates a temporary container, renders the SVG, converts to canvas,
 * then downloads as the specified image format.
 *
 * @example
 * ```typescript
 * await downloadSvgAsImage(svgString, {
 *   filename: 'my-illustration',
 *   format: 'jpeg',
 *   quality: 0.95,
 *   width: 2000,
 *   height: 2000,
 * });
 * ```
 */
export async function downloadSvgAsImage(
  svgString: string,
  options: SvgToImageOptions
): Promise<void> {
  const {
    filename,
    format = "jpeg",
    quality = 0.95,
    width = 2000,
    height = 2000,
    backgroundColor = format === "jpeg" ? "white" : "transparent",
  } = options;

  // Sanitize SVG using shared utility for consistent security policy
  const sanitizedSvg = sanitizeSvg(svgString);

  // Create temporary container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.backgroundColor = backgroundColor;
  container.innerHTML = sanitizedSvg;

  document.body.appendChild(container);

  try {
    // Render to canvas using html2canvas
    const canvas = await html2canvas(container, {
      width,
      height,
      backgroundColor:
        backgroundColor === "transparent" ? null : backgroundColor,
      scale: 1,
      logging: false,
      useCORS: true,
      // allowTaint removed - not needed for app-generated SVG, safer without it
    });

    // Convert to blob and download - wrap in Promise for proper async handling
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        format === "jpeg" ? "image/jpeg" : "image/png",
        quality
      );
    });

    if (!blob) {
      throw new Error("Failed to create image blob");
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${format === "jpeg" ? "jpg" : "png"}`;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } finally {
    // Remove temporary container
    document.body.removeChild(container);
  }
}

/**
 * Download SVG as JPEG (convenience wrapper)
 */
export async function downloadSvgAsJpeg(
  svgString: string,
  filename: string,
  options?: Partial<Omit<SvgToImageOptions, "filename" | "format">>
): Promise<void> {
  return downloadSvgAsImage(svgString, {
    filename,
    format: "jpeg",
    ...options,
  });
}

/**
 * Download SVG as PNG (convenience wrapper)
 */
export async function downloadSvgAsPng(
  svgString: string,
  filename: string,
  options?: Partial<Omit<SvgToImageOptions, "filename" | "format">>
): Promise<void> {
  return downloadSvgAsImage(svgString, {
    filename,
    format: "png",
    ...options,
  });
}
