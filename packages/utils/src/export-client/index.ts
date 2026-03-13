/**
 * Client-Only Export Utilities
 *
 * These utilities use browser APIs (document, html2canvas) and will throw
 * a build error if imported during SSR.
 *
 * For SVG sanitization:
 * - Client-side: import from "@proto/utils/security-client"
 * - Server-side: import from "@proto/utils/security-server"
 */

export * from "../export";
