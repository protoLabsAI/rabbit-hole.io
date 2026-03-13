/**
 * Dialog History Navigation Component
 *
 * Provides back/forward navigation controls and history breadcrumbs
 * for the dialog system.
 */

"use client";

import React from "react";

// Stub hook - local implementation
function useDialogHistory() {
  return {
    canGoBack: false,
    canGoForward: false,
    currentIndex: 0,
    items: [] as Array<{ id: string; title: string }>,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    goBack: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    goForward: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    goToItem: (_index: number) => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    clearHistory: () => {},
    isEmpty: true,
  };
}

interface DialogHistoryNavigationProps {
  className?: string;
  showBreadcrumbs?: boolean;
  maxBreadcrumbs?: number;
}

/**
 * Dialog navigation controls with optional breadcrumb display
 *
 * Features:
 * - Back/Forward buttons with keyboard shortcuts
 * - Breadcrumb navigation showing dialog history
 * - Current dialog indicator
 * - Clear history option
 */
export function DialogHistoryNavigation({
  className = "",
  showBreadcrumbs = true,
  maxBreadcrumbs = 5,
}: DialogHistoryNavigationProps) {
  const {
    canGoBack,
    canGoForward,
    currentIndex,
    items,
    goBack,
    goForward,
    goToItem,
    clearHistory,
    isEmpty,
  } = useDialogHistory();

  if (isEmpty) {
    return null;
  }

  // Calculate visible breadcrumbs
  const visibleItems = showBreadcrumbs
    ? items.slice(Math.max(0, items.length - maxBreadcrumbs))
    : [];
  const startIndex = Math.max(0, items.length - maxBreadcrumbs);

  return (
    <div className={`dialog-history-navigation ${className}`}>
      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className={`
            px-3 py-1 text-sm rounded border transition-colors
            ${
              canGoBack
                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                : "bg-muted border-border text-muted-foreground cursor-not-allowed"
            }
          `}
          title="Go back (Alt+Left)"
          aria-label="Navigate to previous dialog"
        >
          ← Back
        </button>

        <button
          onClick={goForward}
          disabled={!canGoForward}
          className={`
            px-3 py-1 text-sm rounded border transition-colors
            ${
              canGoForward
                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                : "bg-muted border-border text-muted-foreground cursor-not-allowed"
            }
          `}
          title="Go forward (Alt+Right)"
          aria-label="Navigate to next dialog"
        >
          Forward →
        </button>

        <div className="w-px h-6 bg-border mx-2" />

        <button
          onClick={clearHistory}
          className="
            px-2 py-1 text-xs text-muted-foreground hover:text-foreground
            border border-border rounded hover:bg-accent
            transition-colors
          "
          title="Clear dialog history"
          aria-label="Clear navigation history"
        >
          Clear
        </button>
      </div>

      {/* Breadcrumbs */}
      {showBreadcrumbs && visibleItems.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">History:</span>

          {startIndex > 0 && (
            <>
              <span className="text-muted-foreground/60">...</span>
              <span className="text-border">→</span>
            </>
          )}

          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const isCurrent = actualIndex === currentIndex;

            return (
              <React.Fragment key={item.id}>
                {index > 0 && (
                  <span key={`arrow-${item.id}`} className="text-border">
                    →
                  </span>
                )}

                <button
                  onClick={() => goToItem(actualIndex)}
                  className={`
                    px-2 py-1 rounded text-xs transition-colors
                    ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }
                  `}
                  title={`Go to: ${item.title}`}
                >
                  {item.title.length > 20
                    ? `${item.title.substring(0, 20)}...`
                    : item.title}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Keyboard shortcuts info */}
      <div className="mt-2 text-xs text-muted-foreground/60">
        Use Alt+← / Alt+→ for keyboard navigation
      </div>
    </div>
  );
}

/**
 * Compact version of dialog navigation (just back/forward buttons)
 */
export function CompactDialogNavigation({
  className = "",
}: {
  className?: string;
}) {
  const { canGoBack, canGoForward, goBack, goForward, isEmpty } =
    useDialogHistory();

  if (isEmpty) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className={`
          p-1 rounded transition-colors
          ${
            canGoBack
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/30 cursor-not-allowed"
          }
        `}
        title="Previous dialog (Alt+Left)"
        aria-label="Go back"
      >
        ←
      </button>

      <button
        onClick={goForward}
        disabled={!canGoForward}
        className={`
          p-1 rounded transition-colors
          ${
            canGoForward
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/30 cursor-not-allowed"
          }
        `}
        title="Next dialog (Alt+Right)"
        aria-label="Go forward"
      >
        →
      </button>
    </div>
  );
}

// Keyboard shortcut handler hook
export function useDialogNavigationShortcuts() {
  const { canGoBack, canGoForward, goBack, goForward } = useDialogHistory();

  React.useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Alt + Left Arrow - Go back
      if (event.altKey && event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        goBack();
      }

      // Alt + Right Arrow - Go forward
      if (event.altKey && event.key === "ArrowRight" && canGoForward) {
        event.preventDefault();
        goForward();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [canGoBack, canGoForward, goBack, goForward]);
}
