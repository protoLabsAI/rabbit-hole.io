"use client";

import { Icon } from "@proto/icon-system";

import { cn } from "@/lib/utils";

import type { UserPresence } from "../../types/workspace";

interface CollaborationPanelProps {
  users: Map<string, UserPresence>;
  currentUserId: string;
  followMode: {
    enabled: boolean;
    followingUserId: string | null;
  };
  onToggleFollow: (userId: string | null) => void;

  // Connection status
  ready: boolean;
  error?: string | null;
}

export function CollaborationPanel({
  users,
  currentUserId,
  followMode,
  onToggleFollow,
  ready,
  error,
}: CollaborationPanelProps) {
  const userArray = Array.from(users.values()).filter(
    (u) => u.userId !== currentUserId
  );

  return (
    <div className="absolute top-4 right-4 z-40 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 min-w-[200px]">
      {/* Connection Status */}
      <div className="mb-3 pb-2 border-b">
        <div className="flex items-center justify-between gap-2">
          {/* Status Indicator */}
          {error ? (
            <button
              className="flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs font-medium cursor-help"
              title={error}
            >
              <Icon name="x" size={12} />
              <span>Error</span>
            </button>
          ) : !ready ? (
            <button
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium cursor-default"
              title="Connecting to server"
            >
              <Icon name="loader" size={12} className="animate-spin" />
              <span>Connecting</span>
            </button>
          ) : (
            <button
              className="flex items-center gap-1.5 bg-success/90 text-success-foreground px-2 py-1 rounded text-xs font-medium cursor-help"
              title="Connected to server"
            >
              <Icon name="check" size={12} />
              <span>Synced</span>
            </button>
          )}
        </div>
      </div>

      {/* User Presence Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Icon name="users" size={16} />
        <span className="font-semibold text-sm">
          {userArray.length + 1} Online
        </span>
      </div>

      {/* Current user */}
      <div className="mb-2">
        <UserItem
          user={{
            userId: currentUserId,
            userName: "You",
            userColor: "#22c55e",
            lastSeen: Date.now(),
          }}
          isCurrentUser
          isFollowing={false}
          onToggleFollow={() => {}}
        />
      </div>

      {/* Other users */}
      {userArray.length > 0 ? (
        <div className="space-y-1">
          {userArray.map((user) => (
            <UserItem
              key={user.userId}
              user={user}
              isCurrentUser={false}
              isFollowing={followMode.followingUserId === user.userId}
              onToggleFollow={() => {
                if (followMode.followingUserId === user.userId) {
                  onToggleFollow(null);
                } else {
                  onToggleFollow(user.userId);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Icon name="user" size={32} className="mx-auto mb-2 opacity-50" />
          <p>No other users yet</p>
          <p className="text-xs mt-1">Share workspace link</p>
        </div>
      )}
    </div>
  );
}

interface UserItemProps {
  user: UserPresence;
  isCurrentUser: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

function UserItem({
  user,
  isCurrentUser,
  isFollowing,
  onToggleFollow,
}: UserItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors group">
      {/* User indicator */}
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: user.userColor }}
      />

      {/* User name */}
      <span className="text-sm flex-1 truncate">{user.userName}</span>

      {/* Follow button */}
      {!isCurrentUser && (
        <button
          onClick={onToggleFollow}
          className={cn(
            "p-1 rounded transition-colors opacity-0 group-hover:opacity-100",
            isFollowing
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
          title={isFollowing ? "Stop following" : "Follow user"}
        >
          {isFollowing ? (
            <Icon name="eye" size={12} />
          ) : (
            <Icon name="eye-off" size={12} />
          )}
        </button>
      )}
    </div>
  );
}
