/**
 * Avatar Stack Component
 *
 * Displays a stack of user avatars for showing active participants
 * in collaboration sessions. Based on shadcn collaborative canvas example.
 */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export interface AvatarStackUser {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

export interface AvatarStackProps {
  users: AvatarStackUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const defaultColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-orange-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorForUser(userId: string, color?: string): string {
  if (color) return color;
  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

export function AvatarStack({
  users,
  max = 3,
  size = "md",
  className,
}: AvatarStackProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border-2 border-background text-white font-medium ring-2 ring-background",
            sizeClasses[size],
            getColorForUser(user.id, user.color)
          )}
          title={user.name}
          style={{
            zIndex: visibleUsers.length - index,
          }}
        >
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{getInitials(user.name)}</span>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground font-medium ring-2 ring-background",
            sizeClasses[size]
          )}
          title={`${remainingCount} more`}
          style={{
            zIndex: 0,
          }}
        >
          <span>+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}
