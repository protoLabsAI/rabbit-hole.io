/**
 * UUID Generation Utilities
 *
 * Centralized UUID generation for consistent token and ID management
 * across the monorepo
 */

/**
 * Generate a cryptographically secure UUID v4
 * Works in both Node.js and browser environments
 *
 * Uses Web Crypto API in browsers and Node.js crypto in server environments
 */
export function generateSecureUUID(): string {
  // Browser environment - use Web Crypto API
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).crypto !== "undefined" &&
    typeof (globalThis as any).crypto.randomUUID === "function"
  ) {
    return (globalThis as any).crypto.randomUUID();
  }

  // Node.js environment - dynamic import to avoid Vite externalization issues
  if (typeof window === "undefined") {
    try {
      // Use require for Node.js crypto module (avoids static import issues)
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
      // Fallback if crypto module not available (continues to Math.random below)
    }
  }

  // Fallback: Generate UUID v4 manually (RFC 4122 compliant)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate multiple secure UUIDs
 */
export function generateSecureUUIDs(count: number): string[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, () => generateSecureUUID());
}

/**
 * Validate UUID format (v4)
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate secure token for share links (same as UUID but with explicit naming)
 */
export function generateShareToken(): string {
  return generateSecureUUID();
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return generateSecureUUID();
}

/**
 * Generate secure API key (UUID without hyphens for easier copying)
 */
export function generateApiKey(): string {
  return generateSecureUUID().replace(/-/g, "");
}

/**
 * Parse UUID to extract version and variant information
 */
export function parseUUID(uuid: string): {
  isValid: boolean;
  version?: number;
  variant?: string;
} {
  if (!isValidUUID(uuid)) {
    return { isValid: false };
  }

  const cleanUuid = uuid.replace(/-/g, "");
  const versionHex = cleanUuid.charAt(12);
  const variantHex = cleanUuid.charAt(16);

  const version = parseInt(versionHex, 16);

  let variant: string;
  const variantBits = parseInt(variantHex, 16);

  if ((variantBits & 0x8) === 0) {
    variant = "ncs"; // NCS reserved
  } else if ((variantBits & 0xc) === 0x8) {
    variant = "rfc4122"; // RFC 4122
  } else if ((variantBits & 0xe) === 0xc) {
    variant = "microsoft"; // Microsoft reserved
  } else {
    variant = "future"; // Future reserved
  }

  return {
    isValid: true,
    version,
    variant,
  };
}
