/**
 * In-memory version storage adapter
 * Useful for testing or server-side usage
 */

import type {
  VersionSnapshot,
  VersionMetadata,
  VersionStorage,
} from "../types";

/**
 * In-memory version storage
 * Stores snapshots in a Map (not persistent across page reloads)
 */
export class MemoryVersionStorage implements VersionStorage {
  private versions = new Map<string, VersionSnapshot>();

  async save(snapshot: VersionSnapshot): Promise<void> {
    this.versions.set(snapshot.id, snapshot);
  }

  async load(versionId: string): Promise<VersionSnapshot | null> {
    return this.versions.get(versionId) || null;
  }

  async list(): Promise<VersionMetadata[]> {
    const metadata: VersionMetadata[] = Array.from(this.versions.values()).map(
      (snapshot) => ({
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
    return metadata;
  }

  async delete(versionId: string): Promise<void> {
    this.versions.delete(versionId);
  }

  async clear(): Promise<void> {
    this.versions.clear();
  }
}
