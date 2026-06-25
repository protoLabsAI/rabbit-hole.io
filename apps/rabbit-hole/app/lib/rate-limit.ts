/**
 * Tiny in-memory IP rate limiter for the public BYOK demo.
 *
 * Runs in the Node runtime (called from route handlers, not edge middleware),
 * so a module-level Map persists for the process lifetime on a single
 * self-hosted node — good enough for a homelab demo. Scale-out would need a
 * shared store (Postgres/Redis); not needed here.
 *
 * OPT-IN: enforcement only happens when RH_RATE_LIMIT_ENABLED=true, so normal
 * single-user self-hosts are unaffected. Tune with RH_RATE_LIMIT_MAX (default
 * 30) and RH_RATE_LIMIT_WINDOW_S (default 300).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const ENABLED = process.env.RH_RATE_LIMIT_ENABLED === "true";
const MAX = Number(process.env.RH_RATE_LIMIT_MAX ?? 30);
const WINDOW_MS = Number(process.env.RH_RATE_LIMIT_WINDOW_S ?? 300) * 1000;

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  resetAt: number;
  /** Seconds until reset — for a Retry-After header. */
  retryAfter: number;
}

/** Best-effort client IP, honoring Cloudflare's forwarded headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Record a hit for `key` and report whether it's within the limit. */
export function rateLimit(
  key: string,
  max = MAX,
  windowMs = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const allow = (remaining: number, resetAt: number): RateLimitResult => ({
    ok: true,
    limit: max,
    remaining,
    resetAt,
    retryAfter: 0,
  });

  // Disabled → always allow (no enforcement for normal self-host).
  if (!ENABLED) return allow(max, now + windowMs);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return allow(max - 1, now + windowMs);
  }

  if (bucket.count >= max) {
    return {
      ok: false,
      limit: max,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return allow(max - bucket.count, bucket.resetAt);
}
