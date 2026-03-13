import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getGlobalPostgresPool } from "@proto/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const pool = getGlobalPostgresPool();

    // Query database directly instead of internal fetch (avoids SSL loop)
    const sessionResult = await pool.query(
      `SELECT room_id FROM collaboration_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const roomId = sessionResult.rows[0].room_id;

    // Check if Y.Doc exists and has data
    const result = await pool.query(
      "SELECT length(document) as size FROM yjs_documents WHERE room_id = $1",
      [roomId]
    );

    const hasData = result.rows[0] && result.rows[0].size > 0;

    return NextResponse.json({
      ready: hasData,
      roomId: roomId,
      documentSize: result.rows[0]?.size || 0,
    });
  } catch (error) {
    console.error("Verify data error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
