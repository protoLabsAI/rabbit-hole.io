import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = "local-user";
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await request.json();
    const { activityType = "edit" } = body;

    const pool = getGlobalPostgresPool();

    // Insert activity (triggers auto-update of last_activity_at)
    await pool.query(
      `INSERT INTO session_activity (session_id, user_id, activity_type, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, activityType, Date.now()]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track activity" },
      { status: 500 }
    );
  }
}
