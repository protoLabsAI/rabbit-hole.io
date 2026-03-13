import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { extractTenantIdentifiers } from "@proto/utils/tenancy-edge";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/v1/(.*)", // All versioned tenant routes require auth
  "/research(.*)", // Research workspace requires authentication
  "/dashboard(.*)", // Dashboard requires authentication
  // Add other protected routes here as needed
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Apply Clerk auth protection to specified routes
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  // Extract tenant identifiers from URL (no database calls - edge compatible)
  const { orgId } = await auth();
  const tenantIds = extractTenantIdentifiers(request);

  // Get the response from Clerk middleware
  const response = NextResponse.next();

  // Add tenant identifier headers for API routes to validate
  if (orgId) {
    response.headers.set("x-clerk-org-id", orgId);
  }

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

  // Admin route protection (additional VPN check for production)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // In production, this would check for VPN IP ranges
    if (process.env.NODE_ENV === "production") {
      // const clientIP = request.ip || request.headers.get("x-forwarded-for");
      // Add VPN IP validation here for production deployment
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
