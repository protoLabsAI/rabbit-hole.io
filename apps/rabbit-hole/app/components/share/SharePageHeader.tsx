/**
 * Share Page Header Component
 *
 * Displays the title, description, and view count for shared timeline pages.
 * Uses shadcn UI components for consistent styling.
 */

import React from "react";

import type { SharePageData } from "@proto/types";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@proto/ui/atoms";

interface SharePageHeaderProps {
  shareData: SharePageData;
  className?: string;
  additionalBadges?: React.ReactElement[];
}

export function SharePageHeader({
  shareData,
  className = "",
  additionalBadges = [],
}: SharePageHeaderProps) {
  const displayTitle = shareData.title || `Timeline: ${shareData.entityUid}`;
  const timeWindow = shareData.parameters.timeWindow;

  return (
    <Card className={`border-0 shadow-none bg-transparent ${className}`}>
      <CardHeader className="px-0 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              {displayTitle}
            </CardTitle>

            {shareData.description && (
              <CardDescription className="text-base text-gray-600 leading-relaxed">
                {shareData.description}
              </CardDescription>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge variant="secondary" className="text-xs">
                {shareData.shareType}
              </Badge>

              {timeWindow && (
                <Badge variant="outline" className="text-xs">
                  {timeWindow.from} to {timeWindow.to}
                </Badge>
              )}

              {shareData.parameters.granularity && (
                <Badge variant="outline" className="text-xs">
                  {shareData.parameters.granularity} granularity
                </Badge>
              )}

              {/* Additional badges from props */}
              {additionalBadges.map((badge, index) => (
                <React.Fragment key={index}>{badge}</React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end text-sm text-gray-500 ml-4">
            {shareData.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>{shareData.viewCount} views</span>
              </div>
            )}

            <div className="text-xs text-gray-400 mt-1">
              Entity: {shareData.entityUid}
            </div>
          </div>
        </div>
      </CardHeader>

      <Separator className="mb-6" />
    </Card>
  );
}
