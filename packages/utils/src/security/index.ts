/**
 * Security utilities
 *
 * REMOVED: sanitizeSvg and isValidSvg are now client-only
 *
 * For client-side sanitization: import from "@proto/utils/security-client"
 * For server-side sanitization: import from "@proto/utils/security-server"
 *
 * This prevents accidental SSR imports that cause jsdom errors.
 */
