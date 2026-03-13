/**
 * Share Page Error States Components
 *
 * Reusable error state components for various share page failure modes:
 * - Expired tokens
 * - Revoked tokens
 * - Not found tokens
 * - Generic errors
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";

interface SharePageErrorProps {
  className?: string;
  onRetry?: () => void;
  showDevelopmentDetails?: boolean;
  error?: Error;
}

/**
 * Expired Token Error State
 * Shown when a share token has passed its expiration date
 */
export function ExpiredTokenError({
  className = "",
  onRetry,
}: SharePageErrorProps) {
  return (
    <div
      className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}
    >
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Link Expired
            <Badge variant="destructive" className="text-xs">
              Expired
            </Badge>
          </CardTitle>
          <CardDescription>
            This shared timeline link has expired and is no longer accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Please contact the person who shared this link with you to request a
            new one.
          </p>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            )}
            <Button asChild className="w-full">
              <a
                href="https://rabbit-hole.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Rabbit Hole
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Revoked Token Error State
 * Shown when a share token has been manually revoked by the owner
 */
export function RevokedTokenError({
  className = "",
  onRetry,
}: SharePageErrorProps) {
  return (
    <div
      className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}
    >
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
              />
            </svg>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Access Revoked
            <Badge variant="secondary" className="text-xs">
              Revoked
            </Badge>
          </CardTitle>
          <CardDescription>
            This shared timeline link has been revoked and is no longer
            accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            The owner has disabled sharing for this content. Access cannot be
            restored.
          </p>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            )}
            <Button asChild className="w-full">
              <a
                href="https://rabbit-hole.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Rabbit Hole
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Not Found Error State
 * Shown when a share token doesn't exist in the database
 */
export function NotFoundError({
  className = "",
  onRetry,
}: SharePageErrorProps) {
  return (
    <div
      className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}
    >
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.172a8 8 0 11-5.172-5.172"
              />
            </svg>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Timeline Not Found
            <Badge variant="outline" className="text-xs">
              404
            </Badge>
          </CardTitle>
          <CardDescription>
            The shared timeline link you&rsquo;re looking for doesn&rsquo;t
            exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This link may be incorrect, or the timeline may have been deleted.
            Please check the URL and try again.
          </p>
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            )}
            <Button asChild className="w-full">
              <a
                href="https://rabbit-hole.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Rabbit Hole
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generic Error State
 * Shown for unexpected errors during share page rendering
 */
export function GenericError({
  className = "",
  onRetry,
  showDevelopmentDetails = false,
  error,
}: SharePageErrorProps) {
  return (
    <div
      className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}
    >
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Something Went Wrong
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          </CardTitle>
          <CardDescription>
            We encountered an error while loading this shared timeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This might be a temporary issue. Please try again in a moment.
          </p>

          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                Try Again
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <a
                href="https://rabbit-hole.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Rabbit Hole
              </a>
            </Button>
          </div>

          {/* Development Error Details */}
          {showDevelopmentDetails && error && (
            <details className="text-left mt-6">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error details (development only)
              </summary>
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 overflow-auto">
                <div className="font-semibold mb-1">Error Message:</div>
                <div className="mb-2">{error.message}</div>
                {error.stack && (
                  <>
                    <div className="font-semibold mb-1">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
