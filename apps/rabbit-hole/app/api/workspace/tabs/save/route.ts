import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";

import { getUserTier, getTierLimits } from "@proto/auth";
import { buildWorkspaceRoomId } from "@proto/utils";

import { getHocuspocusPostgresPool } from "@/lib/hocuspocus-db";

export async function POST(request: NextRequest) {
  try {
    const userId = "local-user";
    const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, workspaceId, tabId, createNewTab } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 }
      );
    }

    // Check tier limits
    const tier = getUserTier(user);
    const limits = getTierLimits(tier);

    if (limits.workspaces === 0) {
      return NextResponse.json(
        { error: "Workspace access requires paid tier" },
        { status: 402 }
      );
    }

    // Get session data from Y.Doc
    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/collaboration/sessions/${sessionId}`,
      {
        headers: {
          Cookie: request.headers.get("Cookie") || "",
        },
      }
    );

    if (!sessionResponse.ok) {
      throw new Error("Session not found");
    }

    const { session } = await sessionResponse.json();
    const pool = getHocuspocusPostgresPool();

    // Load session Y.Doc
    const sessionDoc = await pool.query(
      "SELECT state FROM yjs_documents WHERE room_id = $1",
      [session.roomId]
    );

    if (!sessionDoc.rows[0]) {
      throw new Error("Session data not found");
    }

    const sessionYdoc = new Y.Doc();
    Y.applyUpdate(sessionYdoc, sessionDoc.rows[0].state);
    const sessionTab = sessionYdoc.getMap("tab");
    const canvasData = sessionTab.get("canvasData");
    const canvasType = sessionTab.get("canvasType") || "graph";

    // Build workspace room ID
    const workspaceRoomId = buildWorkspaceRoomId(
      userId,
      workspaceId || "default",
      "draft",
      "1"
    );

    // Load or create workspace Y.Doc
    const workspaceDoc = await pool.query(
      "SELECT state FROM yjs_documents WHERE room_id = $1",
      [workspaceRoomId]
    );

    const workspaceYdoc = new Y.Doc();
    if (workspaceDoc.rows[0]) {
      Y.applyUpdate(workspaceYdoc, workspaceDoc.rows[0].state);
    }

    // Update workspace tab
    const yTabsMap = workspaceYdoc.getMap("tabsMap");
    let targetTabMap = yTabsMap.get(tabId) as Y.Map<any> | undefined;

    // Create new tab if doesn't exist or createNewTab requested
    if (!targetTabMap || createNewTab) {
      const newTabId = createNewTab ? `tab-${Date.now()}` : tabId;
      const newTabMap = new Y.Map();

      workspaceYdoc.transact(() => {
        newTabMap.set("id", newTabId);
        newTabMap.set(
          "name",
          createNewTab ? "Collaboration Copy" : "Collaboration Session"
        );
        newTabMap.set("type", "main");
        newTabMap.set("canvasType", canvasType);
        newTabMap.set("canvasData", canvasData);
        newTabMap.set("visibility", "edit");
        newTabMap.set("metadata", {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        yTabsMap.set(newTabId, newTabMap);

        // Add to tab order
        const yTabOrder = workspaceYdoc.getArray("tabOrder");
        yTabOrder.push([newTabId]);
      }, userId);

      targetTabMap = newTabMap;
    } else {
      // Update existing tab
      workspaceYdoc.transact(() => {
        if (!targetTabMap) return;
        targetTabMap.set("canvasData", canvasData);
        targetTabMap.set("canvasType", canvasType);

        const metadata = targetTabMap.get("metadata") || {};
        targetTabMap.set("metadata", {
          ...metadata,
          updatedAt: Date.now(),
        });
      }, userId);
    }

    // Save workspace Y.Doc back to PostgreSQL
    const state = Y.encodeStateAsUpdate(workspaceYdoc);
    await pool.query(
      `INSERT INTO yjs_documents (room_id, state, clerk_org_id, updated_at)
       VALUES ($1, $2, NULL, NOW())
       ON CONFLICT (room_id) DO UPDATE
       SET state = $2, updated_at = NOW()`,
      [workspaceRoomId, Buffer.from(state)]
    );

    return NextResponse.json({
      success: true,
      tabId: targetTabMap?.get("id"),
      nodeCount: (canvasData as any)?.graphData?.nodes?.length || 0,
    });
  } catch (error) {
    console.error("Save workspace error:", error);
    return NextResponse.json(
      { error: "Failed to save to workspace" },
      { status: 500 }
    );
  }
}
