"use client";

import { useState, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@proto/ui/atoms";
import type { VersionMetadata } from "@proto/yjs-history";
import {
  groupVersionsByDate,
  formatVersionTime,
  filterVersionsByTag,
  getUniqueTags,
} from "@proto/yjs-history";

import { useConfirmDialog } from "./ConfirmDialog";

interface VersionBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadVersion: (versionId: string) => Promise<void>;
  listVersions: () => Promise<VersionMetadata[]>;
}

export function VersionBrowserDialog({
  isOpen,
  onClose,
  onLoadVersion,
  listVersions,
}: VersionBrowserDialogProps) {
  const [versions, setVersions] = useState<VersionMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { confirm: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (!isOpen) return;

    const loadVersions = async () => {
      setLoading(true);
      try {
        const list = await listVersions();
        setVersions(list);
      } catch (error) {
        console.error("Failed to load versions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVersions();
  }, [isOpen, listVersions]);

  const filteredVersions = selectedTag
    ? filterVersionsByTag(versions, selectedTag)
    : versions;

  const groups = groupVersionsByDate(filteredVersions);
  const uniqueTags = getUniqueTags(versions);

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const handleRestore = async (versionId: string, versionName: string) => {
    const confirmed = await confirmDialog({
      title: `Restore to "${versionName}"?`,
      description:
        "This will replace your current workspace state with the saved version. It's recommended to export your workspace first as a backup.",
      confirmText: "Restore",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      await onLoadVersion(versionId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        {/* Tag Filters */}
        {uniqueTags.length > 0 && (
          <div className="flex gap-2 flex-wrap pb-4 border-b">
            <Button
              variant={selectedTag === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Button>
            {uniqueTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <Icon name="loader" size={24} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            {groups.map((group) => (
              <div key={group.date}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {version.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatVersionTime(version.timestamp)}
                        </div>
                        {version.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {version.description}
                          </div>
                        )}
                        {version.tags && version.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {version.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRestore(version.id, version.name)}
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        title="Restore workspace to this version"
                      >
                        <Icon name="rotate-ccw" size={14} className="mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Icon
                  name="inbox"
                  size={48}
                  className="mx-auto mb-4 opacity-50"
                />
                <p className="text-lg font-medium">No versions saved yet</p>
                <p className="text-sm mt-2">
                  Click the bookmark icon to save a version
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
