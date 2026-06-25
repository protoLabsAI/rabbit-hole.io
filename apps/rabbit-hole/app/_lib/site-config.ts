/**
 * Single source of truth for site identity — consumed by `layout.tsx`
 * (metadata + JSON-LD), the dynamic `opengraph-image.tsx` / `twitter-image.tsx`,
 * `robots.ts`, and `sitemap.ts`. Keeps copy from drifting between the social
 * preview and the live <head>.
 */

/** Canonical origin, no trailing slash. Override per-env with NEXT_PUBLIC_BASE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://rabbit-hole.io"
).replace(/\/+$/, "");

export const SITE_NAME = "rabbit-hole.io";

/** Brand line (poetic). Mirrors the prod theme branding tagline. */
export const SITE_TAGLINE = "Alice was on to something";

/** <title> default — descriptive for SEO; template applied to nested routes. */
export const SITE_TITLE = "rabbit-hole.io — AI search across the web & your files";

/** Meta description — descriptive, keyword-bearing, ~1–2 sentences. */
export const SITE_DESCRIPTION =
  "rabbit-hole.io is an open-source, self-hostable AI search engine over the open web and your own files. Bring your own key, no walled garden.";

/** Tight value-prop rendered on the 1200×630 OG image. */
export const SITE_OG_LEDE =
  "AI search across the open web and your own files — self-hostable, no walled garden.";

export const SITE_KEYWORDS = [
  "AI search",
  "AI search engine",
  "self-hosted search",
  "open source search engine",
  "perplexity alternative",
  "semantic search",
  "retrieval augmented generation",
  "RAG",
  "bring your own key",
  "rabbit-hole",
];

/** Org handle (shared across proto properties). Override per-env with NEXT_PUBLIC_TWITTER_HANDLE. */
export const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@protoLabsAI";
