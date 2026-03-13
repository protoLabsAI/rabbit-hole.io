/**
 * Collaboration Settings Panel
 *
 * User preferences for workspace collaboration features.
 */

"use client";

import { Icon } from "@proto/icon-system";

import { useCollaborationSettings } from "@/hooks/useCollaborationSettings";

export function CollaborationSettingsPanel() {
  const settings = useCollaborationSettings();

  return (
    <div className="p-4 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="settings" size={20} />
          Collaboration Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure offline mode, presence, and sync behavior.
        </p>
      </div>

      {/* Connection Settings */}
      <section>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Icon name="wifi-off" size={16} />
          Connection
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Show Connection Status</span>
            <input
              type="checkbox"
              checked={settings.showConnectionStatus}
              onChange={(e) =>
                settings.setShowConnectionStatus(e.target.checked)
              }
              className="w-4 h-4"
            />
          </label>
        </div>
      </section>

      {/* Presence Settings */}
      <section>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Icon name="eye" size={16} />
          Presence & Awareness
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Show Other Users&apos; Cursors</span>
            <input
              type="checkbox"
              checked={settings.showPresence}
              onChange={(e) => settings.setShowPresence(e.target.checked)}
              className="w-4 h-4"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Show Who&apos;s Following You</span>
            <input
              type="checkbox"
              checked={settings.showFollowers}
              onChange={(e) => settings.setShowFollowers(e.target.checked)}
              className="w-4 h-4"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-Follow on Join</span>
            <input
              type="checkbox"
              checked={settings.autoFollowMode}
              onChange={(e) => settings.setAutoFollowMode(e.target.checked)}
              className="w-4 h-4"
            />
          </label>
        </div>
      </section>

      {/* Sync Settings */}
      <section>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Icon name="clock" size={16} />
          Sync Behavior
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-2">
              Sync Debounce: {settings.syncDebounceMs}ms
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={settings.syncDebounceMs}
              onChange={(e) => settings.setSyncDebounce(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How long to wait before syncing changes (lower = faster, more
              traffic)
            </p>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-Save to IndexedDB</span>
            <input
              type="checkbox"
              checked={settings.autoSaveEnabled}
              onChange={(e) => settings.setAutoSave(e.target.checked)}
              className="w-4 h-4"
            />
          </label>
        </div>
      </section>

      {/* Storage Settings */}
      <section>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Icon name="hard-drive" size={16} />
          Storage Management
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-2">
              Auto-Cleanup After:{" "}
              {settings.autoCleanupDays === 0
                ? "Never"
                : `${settings.autoCleanupDays} days`}
            </label>
            <input
              type="range"
              min="0"
              max="180"
              step="30"
              value={settings.autoCleanupDays}
              onChange={(e) =>
                settings.setAutoCleanupDays(Number(e.target.value))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Automatically remove old workspaces from IndexedDB
            </p>
          </div>
          <div>
            <label className="text-sm block mb-2">
              Storage Warning Threshold: {settings.warnAtStoragePercent}%
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={settings.warnAtStoragePercent}
              onChange={(e) =>
                settings.setWarnAtStoragePercent(Number(e.target.value))
              }
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Developer Settings */}
      {process.env.NODE_ENV === "development" && (
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Icon name="file-text" size={16} />
            Developer
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Show Dev Tools</span>
              <input
                type="checkbox"
                checked={settings.showDevTools}
                onChange={(e) => settings.setShowDevTools(e.target.checked)}
                className="w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Verbose Logging</span>
              <input
                type="checkbox"
                checked={settings.verboseLogging}
                onChange={(e) => settings.setVerboseLogging(e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="pt-4 border-t">
        <button
          onClick={settings.resetToDefaults}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
