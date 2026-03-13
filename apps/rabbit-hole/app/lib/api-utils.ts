/**
 * API utilities for path-based routing
 * Handles base path prefixing for API calls
 */

/**
 * Get full API URL with base path
 * Useful for absolute URL construction
 */
export function getApiUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${cleanPath}`;
}

/**
 * Get full app URL with base path
 */
export function getAppUrl(path: string = ""): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // If baseUrl already includes basePath, don't duplicate it
  if (basePath && baseUrl.endsWith(basePath)) {
    return `${baseUrl}${cleanPath}`;
  }

  return `${baseUrl}${basePath}${cleanPath}`;
}

/**
 * Fetch wrapper that automatically handles base path
 * Use this instead of raw fetch() for API calls
 *
 * @example
 * const data = await apiFetch('/api/entities');
 * // Calls: /app/api/entities (if basePath is /app)
 */
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  // For relative paths, use getApiUrl to add base path
  // For absolute URLs, use as-is
  const url = path.startsWith("http") ? path : getApiUrl(path);
  return fetch(url, options);
}
