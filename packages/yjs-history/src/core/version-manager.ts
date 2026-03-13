/**
 * Version snapshot manager
 * Handles creation, storage, and restoration of Y.Doc versions
 */

import * as Y from "yjs";

import type {
  VersionSnapshot,
  VersionMetadata,
  VersionStorage,
} from "../types";

export interface CreateVersionOptions {
  name: string;
  description?: string;
  tags?: string[];
  userId: string;
  parentId?: string;
}

/**
 * Manages version snapshots for a Y.Doc
 */
export class VersionManager {
  constructor(
    private ydoc: Y.Doc,
    private storage: VersionStorage
  ) {}

  /**
   * Deep clone Y.js types (handles nested Maps, Arrays, Text)
   */
  private deepCloneYType(source: any, target: any): void {
    if (source instanceof Y.Map && target instanceof Y.Map) {
      source.forEach((value, key) => {
        if (value instanceof Y.Map) {
          // Nested Y.Map - create new Y.Map in target and recursively clone
          const nestedTarget = new Y.Map();
          this.deepCloneYType(value, nestedTarget);
          target.set(key, nestedTarget);
        } else if (value instanceof Y.Array) {
          // Nested Y.Array - create new Y.Array and recursively clone
          const nestedTarget = new Y.Array();
          this.deepCloneYType(value, nestedTarget);
          target.set(key, nestedTarget);
        } else if (value instanceof Y.Text) {
          // Nested Y.Text - create new Y.Text and copy content
          const nestedTarget = new Y.Text();
          nestedTarget.insert(0, value.toString());
          target.set(key, nestedTarget);
        } else {
          // Primitive value - copy directly
          target.set(key, value);
        }
      });
    } else if (source instanceof Y.Array && target instanceof Y.Array) {
      const items = source.toArray();
      items.forEach((item, index) => {
        if (item instanceof Y.Map) {
          const nestedTarget = new Y.Map();
          this.deepCloneYType(item, nestedTarget);
          target.insert(index, [nestedTarget]);
        } else if (item instanceof Y.Array) {
          const nestedTarget = new Y.Array();
          this.deepCloneYType(item, nestedTarget);
          target.insert(index, [nestedTarget]);
        } else if (item instanceof Y.Text) {
          const nestedTarget = new Y.Text();
          nestedTarget.insert(0, item.toString());
          target.insert(index, [nestedTarget]);
        } else {
          target.insert(index, [item]);
        }
      });
    } else if (source instanceof Y.Text && target instanceof Y.Text) {
      target.insert(0, source.toString());
    }
  }

  /**
   * Create a new version snapshot
   * Captures current Y.Doc state using snapshot API
   */
  async createVersion(options: CreateVersionOptions): Promise<string> {
    const versionId = `version-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // Use Y.snapshot to capture current state
    const snapshot_state = Y.snapshot(this.ydoc);
    // Encode the state vector for storage
    const state = Y.encodeStateAsUpdate(this.ydoc);

    const snapshot: VersionSnapshot = {
      id: versionId,
      name: options.name,
      description: options.description,
      timestamp: Date.now(),
      userId: options.userId,
      state,
      tags: options.tags,
      parentId: options.parentId,
    };

    await this.storage.save(snapshot);
    return versionId;
  }

  /**
   * List all available versions (metadata only)
   */
  async listVersions(): Promise<VersionMetadata[]> {
    return this.storage.list();
  }

  /**
   * Load a specific version (full snapshot with state)
   */
  async loadVersion(versionId: string): Promise<VersionSnapshot | null> {
    return this.storage.load(versionId);
  }

  /**
   * Restore Y.Doc to a specific version
   * DESTRUCTIVE: Creates a new document from snapshot
   */
  async restoreVersion(versionId: string, userId: string): Promise<void> {
    const snapshot = await this.storage.load(versionId);
    if (!snapshot) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Create a new document and apply the snapshot
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, snapshot.state);

    // Copy all data from temp doc to current doc
    this.ydoc.transact(() => {
      // Clear current document
      const keys = Array.from(this.ydoc.share.keys());
      keys.forEach((key) => {
        const type = this.ydoc.get(key);
        if (type instanceof Y.Map) {
          type.clear();
        } else if (type instanceof Y.Array) {
          type.delete(0, type.length);
        } else if (type instanceof Y.Text) {
          type.delete(0, type.length);
        }
      });

      // Copy data from temp doc (deep clone to handle nested structures)
      const tempKeys = Array.from(tempDoc.share.keys());
      tempKeys.forEach((key) => {
        const sourceType = tempDoc.get(key);
        const targetType = this.ydoc.get(key);

        // Use deep clone to properly handle nested Y.Map/Y.Array/Y.Text
        this.deepCloneYType(sourceType, targetType);
      });
    }, userId);
  }

  /**
   * Delete a version
   */
  async deleteVersion(versionId: string): Promise<void> {
    await this.storage.delete(versionId);
  }

  /**
   * Clear all versions
   */
  async clearVersions(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Get version diff (compare two versions)
   * Returns size of changes in bytes
   */
  async getVersionDiff(
    fromVersionId: string,
    toVersionId: string
  ): Promise<number> {
    const fromSnapshot = await this.storage.load(fromVersionId);
    const toSnapshot = await this.storage.load(toVersionId);

    if (!fromSnapshot || !toSnapshot) {
      throw new Error("Version not found for diff");
    }

    // Simple size comparison (can be enhanced with actual diff logic)
    return Math.abs(
      toSnapshot.state.byteLength - fromSnapshot.state.byteLength
    );
  }
}
