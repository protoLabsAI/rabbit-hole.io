/**
 * Client-Only Security Utilities
 *
 * These utilities are marked with 'client-only' and will throw a build error
 * if imported during SSR or in Server Components.
 *
 * For server-side sanitization, use @proto/utils/security-server instead.
 */

export { sanitizeSvg, isValidSvg } from "../security/sanitize-svg";
