import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState, useCallback, useRef } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { useToast } from "@protolabsai/ui/hooks";

interface UseHocuspocusYjsOptions {
  roomId: string;
  enabled?: boolean;
  fallbackToLocal?: boolean;
}

export interface OtherUser {
  clientId: number;
  userId: string;
  name?: string;
  color?: string;
  cursor?: { x: number; y: number } | null;
}

export function useHocuspocusYjs({
  roomId,
  enabled = true,
  fallbackToLocal = true,
}: UseHocuspocusYjsOptions) {
  const userId = "local-user";
  const getToken = async (_?: any) => null;
  const { toast } = useToast();

  // Use ref for Y.Doc to prevent dependency re-runs
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const ydoc = ydocRef.current;

  // Use ref for provider to prevent state-triggered reconnections
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [localProvider, setLocalProvider] =
    useState<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !roomId) {
      return;
    }

    // Handle local mode initialization
    if (isLocalMode && !localProvider) {
      const localRoomId = `local:${userId}:workspace:${roomId}`;
      const idbProvider = new IndexeddbPersistence(localRoomId, ydoc);
      idbProvider.on("synced", () => {
        console.log("📦 Local workspace loaded from IndexedDB");
        setReady(true);
      });
      setLocalProvider(idbProvider);
      return;
    }

    // Guard: Skip if already connected to this room
    if (
      providerRef.current &&
      providerRef.current.configuration.name === roomId
    ) {
      console.log("⏭️ Provider already connected to:", roomId);
      return;
    }

    // Cleanup old provider if switching rooms
    if (providerRef.current) {
      console.log("🔄 Switching rooms, cleaning up old provider");
      providerRef.current.destroy();
      providerRef.current = null;
    }

    let hocusProvider: HocuspocusProvider | null = null;

    (async () => {
      try {
        const token = null; /* getToken removed */
        if (!token) {
          setError("No auth token");
          return;
        }

        const wsUrl =
          process.env.NEXT_PUBLIC_YJS_WS_URL || "ws://localhost:1234";

        console.log("🔌 Connecting to Hocuspocus:", roomId);

        hocusProvider = new HocuspocusProvider({
          url: wsUrl,
          name: roomId,
          document: ydoc,
          token,

          onAuthenticated: () => {
            console.log("✅ Authenticated:", roomId);
            setError(null);
            setReconnectAttempts(0); // Reset on successful auth
          },

          onAuthenticationFailed: ({ reason }) => {
            console.error("❌ Auth failed:", reason);
            if (reason?.includes("expired") && reconnectAttempts < 3) {
              console.log("🔄 Token expired, attempting refresh...");
              setReconnectAttempts((prev) => prev + 1);
              // Trigger reconnection with fresh token
              setTimeout(() => {
                if (providerRef.current) {
                  providerRef.current.destroy();
                  providerRef.current = null;
                }
              }, 1000);
            } else if (fallbackToLocal && !isLocalMode) {
              console.log(
                "🔄 Falling back to local mode due to WebSocket issues"
              );
              setIsLocalMode(true);
              toast({
                title: "Collaboration Offline",
                description:
                  "Switched to local mode. Your work will be saved locally.",
                variant: "destructive",
              });
              // Initialize local provider
              const localRoomId = `local:${userId}:workspace:${roomId}`;
              const idbProvider = new IndexeddbPersistence(localRoomId, ydoc);
              idbProvider.on("synced", () => {
                console.log("📦 Local workspace loaded from IndexedDB");
                setReady(true);
              });
              setLocalProvider(idbProvider);
            } else {
              setError(reason || "Authentication failed");
            }
          },

          onSynced: ({ state }) => {
            console.log("✅ Synced:", roomId);
            setReady(true);
          },

          onClose: ({ event }) => {
            console.log("🔌 Closed:", event.code);
            setReady(false);

            if (event.code === 4003) {
              setError("Seat limit reached");
            } else if (event.code >= 4000) {
              setError(event.reason || "Connection closed");
            }
          },

          // Auto-reconnect with token refresh
          onConnect: () => {
            console.log("🔌 Connected:", roomId);
          },

          onDisconnect: () => {
            console.log("🔌 Disconnected:", roomId);
            setReady(false);
          },
        });

        // Awareness
        if (hocusProvider?.awareness) {
          let lastOthersHash = "";

          const computeHash = (users: any[]): string => {
            return users
              .map((u) => `${u.userId}:${u.cursor?.x},${u.cursor?.y}`)
              .join("|");
          };

          hocusProvider.on("awarenessUpdate", () => {
            if (!hocusProvider?.awareness) return;
            const states = Array.from(
              hocusProvider.awareness.getStates().entries()
            )
              .filter(
                ([clientId]) =>
                  hocusProvider?.awareness &&
                  clientId !== hocusProvider.awareness.clientID
              )
              .map(([clientId, state]: [number, any]) => ({
                clientId,
                userId: state.userId || "unknown",
                name: state.name,
                color: state.color || "#3b82f6",
                cursor: state.cursor,
              }));

            // Only update if data changed
            const newHash = computeHash(states);
            if (newHash !== lastOthersHash) {
              lastOthersHash = newHash;
              setOthers(states);
            }
          });

          // Set initial awareness
          hocusProvider.setAwarenessField("user", {
            userId,
            name: "User",
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          });
        }

        providerRef.current = hocusProvider;
      } catch (err) {
        console.error("❌ Hocuspocus error:", err);
        setError("Connection failed");
      }
    })();

    return () => {
      console.log("⚠️ useHocuspocusYjs CLEANUP:", {
        roomId,
        enabled,
        userId,
        hasProvider: !!hocusProvider,
        isLocalMode,
      });
      if (hocusProvider) {
        hocusProvider.destroy();
      }
      if (localProvider) {
        localProvider.destroy();
      }
    };
  }, [userId, roomId, enabled]); // ydoc removed - stable ref

  const updateCursor = useCallback((x: number | null, y: number | null) => {
    if (!providerRef.current?.awareness) return;
    providerRef.current.setAwarenessField(
      "cursor",
      x !== null && y !== null ? { x, y } : null
    );
  }, []);

  const updateUserMetadata = useCallback(
    (metadata: { name?: string; color?: string }) => {
      if (!providerRef.current?.awareness) return;
      Object.entries(metadata).forEach(([key, value]) => {
        providerRef.current!.setAwarenessField(key, value);
      });
    },
    []
  );

  return {
    ydoc,
    provider: isLocalMode ? localProvider : providerRef.current,
    ready,
    others: isLocalMode ? [] : others,
    error: isLocalMode ? null : error,
    isLocalMode,
    updateCursor: isLocalMode ? () => {} : updateCursor,
    updateUserMetadata: isLocalMode ? () => {} : updateUserMetadata,
  };
}
