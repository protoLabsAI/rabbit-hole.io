#!/usr/bin/env node

/**
 * Generate all favicon/icon/PWA assets from the source SVG.
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Requires: sharp (available via next dependency)
 *
 * Generates:
 *   public/favicon.ico          — 32x32 ICO for browsers
 *   public/favicon.svg          — SVG favicon (modern browsers)
 *   public/apple-touch-icon.png — 180x180 for iOS
 *   public/icons/icon-{size}.png — PWA icons at standard sizes
 *   public/og-image.png         — 1200x630 Open Graph image
 */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const SOURCE_SVG = join(PUBLIC, "rabbit-hole.svg");

const ICON_SIZES = [16, 32, 48, 64, 128, 192, 256, 512, 1024];
const BG_COLOR = { r: 248, g: 247, b: 244, alpha: 1 }; // #F8F7F4 warm off-white

async function generateIcons() {
  console.log("Generating icons from rabbit-hole.svg...\n");

  const svgBuffer = readFileSync(SOURCE_SVG);

  // ── PNG icons at all standard sizes ─────────────────────────────
  for (const size of ICON_SIZES) {
    const outPath = join(PUBLIC, "icons", `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: BG_COLOR })
      .png()
      .toFile(outPath);
    console.log(`  icon-${size}.png`);
  }

  // ── Maskable icon (512 with padding) ────────────────────────────
  const maskablePath = join(PUBLIC, "icons", "icon-512-maskable.png");
  await sharp(svgBuffer)
    .resize(410, 410, { fit: "contain", background: BG_COLOR })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: BG_COLOR,
    })
    .png()
    .toFile(maskablePath);
  console.log("  icon-512-maskable.png");

  // ── Apple Touch Icon (180x180) ──────────────────────────────────
  const applePath = join(PUBLIC, "apple-touch-icon.png");
  await sharp(svgBuffer)
    .resize(180, 180, { fit: "contain", background: BG_COLOR })
    .png()
    .toFile(applePath);
  console.log("  apple-touch-icon.png");

  // ── Favicon ICO (32x32 PNG wrapped — modern browsers accept PNG) ─
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32, { fit: "contain", background: BG_COLOR })
    .png()
    .toBuffer();
  // Write as .ico (single-image ICO = PNG with ICO header)
  writeFileSync(join(PUBLIC, "favicon.ico"), createIco(favicon32, 32));
  console.log("  favicon.ico");

  // ── Favicon SVG (copy source, modern browsers prefer this) ──────
  copyFileSync(SOURCE_SVG, join(PUBLIC, "favicon.svg"));
  console.log("  favicon.svg");

  // ── Open Graph image (1200x630) ─────────────────────────────────
  const ogPath = join(PUBLIC, "og-image.png");
  const iconForOg = await sharp(svgBuffer)
    .resize(400, 400, { fit: "contain", background: BG_COLOR })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      {
        input: iconForOg,
        top: 115,
        left: 400,
      },
    ])
    .png()
    .toFile(ogPath);
  console.log("  og-image.png");

  console.log("\nDone! All icons generated.");
}

/**
 * Create a minimal single-image ICO file from a PNG buffer.
 * ICO format: 6-byte header + 16-byte directory entry + PNG data.
 */
function createIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image size
  entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

generateIcons().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
