/**
 * Playground Loading Skeleton
 *
 * Loading state UI for playground components
 */

interface PlaygroundLoadingSkeletonProps {
  /**
   * Minimum height for the loading container
   * @default "min-h-[600px]"
   */
  minHeight?: string;
  /**
   * Additional class names to apply to the container
   */
  className?: string;
}

export function PlaygroundLoadingSkeleton({
  minHeight = "min-h-[600px]",
  className = "",
}: PlaygroundLoadingSkeletonProps = {}) {
  return (
    <div
      className={`flex items-center justify-center h-full ${minHeight} ${className}`.trim()}
    >
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Loading playground...</p>
          <p className="text-xs text-muted-foreground">
            This may take a moment
          </p>
        </div>
      </div>
    </div>
  );
}
