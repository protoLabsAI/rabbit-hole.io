/**
 * Portfolio Image Crawler
 *
 * Downloads all images from a photography portfolio page
 * Usage: pnpm tsx scripts/crawl-portfolio-images.ts <url> [output-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";

interface CrawlOptions {
  url: string;
  outputDir: string;
  verbose?: boolean;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.promises.writeFile(filepath, buffer);
}

async function crawlPortfolioImages(options: CrawlOptions): Promise<void> {
  const { url, outputDir, verbose = true } = options;

  if (verbose) {
    console.log(`📸 Crawling portfolio: ${url}`);
    console.log(`💾 Output directory: ${outputDir}\n`);
  }

  // Ensure output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Fetch the page HTML
  if (verbose) console.log("🌐 Fetching page...");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
  }

  const html = await response.text();

  // Extract all image URLs from alt attributes (full-res) and src (thumbnails)
  // Pattern 1: alt='http://torinstephens.com:443/files/gimgs/filename.jpg'
  const altPattern =
    /alt=['"]([^'"]+\/files\/gimgs\/[^'"]+\.(jpg|jpeg|png|webp|avif))['"]?/gi;
  const altMatches = [...html.matchAll(altPattern)].map((m) => m[1]);

  // Pattern 2: Direct image URLs in HTML
  const directPattern =
    /https?:\/\/[^"'\s]+\/files\/gimgs\/[^"'\s]+\.(jpg|jpeg|png|webp|avif)/gi;
  const directUrls = html.match(directPattern) || [];

  const allUrls = [...altMatches, ...directUrls];

  // Normalize URLs and convert thumbnails to full-size
  const imageUrls = [
    ...new Set(
      allUrls.map((url) => {
        // Fix malformed URLs with :443 on http
        let normalized = url.replace(
          "http://torinstephens.com:443",
          "http://torinstephens.com"
        );

        // Convert thumbnails (th-N_) to full-size images
        // th-6_rdx_1.jpg → rdx_1.jpg (remove th-N_ prefix)
        normalized = normalized.replace(/\/th-\d+_/g, "/");

        return normalized;
      })
    ),
  ];

  if (imageUrls.length === 0) {
    console.error("❌ No images found on page");
    return;
  }

  if (verbose) {
    console.log(`✅ Found ${imageUrls.length} unique images\n`);
  }

  // Download each image
  let downloaded = 0;
  let failed = 0;

  for (const imageUrl of imageUrls) {
    try {
      const filename = path.basename(new URL(imageUrl).pathname);
      const filepath = path.join(outputDir, filename);

      // Skip if already exists
      if (fs.existsSync(filepath)) {
        if (verbose) console.log(`⏭️  Skip (exists): ${filename}`);
        continue;
      }

      if (verbose) console.log(`⬇️  Downloading: ${filename}`);
      await downloadImage(imageUrl, filepath);
      downloaded++;

      // Rate limiting - be polite to server
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      console.error(
        `❌ Failed: ${imageUrl}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (verbose) {
    console.log(`\n✅ Complete!`);
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${imageUrls.length - downloaded - failed}`);
    console.log(`   Total: ${imageUrls.length}`);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
Usage: pnpm tsx scripts/crawl-portfolio-images.ts <url> [output-dir]

Examples:
  pnpm tsx scripts/crawl-portfolio-images.ts https://torinstephens.com/index.php/thecollectedlives/
  pnpm tsx scripts/crawl-portfolio-images.ts https://example.com/gallery ./downloads/gallery

Options:
  <url>         Portfolio page URL to crawl
  [output-dir]  Output directory (default: ./output/portfolio-images)
    `);
    process.exit(1);
  }

  const url = args[0];
  const outputDir = args[1] || "./output/portfolio-images";

  try {
    await crawlPortfolioImages({ url, outputDir, verbose: true });
  } catch (error) {
    console.error(
      "\n❌ Crawl failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
