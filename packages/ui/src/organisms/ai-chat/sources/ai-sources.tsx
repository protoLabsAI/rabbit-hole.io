/**
 * AI Sources Component
 *
 * Expandable source citations for AI response transparency
 * Shows reference links with automatic counting
 */

"use client";

import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../atoms/collapsible";
import { Icon } from "../../../atoms/icon";
import { cn } from "../../../lib/utils";

interface Source {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  type?: string;
}

interface SourcesProps extends React.HTMLAttributes<HTMLDivElement> {
  sources: Source[];
  defaultOpen?: boolean;
}

const Sources = React.forwardRef<HTMLDivElement, SourcesProps>(
  ({ className, defaultOpen = false, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
      <Collapsible
        ref={ref}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
          "border border-border rounded-lg overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    );
  }
);
Sources.displayName = "Sources";

interface SourcesTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  count?: number;
  label?: string;
}

const SourcesTrigger = React.forwardRef<HTMLButtonElement, SourcesTriggerProps>(
  ({ className, count, label, ...props }, ref) => {
    const displayLabel =
      label ||
      (count ? `Used ${count} source${count !== 1 ? "s" : ""}` : "Sources");

    return (
      <CollapsibleTrigger
        ref={ref}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors group",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <Icon name="file-text" size={16} className="text-primary" />
          <span>{displayLabel}</span>
        </div>
        <Icon
          name="chevron-down"
          size={16}
          className="transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
    );
  }
);
SourcesTrigger.displayName = "SourcesTrigger";

const SourcesContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <CollapsibleContent
      ref={ref}
      className={cn("border-t border-border", className)}
    >
      <div className="p-4 space-y-3" {...props}>
        {children}
      </div>
    </CollapsibleContent>
  );
});
SourcesContent.displayName = "SourcesContent";

interface SourceItemProps extends React.HTMLAttributes<HTMLDivElement> {
  source: Source;
}

const SourceItem = React.forwardRef<HTMLDivElement, SourceItemProps>(
  ({ className, source, ...props }, ref) => {
    if (source.url) {
      return (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block p-3 rounded-md border border-border hover:bg-muted/50 transition-colors group cursor-pointer",
            className
          )}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {source.title}
                </h4>
                <Icon
                  name="external-link"
                  size={12}
                  className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors"
                />
              </div>
              {source.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {source.snippet}
                </p>
              )}
              {source.type && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-muted rounded-md text-muted-foreground">
                  {source.type}
                </span>
              )}
            </div>
          </div>
        </a>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("block p-3 rounded-md border border-border", className)}
        {...props}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-foreground truncate">
                {source.title}
              </h4>
            </div>
            {source.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {source.snippet}
              </p>
            )}
            {source.type && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-muted rounded-md text-muted-foreground">
                {source.type}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
SourceItem.displayName = "SourceItem";

export { Sources, SourcesTrigger, SourcesContent, SourceItem, type Source };
