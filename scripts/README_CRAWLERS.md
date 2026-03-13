# Portfolio Image Crawler Scripts

## crawl-portfolio-images.ts

Download all images from photography portfolio pages for archival or reference.

### Usage

```bash
pnpm tsx scripts/crawl-portfolio-images.ts <url> [output-dir]
```

### Examples

```bash
# Torin Stephens portfolio
pnpm tsx scripts/crawl-portfolio-images.ts \
  https://torinstephens.com/index.php/thecollectedlives/ \
  ./output/portfolio-torin-stephens

# Generic portfolio
pnpm tsx scripts/crawl-portfolio-images.ts \
  https://example.com/gallery \
  ./output/my-gallery
```

### Features

- ✅ Extracts image URLs from `alt` attributes (full-res paths)
- ✅ Handles filenames with spaces (URL-encoded)
- ✅ Converts thumbnail URLs to full-resolution (removes `th-N_` prefix)
- ✅ Normalizes malformed URLs (`:443` in http)
- ✅ Skips existing files (resume-capable)
- ✅ Rate-limited (500ms delay between requests)
- ✅ Progress logging with emoji indicators
- ✅ Error handling and retry-friendly

### Output

Images saved to specified directory with original filenames (full-resolution):
```
output/portfolio-torin-stephens/
├── rdx_1_v2.jpg    (842KB)
├── rdx_2_v2.jpg    (736KB)
├── rdx_3_v2.jpg    (825KB)
└── ... (40 total, ~31MB)
```

**Note:** Script automatically converts thumbnail URLs (`th-6_rdx_1.jpg`) to full-resolution (`rdx_1.jpg`).

### Supported Formats

- JPEG/JPG
- PNG
- WebP
- AVIF

### Example Results

**Torin Stephens Portfolio:**

```bash
# The Collected Lives of Katy Ebbert (main gallery)
pnpm tsx scripts/crawl-portfolio-images.ts \
  https://torinstephens.com/index.php/thecollectedlives/ \
  ./output/portfolio-collected-lives
# Result: 40 images, 31MB, 1200×960px avg

# 20 Years, 36 Homes (subgallery)
pnpm tsx scripts/crawl-portfolio-images.ts \
  https://torinstephens.com/index.php/thecollectedlives/20-years-36-homes/ \
  ./output/portfolio-20-years-36-homes
# Result: 26 images, 4.1MB, 622×501px avg (intentionally smaller format)

# Searching for Coyotes
pnpm tsx scripts/crawl-portfolio-images.ts \
  https://torinstephens.com/index.php/searching-for-coyotes/ \
  ./output/portfolio-coyotes
# Result: 38 images, 28MB, 1126×900px avg

# TOTAL: 104 images, 63.1MB
```

### Notes

- Script respects the origin server (500ms delay between downloads)
- Use downloaded images per the original site's license/terms
- Images saved in original format (no conversion)
- Handles filenames with spaces (saved with URL encoding, e.g., `mom%20reading.jpg`)
- For Next.js usage, see `.cursor/rules/curious-minds-image-optimization.mdc`

---

## All Torin Stephens Images Downloaded ✅

**Total:** 104 images, 63.1MB

To use these images in the portfolio site, see:
- `/apps/torin-stephens/PORTFOLIO_BUILD_HANDOFF.md` - Complete build guide
- `/apps/torin-stephens/QUICK_START.md` - Quick reference

---

**Related:** Image optimization standards in `.cursor/rules/image-optimization.mdc`

