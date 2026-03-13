/**
 * IndexedDB storage adapter for version snapshots
 * Works in browser environments for local-first persistence
 */

import type {
  VersionSnapshot,
  VersionMetadata,
  VersionStorage,
} from "../types";

const DB_NAME = "yjs-history";
const DB_VERSION = 1;
const STORE_NAME = "versions";

/**
 * IndexedDB-based version storage
 * Stores version snapshots in browser IndexedDB
 */
export class IndexedDBVersionStorage implements VersionStorage {
  private dbPromise: Promise<IDBDatabase>;

  constructor(private namespace: string = "default") {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDB not available");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        `${DB_NAME}-${this.namespace}`,
        DB_VERSION
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("tags", "tags", {
            unique: false,
            multiEntry: true,
          });
        }
      };
    });
  }

  async save(snapshot: VersionSnapshot): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(snapshot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async load(versionId: string): Promise<VersionSnapshot | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(versionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async list(): Promise<VersionMetadata[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Strip out state data for metadata-only listing
        const metadata = request.result.map(
          (snapshot: VersionSnapshot): VersionMetadata => ({
            id: snapshot.id,
            name: snapshot.name,
            description: snapshot.description,
            timestamp: snapshot.timestamp,
            userId: snapshot.userId,
            tags: snapshot.tags,
            parentId: snapshot.parentId,
          })
        );
        // Sort by timestamp descending (newest first)
        metadata.sort((a, b) => b.timestamp - a.timestamp);
        resolve(metadata);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(versionId: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(versionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
