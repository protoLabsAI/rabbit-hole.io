import { NextRequest, NextResponse } from "next/server";

import { getHocuspocusPostgresPool } from "@/lib/hocuspocus-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = { userId: "local-user" };
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const pool = getHocuspocusPostgresPool();

    const result = await pool.query(
      "SELECT metadata FROM collaboration_sessions_metadata WHERE session_id = $1",
      [sessionId]
    );

    if (result.rows[0]) {
      return NextResponse.json({
        metadata: result.rows[0].metadata,
      });
    }

    return NextResponse.json({ metadata: null });
  } catch (error) {
    console.error("Get metadata error:", error);
    return NextResponse.json(
      { error: "Failed to get metadata" },
      { status: 500 }
    );
  }
}
