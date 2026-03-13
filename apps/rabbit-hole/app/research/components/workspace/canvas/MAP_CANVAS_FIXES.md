# MapCanvas Fixes - Debouncing and Click Handler Issues

> **⚠️ DEPRECATED DOCUMENTATION**  
> This file documents fixes for the **OLD** Sigma.js + Leaflet implementation (MapCanvasControlled.tsx).  
> The **current** implementation (`packages/charts/src/map/MapCanvas.tsx`) uses **pure Leaflet** without Sigma.js.  
> This documentation is retained for historical reference only.

**Date:** 2025-12-07  
**Issues Fixed:** Bounds change flooding, Tile disappearance on click

## Issues Found

### Issue 1: Bounds Change Event Flooding

**Problem:**

- Leaflet's `moveend` event fires continuously during map interaction
- Every pan/zoom triggered `onBoundsChange` callback immediately
- Caused hundreds of callback invocations during normal use
- Flooded Storybook Actions panel
- Would cause excessive API calls in production

**Symptoms:**

- Actions panel showing dozens of `onBoundsChange` events
- Performance degradation during map interaction
- UI freezing when callback does expensive operations

**Root Cause:**

```typescript
// Before (broken)
leafletMap.on("moveend", () => {
  const bounds = leafletMap.getBounds();
  onBoundsChange({ north, south, east, west }); // Fires immediately!
});
```

**Fix:**
Added debouncing to `onBoundsChange` callback:

```typescript
// After (fixed)
leafletMap.on("moveend", () => {
  if (boundsChangeTimerRef.current) {
    clearTimeout(boundsChangeTimerRef.current);
  }

  boundsChangeTimerRef.current = setTimeout(() => {
    const bounds = leafletMap.getBounds();
    onBoundsChange({ north, south, east, west });
  }, boundsChangeDebounce); // Default: 500ms
});
```

**Implementation:**

- Added `boundsChangeDebounce` prop (default: 500ms)
- Added `boundsChangeTimerRef` to store timeout
- Clear timeout on each new event
- Only fire callback after user stops moving map
- Cleanup timer on component unmount

**Testing:**
Created Storybook stories demonstrating:

- `WithBoundsTracking` - 500ms debounce (recommended)
- `FastBoundsTracking` - 100ms debounce (more responsive)
- `NoBoundsDebounce` - 0ms (demonstrates the problem)

---

### Issue 2: Tiles Disappear on Click

**Problem:**

- Clicking map caused Leaflet tiles to disappear
- Map background turned light blue (missing tiles)
- Only Sigma.js nodes/edges visible

**Symptoms:**

- Tiles visible on initial load
- Tiles disappear after clicking map
- Map becomes unusable

**Root Cause:**
Sigma.js `clickStage` event was interfering with Leaflet's tile rendering:

```typescript
// This was ALWAYS attached, even when not needed
sigmaRenderer.on("clickStage", (e) => {
  // This event handler interferes with Leaflet
  const coords = graphToLatlng(map, viewportToGraph(e));
  L.marker(coords).addTo(map).openPopup(); // openPopup() broke tiles!
});
```

**Multiple Issues:**

1. **Event always attached:** Even when no callbacks provided
2. **Popup auto-open:** `openPopup()` interfered with Leaflet rendering
3. **No error handling:** Crashes broke map interaction
4. **No null checks:** Events without proper data caused errors

**Fix 1: Conditional Event Attachment**
Only attach `clickStage` handler when callbacks provided:

```typescript
// Only attach when needed
if (onMapClick || onMarkerAdd) {
  sigmaRenderer.on("clickStage", (e) => {
    // ... handler code
  });
}
```

**Fix 2: Remove Auto-Popup**
Don't automatically open popup (let user click marker):

```typescript
// Before
L.marker(coords).addTo(map).openPopup(); // Broke tiles!

// After
L.marker(coords).addTo(map).bindPopup(text); // Just bind, don't open
```

**Fix 3: Add Error Handling**
Prevent crashes from breaking map:

```typescript
try {
  const coords = graphToLatlng(map, viewportToGraph(e));
  // ... handle click
} catch (error) {
  console.debug("Error handling stage click:", error);
  // Don't break map interaction
}
```

**Fix 4: Add Null Checks**

```typescript
if (!e || !e.event) return; // Early exit if invalid event
```

**Fix 5: Tile Layer Improvements**

```typescript
const tileLayer = L.tileLayer(url, {
  keepBuffer: 2, // Keep extra tiles loaded
});
tileLayer.addTo(map);

// Force refresh after initialization
setTimeout(() => {
  if (map && isMountedRef.current) {
    map.invalidateSize(); // Ensure tiles render
  }
}, 100);
```

**Fix 6: Sigma Configuration**
Disable edge events to reduce interference:

```typescript
new Sigma(graph, container, {
  enableEdgeClickEvents: false,
  enableEdgeWheelEvents: false,
});
```

---

## Changes Made

### MapCanvasControlled.tsx

1. **Added debouncing:**
   - New prop: `boundsChangeDebounce?: number` (default: 500ms)
   - New ref: `boundsChangeTimerRef` for timeout management
   - Debounced `moveend` event handler
   - Cleanup timer on unmount

2. **Fixed click handlers:**
   - Conditional `clickStage` attachment
   - Removed auto-popup on marker add
   - Added error handling and null checks
   - Added `keepBuffer` to tile layer
   - Added `invalidateSize()` call after init
   - Disabled edge click/wheel events in Sigma config

