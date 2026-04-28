import { NextRequest, NextResponse } from "next/server";

import { extractTenantIdentifiers } from "@protolabsai/utils/tenancy-edge";

// Routes hidden from production builds while the new research / atlas
// experience is being rebuilt. Set NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS=true
// to expose them on a preview / staging deployment.
const DEV_ONLY_PATH_PREFIXES = [
  "/research",
  "/atlas",
  "/api/research",
  "/api/atlas",
  "/api/atlas-crud",
  "/api/atlas-details",
];

function isDevOnlyPath(pathname: string): boolean {
  return DEV_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function middleware(request: NextRequest) {
  // Hide research + atlas surfaces from prod until they're rebuilt.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS !== "true" &&
    isDevOnlyPath(request.nextUrl.pathname)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Extract tenant identifiers from URL (no database calls - edge compatible)
  const tenantIds = extractTenantIdentifiers(request);

  // Get the response
  const response = NextResponse.next();

  if (tenantIds.hash) {
    response.headers.set("x-tenant-hash", tenantIds.hash);
  }

  if (tenantIds.slug) {
    response.headers.set("x-tenant-slug", tenantIds.slug);
  }

  if (tenantIds.customDomain) {
    response.headers.set("x-custom-domain", tenantIds.customDomain);
  }

  response.headers.set("x-tenant-strategy", tenantIds.strategy);

  // Add HSTS header for HTTPS enforcement in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Rate limiting headers (informational)
  response.headers.set("X-RateLimit-Limit", "1000");
  response.headers.set("X-RateLimit-Window", "3600");

  // Privacy headers
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  // Development vs Production headers
  if (process.env.NODE_ENV === "development") {
    response.headers.set("X-Development-Mode", "true");
  } else {
    response.headers.set("X-Development-Mode", "false");
    // Remove server identification in production
    response.headers.delete("Server");
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
