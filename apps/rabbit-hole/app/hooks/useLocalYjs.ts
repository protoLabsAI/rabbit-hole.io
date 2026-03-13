/**
 * Local-Only Yjs Provider (Free Tier)
 *
 * Provides offline-only workspace persistence via IndexedDB.
 * No network sync, no Hocuspocus connection.
 */

import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

interface UseLocalYjsOptions {
  workspaceId: string;
  userId: string;
  enabled?: boolean;
}

export function useLocalYjs({
  workspaceId,
  userId,
  enabled = true,
}: UseLocalYjsOptions) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<IndexeddbPersistence | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || !workspaceId) {
      return;
    }

    const roomId = `local:${userId}:workspace:${workspaceId}`;
    const idbProvider = new IndexeddbPersistence(roomId, ydoc);

    idbProvider.on("synced", () => {
      console.log("📦 Local workspace loaded from IndexedDB");
      setReady(true);
    });

    setProvider(idbProvider);

    return () => {
      idbProvider.destroy();
    };
  }, [workspaceId, userId, enabled, ydoc]);

  return {
    ydoc,
    provider,
    ready,
    error: null,
    others: [], // No collaboration in local mode
    updateCursor: () => {}, // No-op for local mode
    updateUserMetadata: () => {}, // No-op for local mode
  };
}
