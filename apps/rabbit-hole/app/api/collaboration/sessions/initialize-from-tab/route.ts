import { NextRequest, NextResponse } from "next/server";

import { logger } from "@proto/logger";

import { getHocuspocusPostgresPool } from "@/lib/hocuspocus-db";

export async function POST(request: NextRequest) {
  try {
<<<<<<< HEAD
    const userId = "local-user";
=======
    const { userId } = { userId: "local-user" };
>>>>>>> origin/main
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, workspaceId, tabId, canvasData, canvasType } = body;

    if (!sessionId || !canvasData) {
      return NextResponse.json(
        { error: "sessionId and canvasData required" },
        { status: 400 }
      );
    }

    // Get session to find room ID
    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/collaboration/sessions/${sessionId}`,
      {
        headers: {
          Cookie: request.headers.get("Cookie") || "",
        },
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      throw new Error(
        `Session not found: ${sessionResponse.status} ${errorText}`
      );
    }

    const { session } = await sessionResponse.json();

    // Store session metadata directly in PostgreSQL (Hocuspocus will load it)
    // Use JSON for initial state - simpler than Y.Doc binary
    const pool = getHocuspocusPostgresPool();

    const sessionMetadata = {
      canvasData,
      canvasType: canvasType || "graph",
      tabId,
      workspaceId,
      initializedAt: Date.now(),
      initializedBy: userId,
    };

    const now = Date.now();

    logger.info({
      userId,
      sessionId,
      action: "storing_session_metadata",
      hasCanvasData: !!canvasData,
      nodeCount: canvasData?.graphData?.nodes?.length || 0,
    });

    await pool.query(
      `INSERT INTO collaboration_sessions_metadata (session_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (session_id) DO UPDATE
       SET metadata = $2, updated_at = $3`,
      [sessionId, JSON.stringify(sessionMetadata), now]
    );

    const nodeCount = canvasData?.graphData?.nodes?.length || 0;

    logger.info({
      userId,
      sessionId,
      roomId: session.roomId,
      action: "session_initialized",
      nodeCount,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      nodeCount,
      ready: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        message: errorMessage,
        stack: errorStack,
        error,
      },
      "Initialize session error"
    );

    return NextResponse.json(
      {
        error: "Failed to initialize session",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
