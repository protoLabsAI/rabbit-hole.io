/**
 * Shared type definitions for Server Actions
 *
 * All Server Actions should return ActionResult<T> for consistent error handling
 * across the application and integration with React Query.
 */

/**
 * Standard result type for Server Actions
 *
 * @template T - The success data type
 *
 * @example Success
 * ```typescript
 * return {
 *   data: { sessionId: "123" },
 *   status: 200
 * };
 * ```
 *
 * @example Error
 * ```typescript
 * return {
 *   error: "Unauthorized",
 *   status: 401
 * };
 * ```
 *
 * @example Tier Limit
 * ```typescript
 * return {
 *   error: "Collaboration requires Basic tier",
 *   limitType: "maxActiveSessions",
 *   tier: "free",
 *   upgradeUrl: "/pricing",
 *   status: 402
 * };
 * ```
 */
export type ActionResult<T = unknown> =
  | {
      data: T;
      status: 200 | 201;
      error?: never;
    }
  | {
      error: string;
      status: 400 | 401 | 403 | 404 | 409 | 500;
      data?: never;
      limitType?: never;
      tier?: never;
      upgradeUrl?: never;
    }
  | {
      error: string;
      limitType: string;
      tier: string;
      upgradeUrl: string;
      status: 402;
      data?: never;
    };

/**
 * Type guard to check if ActionResult is successful
 */
export function isActionSuccess<T>(
  result: ActionResult<T>
): result is { data: T; status: 200 | 201 } {
  return result.status >= 200 && result.status < 300;
}

/**
 * Type guard to check if ActionResult is a tier limit error
 */
export function isActionTierLimit(result: ActionResult<any>): result is {
  error: string;
  limitType: string;
  tier: string;
  upgradeUrl: string;
  status: 402;
} {
  return result.status === 402;
}
