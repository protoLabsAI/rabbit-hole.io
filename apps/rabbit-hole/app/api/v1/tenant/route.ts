/**
 * Tenant Management API
 *
 * GET /api/v1/tenant - Get current organization's tenant info
 * POST /api/v1/tenant - Create tenant for current organization (auto-init)
 * PATCH /api/v1/tenant - Update tenant settings (slug, etc.)
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getTenantByOrgId,
  createTenant,
  updateTenantSlug,
  validateTenantSlug,
  type TenantContext,
} from "@proto/utils/tenancy-server";

interface TenantResponse {
  success: boolean;
  data?: TenantContext & {
    urls: {
      primary: string; // Hash-based URL
      subdomain: string | null; // Pro+ subdomain URL
    };
  };
  error?: string;
}

/**
 * GET - Get tenant info for current organization
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TenantResponse>> {
  try {
<<<<<<< HEAD
    const userId = "local-user"; const orgId = "local-org";
=======
    const { userId, orgId } = {
      userId: "local-user",
      orgId: null as string | null,
    };
>>>>>>> origin/main

    if (!orgId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const tenant = await getTenantByOrgId(orgId);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tenant not found. Create one by making a POST request to this endpoint.",
        },
        { status: 404 }
      );
    }

    // Get base URL from request
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = request.headers.get("host") || "rabbit-hole.io";
    const baseDomain = host.includes("localhost")
      ? "localhost:3000"
      : "rabbit-hole.io";

    return NextResponse.json({
      success: true,
      data: {
        ...tenant,
        urls: {
          primary: `${protocol}://${baseDomain}/v1/${tenant.tenantHash}`,
          subdomain: tenant.tenantSlug
            ? `${protocol}://${tenant.tenantSlug}.${baseDomain}`
            : null,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching tenant:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenant",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or initialize tenant for current organization
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TenantResponse>> {
  try {
<<<<<<< HEAD
    const userId = "local-user"; const orgId = "local-org";
=======
    const { userId, orgId } = {
      userId: "local-user",
      orgId: null as string | null,
    };
>>>>>>> origin/main

    if (!orgId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Check if tenant already exists
    const existing = await getTenantByOrgId(orgId);
    if (existing) {
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const host = request.headers.get("host") || "rabbit-hole.io";
      const baseDomain = host.includes("localhost")
        ? "localhost:3000"
        : "rabbit-hole.io";

      return NextResponse.json({
        success: true,
        data: {
          ...existing,
          urls: {
            primary: `${protocol}://${baseDomain}/v1/${existing.tenantHash}`,
            subdomain: existing.tenantSlug
              ? `${protocol}://${existing.tenantSlug}.${baseDomain}`
              : null,
          },
        },
      });
    }

    // Get organization details from Clerk
<<<<<<< HEAD
    // clerkClient removed - using local user
    const org = await client.organizations.getOrganization({
      organizationId: orgId,
    });
=======
    const org = { name: "Local Organization", slug: "local-org" };
>>>>>>> origin/main

    // Create tenant
    const tenant = await createTenant({
      clerkOrgId: orgId,
      orgName: org.name,
      orgSlug: org.slug || undefined,
    });

    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = request.headers.get("host") || "rabbit-hole.io";
    const baseDomain = host.includes("localhost")
      ? "localhost:3000"
      : "rabbit-hole.io";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...tenant,
          urls: {
            primary: `${protocol}://${baseDomain}/v1/${tenant.tenantHash}`,
            subdomain: null, // Free tier doesn't get subdomain
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating tenant:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create tenant",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update tenant settings (subdomain slug for Pro+)
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<TenantResponse>> {
  try {
<<<<<<< HEAD
    const userId = "local-user"; const orgId = "local-org"; const has = () => true;
=======
    const { userId, orgId, has } = {
      userId: "local-user",
      orgId: null as string | null,
      has: (_: any) => false,
    };
>>>>>>> origin/main

    if (!orgId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug is required",
        },
        { status: 400 }
      );
    }

    // Check if user has Pro+ plan for custom subdomain
    const isPro = has && (has({ plan: "pro" }) || has({ plan: "enterprise" }));
    if (!isPro) {
      return NextResponse.json(
        {
          success: false,
          error: "Upgrade to Pro or Enterprise to claim a custom subdomain",
        },
        { status: 402 } // Payment Required
      );
    }

    // Validate slug
    const validation = validateTenantSlug(slug);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Update tenant slug
    const tenant = await updateTenantSlug(orgId, slug);

    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = request.headers.get("host") || "rabbit-hole.io";
    const baseDomain = host.includes("localhost")
      ? "localhost:3000"
      : "rabbit-hole.io";

    return NextResponse.json({
      success: true,
      data: {
        ...tenant,
        urls: {
          primary: `${protocol}://${baseDomain}/v1/${tenant.tenantHash}`,
          subdomain: tenant.tenantSlug
            ? `${protocol}://${tenant.tenantSlug}.${baseDomain}`
            : null,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error updating tenant:", error);

    // Handle unique constraint violation (slug already taken)
    if (
      error instanceof Error &&
      error.message.includes("duplicate key value")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This subdomain is already taken",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tenant",
      },
      { status: 500 }
    );
  }
}
