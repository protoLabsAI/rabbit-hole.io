/**
 * User Organizations API
 *
 * Returns list of organizations the current user belongs to.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organizations from Clerk
    const client = await clerkClient();
    const organizationMemberships =
      await client.users.getOrganizationMembershipList({
        userId,
      });

    const organizations = organizationMemberships.data.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    }));

    return NextResponse.json({
      organizations,
      count: organizations.length,
    });
  } catch (error) {
    console.error("Failed to fetch user organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
