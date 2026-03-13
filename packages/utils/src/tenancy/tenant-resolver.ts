/**
 * Tenant Resolution for Middleware (Edge-Compatible)
 *
 * Extracts tenant identifiers from URLs without database calls.
 * Middleware runs in Edge runtime (no Node.js modules allowed).
 * Actual tenant validation happens in API routes.
 */

import { NextRequest } from "next/server";

export interface TenantIdentifiers {
  hash?: string; // From path: /v1/{hash}/...
  slug?: string; // From subdomain: {slug}.domain
  customDomain?: string; // From hostname (Enterprise)
  strategy: "custom_domain" | "subdomain" | "path" | "none";
}

/**
 * Primary domain for the application
 */
const PRIMARY_DOMAIN = "rabbit-hole.io";

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  // Production: slug.rabbit-hole.io
  if (host.endsWith(`.${PRIMARY_DOMAIN}`)) {
    const subdomain = host.substring(
      0,
      host.length - PRIMARY_DOMAIN.length - 1
    );
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return subdomain;
    }
  }

  // Local dev: slug.localhost
  if (host.includes(".localhost")) {
    const subdomain = host.split(".localhost")[0];
    if (subdomain && subdomain !== "www") {
      return subdomain;
    }
  }

  return null;
}

/**
 * Extract tenant hash from path: /v1/{hash}/...
 */
function extractTenantHashFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/v\d+\/([a-f0-9]{12})\//);
  return match ? match[1] : null;
}

/**
 * Check if hostname is a custom domain (not primary domain)
 */
function checkCustomDomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  if (
    host === PRIMARY_DOMAIN ||
    host === `www.${PRIMARY_DOMAIN}` ||
    host.endsWith(`.${PRIMARY_DOMAIN}`) ||
    host.includes("localhost")
  ) {
    return null;
  }

  return host;
}

/**
 * Extract tenant identifiers from request (no database calls)
 * Use in middleware to add headers for API routes to validate
 */
export function extractTenantIdentifiers(
  request: NextRequest
): TenantIdentifiers {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Strategy 1: Custom Domain (Enterprise)
  const customDomain = checkCustomDomain(hostname);
  if (customDomain) {
    return {
      customDomain,
      strategy: "custom_domain",
    };
  }

  // Strategy 2: Subdomain (Pro+)
  const subdomain = extractSubdomain(hostname);
  if (subdomain) {
    return {
      slug: subdomain,
      strategy: "subdomain",
    };
  }

  // Strategy 3: Path-based hash (Free)
  const hash = extractTenantHashFromPath(pathname);
  if (hash) {
    return {
      hash,
      strategy: "path",
    };
  }

  // No tenant identifier found
  return {
    strategy: "none",
  };
}
