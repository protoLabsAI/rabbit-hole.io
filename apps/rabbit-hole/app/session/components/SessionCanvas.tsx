"use client";

/**
 * Shared Session Canvas Component
 *
 * Reusable collaboration view for any canvas type.
 * Both host and guest use this component with different headers/controls.
 *
 * SYNC PATTERN: Follows workspace collaboration pattern with:
 * - Debounced Y.Doc observers (100ms)
 * - userId as transaction origin (not role-based strings)
 * - isSerializingRef for local echo prevention
 * - lastWriteTimestampRef to ignore server echoes (500ms window)
 *
 * ECHO PREVENTION:
 * 1. Local write → Y.Doc (origin: userId)
 * 2. Observer fires immediately (origin: userId) → ignored
 * 3. Server broadcasts back (origin: HocuspocusProvider) → ignored if within 500ms of write
 * 4. Remote user writes → Server broadcasts (origin: HocuspocusProvider) → accepted (>500ms since our write)
 */

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

import { Icon } from "@proto/icon-system";
import { AvatarStack as AvatarGroup, Cursor } from "@proto/ui/molecules";

import { useEphemeralYjs } from "@/hooks/useEphemeralYjs";
import { getCanvasRenderer } from "@/research/components/workspace/canvas/CanvasRegistry";
import type { CanvasType } from "@/research/types/workspace";

interface SessionCanvasProps {
  sessionId: string;
  orgId: string;
  role: "host" | "guest" | "viewer";
  header: React.ReactNode;
  onDataChange?: (data: any) => void;
  onCursorUpdate?: (x: number | null, y: number | null) => void;
  onParticipantCountChange?: (count: number) => void;
}

