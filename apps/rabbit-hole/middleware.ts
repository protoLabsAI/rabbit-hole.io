import { NextRequest, NextResponse } from "next/server";

import { extractTenantIdentifiers } from "@protolabsai/utils/tenancy-edge";

const RESEARCH_ENABLED = process.env.ENABLE_RESEARCH === "true";

export default function middleware(request: NextRequest) {
  // Block the standalone Research workspace in production.
  // /api/research/deep is kept — it powers the search page's deep research mode.
  if (!RESEARCH_ENABLED) {
    const { pathname } = request.nextUrl;
    const isResearchPage =
      pathname === "/research" || pathname.startsWith("/research/");
    const isResearchApi =
      pathname.startsWith("/api/research/") &&
      !pathname.startsWith("/api/research/deep");

    if (isResearchPage || isResearchApi) {
      return new NextResponse(null, { status: 404 });
    }
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
