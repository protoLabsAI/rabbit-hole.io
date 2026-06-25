import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_OG_LEDE, SITE_TAGLINE } from "./_lib/site-config";

/**
 * Open Graph image for the site root — applies to every route that doesn't
 * declare its own `opengraph-image`. Next.js renders this at build time
 * (static `/`) and serves it at `/opengraph-image.png`, auto-injecting the
 * URL into `<head>`, so there's no static PNG to keep in sync with the copy.
 *
 * The visual is the brand's literary identity: the hat-rabbit mark, the
 * tagline, and a one-line value-prop on warm off-white. Copy is imported from
 * `_lib/site-config` so the preview never drifts from the live page.
 *
 * Verified render: a satori render of this exact markup + fonts was checked
 * visually before shipping (matches `/opengraph-image.png` 1:1).
 */

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F8F7F4";
const INK = "#1C1C1E";
const MUTED = "#5b5b5e";
const FAINT = "#9ca3af";
const EYEBROW = "#6b7280";

const asset = (p: string) => readFile(join(process.cwd(), "public", p));

export default async function OpengraphImage() {
  const [inter400, inter600, mark] = await Promise.all([
    asset("fonts/inter-latin-400-normal.woff"),
    asset("fonts/inter-latin-600-normal.woff"),
    asset("og/rabbit-mark.png"),
  ]);
  const markUri = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: INK,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* faint oversized watermark for depth */}
        <img
          src={markUri}
          width={470}
          height={470}
          style={{ position: "absolute", right: -50, bottom: -80, opacity: 0.05 }}
        />

        {/* mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={markUri} width={74} height={74} />
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginLeft: 22,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        {/* tagline + rule + value-prop */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              width: 96,
              height: 4,
              background: INK,
              borderRadius: 2,
              marginTop: 26,
              marginBottom: 26,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 33,
              fontWeight: 400,
              lineHeight: 1.35,
              color: MUTED,
              maxWidth: 780,
            }}
          >
            {SITE_OG_LEDE}
          </div>
        </div>

        {/* eyebrow + url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 23,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: EYEBROW,
            }}
          >
            open source&nbsp;&nbsp;·&nbsp;&nbsp;self-hostable&nbsp;&nbsp;·&nbsp;&nbsp;byok
          </div>
          <div style={{ display: "flex", fontSize: 23, fontWeight: 500, color: FAINT }}>
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
      ],
    }
  );
}