3. **Improved container styling:**
   - Added explicit `position: relative` and `zIndex: 0`

### MapCanvas.stories.tsx

1. **Disabled callbacks by default:**
   - Removed `onMapClick` from default args
   - Removed `onMarkerAdd` from default args
   - Removed `onBoundsChange` from default args (too noisy)
   - Only `onNodeClick` enabled by default

2. **Added new stories:**
   - `WithClickInteractions` - Demonstrates click handlers
   - `WithBoundsTracking` - 500ms debounce (recommended)
   - `FastBoundsTracking` - 100ms debounce
   - `NoBoundsDebounce` - 0ms (shows the problem)

3. **Added documentation:**
   - Story descriptions explain issues and solutions
   - Warnings on problematic configurations

---

## Recommendations

### For Bounds Change Tracking

**Recommended: 500ms debounce**

```typescript
<MapCanvasControlled
  onBoundsChange={handleBoundsChange}
  boundsChangeDebounce={500}
/>
```

**For real-time updates: 100ms debounce**

```typescript
<MapCanvasControlled
  onBoundsChange={handleBoundsChange}
  boundsChangeDebounce={100}
/>
```

**Never use: 0ms (no debounce)**

- Causes performance issues
- Floods callback with events
- Can freeze UI
- Causes excessive API calls

### For Click Interactions

**Default: No click handlers**

- Best performance
- No Leaflet interference
- Let users interact with map naturally

**When needed: Use callbacks selectively**

```typescript
<MapCanvasControlled
  onNodeClick={handleNodeClick} // Always safe
  // Only add these if you need them:
  onMapClick={handleMapClick}   // Can interfere with tiles
  onMarkerAdd={handleMarkerAdd} // Can interfere with tiles
/>
```

**If tiles disappear:**

1. Remove `onMapClick` and `onMarkerAdd` callbacks
2. Test if tiles render correctly
3. If yes, the click handlers are the issue
4. Consider alternative approach (e.g., button to toggle marker mode)

---

## Testing

### Before Deploying

1. **Test bounds tracking:**
   - Pan map continuously
   - Verify callback only fires after stopping
   - Check Actions panel for event count

2. **Test click interactions:**
   - Click map background
   - Verify tiles remain visible
   - Check markers appear correctly

3. **Test performance:**
   - Pan/zoom rapidly for 30 seconds
   - Verify no UI freezing
   - Check console for errors

### In Production

1. **Monitor callback frequency:**
   - Log `onBoundsChange` invocation count
   - Should be <10 per interaction, not hundreds

2. **Monitor API calls:**
   - If using bounds for dynamic loading
   - Verify calls are debounced
   - Check for excessive requests

3. **User feedback:**
   - Watch for reports of missing tiles
   - Check for performance complaints
   - Monitor error logs

---

## Known Limitations

### Sigma + Leaflet Integration

The `@sigma/layer-leaflet` integration has inherent conflicts:

1. **Event Capturing:** Sigma captures events before Leaflet
2. **Rendering Order:** Sigma overlays Leaflet canvas
3. **Click Propagation:** Some clicks don't reach Leaflet

**Workaround:** Use click handlers sparingly, prefer node clicks over stage clicks.

### Tile Loading

Leaflet tiles can be sensitive to:

- DOM manipulation during render
- Popup opening/closing
- Map resizing
- Container style changes

**Workaround:** `invalidateSize()` after changes, use `keepBuffer: 2`.

---

## Files Modified

```
Modified:
- apps/rabbit-hole/app/research/components/workspace/canvas/MapCanvasControlled.tsx
  - Added boundsChangeDebounce prop and implementation
  - Fixed click handler attachment (conditional)
  - Removed auto-popup on marker add
  - Added error handling and null checks
  - Improved tile layer configuration
  - Updated Sigma config to disable edge events

- stories/MapCanvas.stories.tsx
  - Removed onMapClick/onMarkerAdd from default args
  - Added WithClickInteractions story
  - Added bounds tracking stories (3 variants)
  - Added documentation and warnings

Created:
- apps/rabbit-hole/app/research/components/workspace/canvas/MAP_CANVAS_FIXES.md (this file)
```

---

## Migration Guide

If you're using the old MapCanvas or early MapCanvasControlled:

### Update Bounds Change Usage

```typescript
// Before
<MapCanvasControlled
  onBoundsChange={(bounds) => {
    // This fired hundreds of times!
    fetchEntities(bounds);
  }}
/>

// After
<MapCanvasControlled
  onBoundsChange={(bounds) => {
    // Now fires once after user stops moving
    fetchEntities(bounds);
  }}
  boundsChangeDebounce={500} // Explicit debounce
/>
```

### Update Click Handler Usage

```typescript
// Before (always enabled)
<MapCanvasControlled
  onMapClick={handleClick}
  onMarkerAdd={handleMarker}
/>

// After (only when needed, with awareness)
// Option 1: Remove if not essential
<MapCanvasControlled />

// Option 2: Keep but monitor for tile issues
<MapCanvasControlled
  onMapClick={handleClick} // May interfere with tiles
  onMarkerAdd={handleMarker} // May interfere with tiles
/>
```

---

**Status:** ✅ Fixed - Debouncing implemented, click handlers made optional
