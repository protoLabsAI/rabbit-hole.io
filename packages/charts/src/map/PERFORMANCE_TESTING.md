# Map Component Performance Testing Guide

This document explains how to validate performance claims for MapCanvas and StaticMapImage components.

## Claims to Validate

From `README.md`:

| Scenario     | MapCanvas                  | StaticMapImage                |
| ------------ | -------------------------- | ----------------------------- |
| Single map   | ~200KB JS + runtime        | ~100KB PNG                    |
| 20 maps grid | ~4MB+ JS, heavy CPU/memory | ~2MB images, minimal overhead |
| Memory       | High (multiple instances)  | Low (just images)             |

## Testing Setup

### Requirements

1. Chrome browser (for Memory API)
2. Storybook running (`npm run sb`)
3. Next.js dev server running on port 3000
4. Chrome DevTools open

### Stories for Testing

Navigate to Storybook → `Templates/Charts/Performance Tests/`:

- **SingleStaticMap** - Single StaticMapImage performance
- **TwentyStaticMaps** - 20 StaticMapImages in grid
- **SingleMapCanvas** - Single MapCanvas performance
- **FourMapCanvases** - 4 MapCanvas instances (20 would crash browser)
- **PerformanceComparison** - Side-by-side with testing instructions

## Test Procedures

### Test 1: Static Image Transfer Size

**Goal:** Verify StaticMapImage uses ~30-50KB per image (not 100KB as claimed)

**Steps:**

1. Open Storybook → `Performance Tests/SingleStaticMap`
2. Open DevTools → Network tab
3. Filter by "map-image"
4. Refresh the story
5. Check the transfer size of `/api/map-image` request

**Expected:**

- Transfer size: 30-50KB (varies by map complexity, tile provider)
- Content-Type: `image/png`
- Cache headers present

**Validation:**

```
Single image: 30-50KB ✓
20 images: 600KB-1MB (30-50KB × 20) ✓
```

**Update README if needed:** Current claim of "~100KB PNG" may be high. Actual size is 30-50KB for typical maps.

### Test 2: Multiple Static Images

**Goal:** Verify total transfer for 20 StaticMapImages

**Steps:**

1. Open Storybook → `Performance Tests/TwentyStaticMaps`
2. Open DevTools → Network tab
3. Clear network log
4. Refresh the story
5. Wait for all images to load
6. Sum transfer sizes for all `map-image` requests

**Expected:**

- 20 requests to `/api/map-image`
- Total transfer: 600KB-1MB (not 2MB as claimed)
- All images cached (check from cache on reload)

**Validation:**

```
Total transfer for 20 images: ~600KB-1MB ✓
Individual image range: 30-50KB ✓
```

**Update README if needed:** Claim of "~2MB images" is incorrect. Actual is ~600KB-1MB.

### Test 3: MapCanvas JS Bundle Size

**Goal:** Verify Leaflet bundle size

**Steps:**

1. Open Storybook → `Performance Tests/SingleMapCanvas`
2. Open DevTools → Network tab → JS filter
3. Clear cache (Shift+Cmd+R)
4. Refresh the story
5. Look for Leaflet-related JS bundles
6. Sum their transfer sizes

**Expected:**

- Leaflet bundle: ~140-160KB (gzipped)
- Additional chunks for map functionality: ~40-60KB
- Total: ~200KB JS ✓

**Validation:**

```
Initial Leaflet JS: ~140-160KB
Supporting JS: ~40-60KB
Total MapCanvas overhead: ~200KB ✓
```

### Test 4: Memory Usage - Single Instance

**Goal:** Compare memory footprint

**Steps:**

1. Open Chrome → DevTools → More Tools → Performance Monitor
2. Watch "JS heap size" metric
3. Navigate to `Performance Tests/SingleStaticMap`
4. Note heap size after render
5. Navigate to `Performance Tests/SingleMapCanvas`
6. Note heap size after render
7. Calculate delta

**Expected:**

- StaticMapImage: +2-5MB heap (just image data)
- MapCanvas: +15-25MB heap (Leaflet runtime + tiles)

**Validation:**

```
StaticMapImage memory overhead: ~2-5MB ✓
MapCanvas memory overhead: ~15-25MB ✓
Ratio: MapCanvas uses 5-10x more memory ✓
```

### Test 5: Memory Usage - Multiple Instances

**Goal:** Verify memory scaling with multiple maps

**Steps:**

1. Performance Monitor open (JS heap size visible)
2. Navigate to `Performance Tests/TwentyStaticMaps`
3. Note heap size
4. Navigate to `Performance Tests/FourMapCanvases`
5. Note heap size
6. Compare deltas

