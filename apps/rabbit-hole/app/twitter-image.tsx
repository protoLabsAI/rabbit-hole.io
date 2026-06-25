// Twitter's `summary_large_image` card uses the same 1200×630 ratio as Open
// Graph, so we share one source. Re-exporting keeps the preview identical
// across platforms; split this into its own template only if Twitter needs a
// different crop.
export { default, alt, size, contentType } from "./opengraph-image";
