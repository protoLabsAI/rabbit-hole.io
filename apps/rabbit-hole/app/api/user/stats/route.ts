import { NextRequest, NextResponse } from "next/server";

interface UserStats {
  entitiesViewed?: number;
  lastVisited?: string | null;
  queriesRun?: number;
  graphsCreated?: number;
}

/**
 * PATCH /api/user/stats
 *
 * Update user statistics in Clerk privateMetadata
 * Server-side only - privateMetadata cannot be modified from client
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = "local-user";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates: Partial<UserStats> = await request.json();

    // Validate updates
    if (typeof updates !== "object" || updates === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Get current user to read existing stats
    // clerkClient removed - using local user
    // getUser removed - using local user
    const currentStats = (user.privateMetadata?.stats as UserStats) || {};

    // Merge updates with existing stats
    const newStats: UserStats = {
      ...currentStats,
      ...updates,
    };

    // Update user metadata
    // updateUserMetadata removed

    return NextResponse.json({
      success: true,
      stats: newStats,
    });
  } catch (error) {
    console.error("Error updating user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/stats
 *
 * Retrieve user statistics from Clerk privateMetadata
 */
export async function GET() {
  try {
    const userId = "local-user";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // clerkClient removed - using local user
    // getUser removed - using local user
    const stats = (user.privateMetadata?.stats as UserStats) || {
      entitiesViewed: 0,
      lastVisited: null,
      queriesRun: 0,
      graphsCreated: 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