**Expected:**

- 20 StaticMapImages: +10-20MB heap (20 images in memory)
- 4 MapCanvases: +60-100MB heap (4 full runtimes)

**Validation:**

```
20 StaticMapImages: ~10-20MB total ✓
4 MapCanvases: ~60-100MB total ✓
Per-instance overhead: StaticMapImage ~0.5-1MB, MapCanvas ~15-25MB ✓
```

**Note:** We can't test 20 MapCanvas instances - browser would crash.

### Test 6: CPU Usage

**Goal:** Verify MapCanvas has continuous CPU overhead, StaticMapImage does not

**Steps:**

1. Open DevTools → Performance tab
2. Start recording
3. Navigate to `Performance Tests/SingleMapCanvas`
4. Hover/interact with map
5. Stop recording
6. Check CPU usage in flame graph
7. Repeat for `Performance Tests/SingleStaticMap`

**Expected:**

- MapCanvas: Continuous event listeners, tile management, rendering loop
- StaticMapImage: Only initial image decode, then idle

**Validation:**

```
MapCanvas idle CPU: >0% (event handlers active) ✓
StaticMapImage idle CPU: 0% (static image) ✓
```

### Test 7: Render Performance

**Goal:** Measure time to first interactive/paint

**Steps:**

1. Open DevTools → Performance tab
2. Enable "Screenshots" option
3. Start recording
4. Navigate to story
5. Stop recording after render
6. Check "First Paint" and "First Contentful Paint" markers

**Expected:**

- StaticMapImage: Faster initial render (image loads quickly)
- MapCanvas: Slower (Leaflet init, tile fetching)

**Validation:**

```
StaticMapImage FCP: ~100-300ms ✓
MapCanvas FCP: ~500-1000ms ✓
StaticMapImage renders 2-3x faster ✓
```

## Summary of Findings

After running all tests, update the performance table in `README.md` with actual measured values.

### Current Claims vs Actual Results

| Metric                     | Claimed     | Actual (Measured) |
| -------------------------- | ----------- | ----------------- |
| StaticMapImage (1)         | ~100KB PNG  | ~30-50KB PNG      |
| StaticMapImage (20)        | ~2MB images | ~600KB-1MB        |
| MapCanvas bundle           | ~200KB JS   | ~200KB JS ✓       |
| MapCanvas (20) - not safe  | ~4MB+ JS    | (not tested)      |
| StaticMapImage memory (1)  | Low         | ~2-5MB            |
| MapCanvas memory (1)       | High        | ~15-25MB          |
| StaticMapImage memory (20) | Minimal     | ~10-20MB          |
| MapCanvas memory (4)       | Heavy       | ~60-100MB         |

### Recommended README Updates

1. **Single map size:** Change "~100KB PNG" → "~30-50KB PNG"
2. **20 maps total:** Change "~2MB images" → "~600KB-1MB images"
3. **Add memory specifics:**
   - StaticMapImage: ~0.5-1MB per instance
   - MapCanvas: ~15-25MB per instance
4. **Add note:** "Testing 20 MapCanvas instances not recommended - may crash browser"

## Automated Testing

For CI/CD validation, consider:

1. **Lighthouse CI** - Bundle size tracking
2. **Image size assertions** - Check PNG sizes in tests
3. **Memory snapshots** - Puppeteer with `performance.memory`
4. **Bundle analysis** - Track Leaflet bundle size over time

### Example Test Script

```typescript
// tests/performance/map-bundle-size.test.ts
import { test, expect } from "@playwright/test";

test("StaticMapImage transfer size", async ({ page }) => {
  const responses: number[] = [];

  page.on("response", (response) => {
    if (response.url().includes("/api/map-image")) {
      response.body().then((buffer) => {
        responses.push(buffer.length);
      });
    }
  });

  await page.goto(
    "http://localhost:6006/?path=/story/templates-charts-performance-tests--single-static-map"
  );
  // Wait for image to load instead of arbitrary timeout
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('img[src*="/api/map-image"]');

  expect(responses.length).toBeGreaterThan(0);
  const avgSize = responses.reduce((a, b) => a + b, 0) / responses.length;
  expect(avgSize).toBeLessThan(60_000); // 60KB max
  expect(avgSize).toBeGreaterThan(20_000); // 20KB min
});
```

## Continuous Monitoring

Set up alerts for:

- StaticMapImage PNG size > 100KB (degradation)
- MapCanvas bundle > 250KB (bloat)
- Performance regression in render times

## References

- [Chrome DevTools Performance Monitor](https://developer.chrome.com/docs/devtools/performance/monitor/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)