export function SessionCanvas({
  sessionId,
  orgId,
  role,
  header,
  onDataChange,
  onCursorUpdate,
  onParticipantCountChange,
}: SessionCanvasProps) {
  const router = useRouter();
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
  const userId = user?.id || "anonymous";

  const {
    ydoc,
    ready,
    others,
    error,
    updateCursor,
    updateUserMetadata,
    provider,
    isLocalMode,
  } = useEphemeralYjs({
    orgId,
    sessionId,
    enabled: true,
  });

  // Sync participant count (online users only)
  useEffect(() => {
    const onlineCount = others.filter((u) => u.isOnline).length + 1; // +1 for self
    onParticipantCountChange?.(onlineCount);
  }, [others, onParticipantCountChange]);

  const [canvasData, setCanvasData] = useState<any>(null);
  const [canvasType, setCanvasType] = useState<CanvasType>("graph");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sessionMetadata, setSessionMetadata] = useState<{
    workspaceId?: string;
    tabId?: string;
  } | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Array<{
      userId: string;
      name: string;
      color: string;
      x: number;
      y: number;
      opacity: number;
    }>
  >([]);
  const isSerializingRef = useRef(false); // Prevent echo loops
  const lastWriteTimestampRef = useRef<number>(0); // Track last Y.Doc write to ignore server echo
  const initAttemptedRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Freehand drawing state (managed internally, toolbar handles toggle)
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);

  // Load initial session metadata and write to Y.Doc
  useEffect(() => {
    if (!ready || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const initializeFromMetadata = async () => {
      try {
        const response = await fetch(
          `/api/collaboration/sessions/${sessionId}/metadata`
        );
        if (response.ok) {
          const { metadata } = await response.json();

          if (metadata) {
            const yTab = ydoc.getMap("tab");
            // Use "init" as origin to skip observer filtering
            ydoc.transact(() => {
              yTab.set("canvasData", metadata.canvasData);
              yTab.set("canvasType", metadata.canvasType);
              yTab.set("tabId", metadata.tabId);
            }, "init");

            setCanvasData(metadata.canvasData);
            setCanvasType(metadata.canvasType);
            setSessionMetadata({
              workspaceId: metadata.workspaceId,
              tabId: metadata.tabId,
            });
            setDataLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn("No metadata, using Y.Doc only");
      }

      // Fallback: load from Y.Doc
      const yTab = ydoc.getMap("tab");
      const data = yTab.get("canvasData");
      const type = yTab.get("canvasType");
      setCanvasData(data || { graphData: { nodes: [], edges: [] } });
      setCanvasType((type as CanvasType) || "graph");
      setDataLoaded(true);
    };

    initializeFromMetadata();
  }, [ydoc, ready, sessionId]);

  // Set user metadata on mount with full Clerk data + heartbeat
  useEffect(() => {
    if (!ready || isLocalMode) return;
    if (!provider || !("awareness" in provider) || !provider.awareness) return;

    const colors = ["#10B981", "#3B82F6", "#EAB308", "#A855F7", "#EC4899"];
    const userColor = colors[Math.floor(Math.random() * colors.length)];

    const setMetadata = () => {
      if (!provider || !("awareness" in provider) || !provider.awareness)
        return;

      // Set complete user metadata with Clerk info
      provider.awareness.setLocalStateField("userId", userId);
      provider.awareness.setLocalStateField(
        "name",
        user?.fullName ||
          user?.firstName ||
          user?.username ||
          `User ${userId.slice(-4)}`
      );
      provider.awareness.setLocalStateField("color", userColor);
      provider.awareness.setLocalStateField("imageUrl", user?.imageUrl);
    };

    // Initial set
    setMetadata();

    // Heartbeat: Re-broadcast every 10 seconds to maintain presence after reconnects
    const heartbeat = setInterval(setMetadata, 10000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [ready, user, userId, provider, isLocalMode]);

  // Cursor tracking now handled by ResearchEditor (uses flow coordinates for world-space accuracy)

  // Observe Y.Doc changes with debouncing (workspace pattern)
  useEffect(() => {
    if (!ready) return;

    const yTab = ydoc.getMap("tab");
    let updateTimeout: NodeJS.Timeout;

    const loadTabData = (event?: any) => {
      const origin = event?.transaction?.origin;

      // Skip own updates (echo prevention)
      if (isSerializingRef.current) {
        isSerializingRef.current = false;
        return;
      }

      // Ignore own updates and init
      if (origin === userId || origin === "init") {
        return;
      }

      // Ignore server echoes of our own writes
      if (
        origin === "HocuspocusProvider" ||
        origin?.constructor?.name === "HocuspocusProvider"
      ) {
        const timeSinceLastWrite = Date.now() - lastWriteTimestampRef.current;
        if (timeSinceLastWrite < 500) {
          return;
        }
      }

      // Debounce updates (prevents sync loops and batches rapid changes)
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        const data = yTab.get("canvasData");
        const type = yTab.get("canvasType") || "graph";

        if (data) {
          const canvasData = data as any;
          setCanvasData({ ...canvasData });
        }

        setCanvasType(type as CanvasType);
      }, 100);
    };

    yTab.observe(loadTabData);

    return () => {
      clearTimeout(updateTimeout);
      yTab.unobserve(loadTabData);
    };
  }, [ydoc, ready, role, userId]);

  // Handle canvas changes (editor role only)
  const handleCanvasChange = useCallback(
    (data: any) => {
      if (!ready || role === "viewer") return;

      // Don't overwrite data with empty canvas during hydration
      const hasData =
        data?.graphData?.nodes?.length > 0 ||
        data?.graphData?.edges?.length > 0;
      const currentData = ydoc.getMap("tab").get("canvasData") as any;
      const currentHasData =
        currentData?.graphData?.nodes?.length > 0 ||
        currentData?.graphData?.edges?.length > 0;

      if (!hasData && currentHasData) {
        return;
      }

      // Set serialization flag BEFORE transaction (echo prevention)
      isSerializingRef.current = true;

      // Track write timestamp to ignore server echoes
      lastWriteTimestampRef.current = Date.now();

      const yTab = ydoc.getMap("tab");
      ydoc.transact(() => {
        yTab.set("canvasData", data);
        yTab.set("updatedAt", Date.now());
        yTab.set("updatedBy", userId);
      }, userId); // Use userId as origin (workspace pattern)

      // Notify parent if callback provided
      onDataChange?.(data);
    },
    [ready, role, ydoc, onDataChange, userId]
  );

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Icon
            name="alert-triangle"
            size={48}
            className="mx-auto mb-4 text-destructive"
          />
          <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!ready || !dataLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg font-medium">
            {!ready ? "Connecting to session..." : "Loading canvas data..."}
          </div>
        </div>
      </div>
    );
  }

  const renderer = getCanvasRenderer(canvasType);
  const CanvasComponent = renderer.component;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header (role-specific) */}
      {header}

      {/* Canvas - full height, works with ANY canvas type */}
      <div ref={canvasRef} className="flex-1 relative overflow-hidden">
        <CanvasComponent
          data={canvasData}
          onDataChange={handleCanvasChange}
          readOnly={role === "viewer"}
          ydoc={ydoc}
          userId={userId}
          provider={provider}
          updateCursor={updateCursor}
          onCursorsUpdate={setRemoteCursors}
          disableAutoPersist={true}
          userTier="pro"
          onFreehandToggle={setIsInteractionLocked}
        />

        {/* Active users avatar group */}
        {others.length > 0 && (
          <div className="absolute top-4 right-4 z-50">
            <AvatarGroup
              users={[
                {
                  id: userId,
                  name: user?.fullName || user?.firstName || "You",
                  avatar: user?.imageUrl,
                },
                ...Array.from(
                  new Map(others.map((u) => [u.userId, u])).values()
                )
                  .filter((u) => u.isOnline)
                  .slice(0, 4)
                  .map((other) => ({
                    id: other.userId,
                    name: other.name || "User",
                    avatar: other.imageUrl,
                    color: other.color,
                  })),
              ]}
              max={5}
              size="md"
            />
          </div>
        )}

        {/* Remote user cursors (world-space accurate) */}
        {remoteCursors.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-[100]">
            {remoteCursors.map((cursor, index) => {
              const colors = [
                { foreground: "text-emerald-800", background: "bg-emerald-50" },
                { foreground: "text-rose-800", background: "bg-rose-50" },
                { foreground: "text-sky-800", background: "bg-sky-50" },
                { foreground: "text-violet-800", background: "bg-violet-50" },
                { foreground: "text-amber-800", background: "bg-amber-50" },
              ];
              const { foreground, background } = colors[index % colors.length];

              return (
                <Cursor
                  key={cursor.userId}
                  x={cursor.x}
                  y={cursor.y}
                  name={cursor.name}
                  color={cursor.color}
                  isVisible={cursor.opacity > 0}
                  className="transition-all duration-150"
                  style={{ opacity: cursor.opacity }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
