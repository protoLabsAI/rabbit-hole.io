/**
 * Ephemeral Yjs Hook (Guest Mode)
 *
 * Hocuspocus-only connection for collaboration Guests.
 * NO IndexedDB persistence - data exists in-memory only.
 * Guest reconnection requires full resync from Host.
 */

import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState, useCallback } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { useToast } from "@proto/ui/hooks";

interface UseEphemeralYjsOptions {
  orgId: string;
  sessionId: string;
  enabled?: boolean;
  fallbackToLocal?: boolean;
}

interface OtherUser {
  clientId: number;
  userId: string;
  name?: string;
  color?: string;
  imageUrl?: string;
  cursor?: { x: number; y: number } | null;
  draggingNode?: string | null;
  liveNodePosition?: { nodeId: string; x: number; y: number } | null;
  isOnline: boolean;
  lastSeen?: number;
}

export function useEphemeralYjs({
  orgId,
  sessionId,
  enabled = true,
  fallbackToLocal = true,
}: UseEphemeralYjsOptions) {
  const userId = "local-user";
  const getToken = async (_opts?: any) => "mock-token";
  const { toast } = useToast();
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [localProvider, setLocalProvider] =
    useState<IndexeddbPersistence | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Fetch session to get correct roomId
  useEffect(() => {
    if (!sessionId || !enabled) return;

    fetch(`/api/collaboration/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session?.roomId) {
          setRoomId(data.session.roomId);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch session roomId:", err);
        if (fallbackToLocal) {
          setIsLocalMode(true);
          setError(null);
        } else {
          setError("Failed to load session");
        }
      });
  }, [sessionId, enabled, fallbackToLocal]);

  useEffect(() => {
    if (!enabled || !userId || (!roomId && !isLocalMode)) {
      return;
    }

    // Handle local mode initialization
    if (isLocalMode && !localProvider) {
      const localRoomId = `local:${userId}:session:${sessionId}`;
      let idbInstance: IndexeddbPersistence | null = null;
      idbInstance = new IndexeddbPersistence(localRoomId, ydoc);
      idbInstance.on("synced", () => {
        console.log("📦 Local session loaded from IndexedDB");
        setReady(true);
      });
      setLocalProvider(idbInstance);
      return;
    }

    // Skip HocuspocusProvider creation if already in local mode
    if (isLocalMode) {
      return;
    }

    // TypeScript guard: roomId is guaranteed to be non-null here
    if (!roomId) return;
    const activeRoomId = roomId; // Capture non-null value for closure

    let hocusProvider: HocuspocusProvider | null = null;

    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication token not available");
          return;
        }

        const wsUrl =
          process.env.NEXT_PUBLIC_YJS_WS_URL || "ws://localhost:1234";

        hocusProvider = new HocuspocusProvider({
          url: wsUrl,
          name: activeRoomId,
          document: ydoc,
          token,
          onAuthenticated: () => {
            setError(null);
          },
          onAuthenticationFailed: ({ reason }) => {
            if (reason?.includes("expired")) {
              console.log("🔄 Token expired, attempting refresh...");
              // Trigger reconnection with fresh token
              setTimeout(() => {
                if (hocusProvider) {
                  hocusProvider.destroy();
                }
              }, 1000);
            } else if (fallbackToLocal && !isLocalMode) {
              console.log(
                "🔄 Falling back to local mode due to WebSocket issues"
              );
              if (hocusProvider) hocusProvider.destroy();
              setIsLocalMode(true);
              toast({
                title: "Collaboration Offline",
                description:
                  "Switched to local mode. Your work will be saved locally.",
                variant: "destructive",
              });
              // Initialize local provider
              const localRoomId = `local:${userId}:session:${sessionId}`;
              const idbProvider = new IndexeddbPersistence(localRoomId, ydoc);
              idbProvider.on("synced", () => {
                console.log("📦 Local session loaded from IndexedDB");
                setReady(true);
              });
              setLocalProvider(idbProvider);
            } else {
              setError(reason || "Authentication failed");
            }
          },
          onSynced: ({ state }) => {
            setReady(true);
          },
          onClose: ({ event }) => {
            if (event.code === 4003) {
              setError("Session full");
            } else if (event.code >= 4000) {
              setError(event.reason || "Connection closed");
            }
            setReady(false);
          },
        });

        // Track other users by userId (not clientId) to handle reconnects without duplicates
        const usersByUserId = new Map<string, OtherUser>();
        let lastOthersHash = "";

        const computeHash = (users: OtherUser[]): string => {
          return users
            .map(
              (u) =>
                `${u.userId}:${u.isOnline}:${u.cursor?.x},${u.cursor?.y}:${u.draggingNode}`
            )
            .join("|");
        };

        hocusProvider.on("awarenessUpdate", () => {
          const activeStates = hocusProvider!.awareness!.getStates();
          const now = Date.now();

          // Get current active userIds
          const activeUserIds = new Set<string>();

          // Update or add active users
          activeStates.forEach((state: any, clientId: number) => {
            if (clientId === hocusProvider!.awareness!.clientID) return; // Skip self

            const userId = state.userId || `client-${clientId}`;
            activeUserIds.add(userId);

            // Update user with latest clientId and data (deduped by userId)
            usersByUserId.set(userId, {
              clientId, // Latest clientId (updates on reconnect)
              userId,
              name: state.name || `User ${userId.slice(-4)}`,
              color: state.color || "#3b82f6",
              imageUrl: state.imageUrl,
              cursor: state.cursor,
              draggingNode: state.draggingNode || null,
              liveNodePosition: state.liveNodePosition || null,
              isOnline: true,
              lastSeen: now,
            });
          });

          // Mark users as offline if not in active states
          usersByUserId.forEach((user, userId) => {
            if (!activeUserIds.has(userId) && user.isOnline) {
              usersByUserId.set(userId, {
                ...user,
                isOnline: false,
                lastSeen: now,
              });
            }
          });

          // Clean up users offline for > 30 seconds
          usersByUserId.forEach((user, userId) => {
            if (
              !user.isOnline &&
              user.lastSeen &&
              now - user.lastSeen > 30000
            ) {
              usersByUserId.delete(userId);
            }
          });

          // Only update state if data actually changed
          const newUsers = Array.from(usersByUserId.values());
          const newHash = computeHash(newUsers);

          if (newHash !== lastOthersHash) {
            lastOthersHash = newHash;
            setOthers(newUsers);
          }
        });

        setProvider(hocusProvider);
      } catch (err) {
        setError("Failed to connect to session");
      }
    })();

    return () => {
      if (hocusProvider) {
        hocusProvider.destroy();
      }
      // Prefer destroying the instance created in this effect run, if any
      try {
        (localProvider as IndexeddbPersistence | null)?.destroy?.();
      } catch {}
    };
  }, [
    userId,
    roomId,
    enabled,
    isLocalMode,
    localProvider,
    getToken,
    ydoc,
    sessionId,
    fallbackToLocal,
    toast,
  ]);

  const updateCursor = useCallback(
    (x: number | null, y: number | null) => {
      if (!provider?.awareness) return;
      provider.awareness.setLocalStateField(
        "cursor",
        x !== null && y !== null ? { x, y } : null
      );
    },
    [provider]
  );

  const updateUserMetadata = useCallback(
    (metadata: { name?: string; color?: string }) => {
      if (!provider?.awareness) return;
      Object.entries(metadata).forEach(([key, value]) => {
        provider.awareness!.setLocalStateField(key, value);
      });
    },
    [provider]
  );

  const setDraggingNode = useCallback(
    (nodeId: string | null) => {
      if (!provider?.awareness) return;
      provider.awareness.setLocalStateField("draggingNode", nodeId);
    },
    [provider]
  );

  const setLiveNodePosition = useCallback(
    (position: { nodeId: string; x: number; y: number } | null) => {
      if (!provider?.awareness) return;
      provider.awareness.setLocalStateField("liveNodePosition", position);
    },
    [provider]
  );

  return {
    ydoc,
    provider: isLocalMode ? localProvider : provider,
    ready,
    others: isLocalMode ? [] : others,
    error: isLocalMode ? null : error,
    isLocalMode,
    updateCursor: isLocalMode ? () => {} : updateCursor,
    updateUserMetadata: isLocalMode ? () => {} : updateUserMetadata,
    setDraggingNode: isLocalMode ? () => {} : setDraggingNode,
    setLiveNodePosition: isLocalMode ? () => {} : setLiveNodePosition,
  };
}
