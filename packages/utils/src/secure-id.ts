/**
 * Secure ID Generation
 *
 * Cross-environment UUID v4 generation with fallback.
 * Use this instead of crypto.randomUUID() directly.
 */

/**
 * Generates a cryptographically secure random UUID v4
 * Works in Node.js and browser environments
 *
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateSecureId(): string {
  // Browser environment - use Web Crypto API
  if (typeof window !== "undefined") {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback for older browsers
    return fallbackUUID();
  }

  // Node.js environment - dynamic require to avoid Vite externalization
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");

    // Check if randomUUID is available (Node.js 15.6.0+)
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for Node.js <15.6.0: use crypto.randomBytes
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    // Last resort: Math.random() (not cryptographically secure)
    // This should only happen in very old browsers without Web Crypto API
    console.warn(
      "Crypto API unavailable in both browser and Node.js, using Math.random() fallback"
    );
    return fallbackUUID();
  }
}

/**
 * Fallback UUID v4 generator for environments without crypto.randomUUID()
 * Uses crypto.getRandomValues() which has wider support
 */
function fallbackUUID(): string {
  // Generate 16 random bytes
  const bytes = new Uint8Array(16);

  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Last resort: Math.random() (not cryptographically secure)
    console.warn("Crypto API unavailable, using Math.random() fallback");
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to UUID string format
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
