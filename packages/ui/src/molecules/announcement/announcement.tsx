import * as React from "react";

import { cn } from "../../lib/utils";

const Announcement = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:bg-accent",
      className
    )}
    {...props}
  />
));
Announcement.displayName = "Announcement";

const AnnouncementTag = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground",
      className
    )}
    {...props}
  />
));
AnnouncementTag.displayName = "AnnouncementTag";

const AnnouncementTitle = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("font-medium text-foreground", className)}
    {...props}
  />
));
AnnouncementTitle.displayName = "AnnouncementTitle";

export { Announcement, AnnouncementTag, AnnouncementTitle };
