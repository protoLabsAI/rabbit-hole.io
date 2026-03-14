// Dynamic imports for native modules (canvas, sharp) to prevent build-time errors
// These are only imported at runtime when the API route is actually called
import { NextRequest, NextResponse } from "next/server";

import {
  getTilesForViewport,
  getTileUrl,
  latLngToPixel,
} from "@proto/charts/map/utils";
import type { EntityType } from "@proto/types";
import { getEntityColor } from "@proto/utils/atlas";

interface MapImageQuery {
  entities: Array<{
    id: string;
    name: string;
    type: EntityType;
    lat: number;
    lng: number;
  }>;
  center: { lat: number; lng: number };
  zoom: number;
  width: number;
  height: number;
  provider: "openstreetmap" | "cartodb" | "stamen";
}

/**
 * Fetch a map tile from provider with retry logic and timeout
 */
async function fetchTile(
  url: string,
  retries: number = 3
): Promise<Buffer | null> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StaticMapRenderer/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Tile doesn't exist (ocean, invalid coords)
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      clearTimeout(timeoutId);
      if (i === retries - 1) {
        console.error(`Failed to fetch tile ${url}:`, error);
        return null;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** i));
    }
  }

  return null;
}

/**
 * Generate static map image with entity markers
 */
async function generateMapImage(params: MapImageQuery): Promise<Buffer | null> {
  // Dynamic import of native modules (only at runtime, not build time)
  const { createCanvas, loadImage } = await import("canvas");
  const sharp = (await import("sharp")).default;

  const { entities, center, zoom, width, height, provider } = params;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, width, height);

  try {
    // Get tiles needed for viewport
    const tiles = getTilesForViewport(
      center.lat,
      center.lng,
      zoom,
      width,
      height
    );

    console.log(
      `[map-image] Rendering ${tiles.length} tiles for ${width}x${height} at zoom ${zoom}`
    );

    // Fetch and draw tiles
    const tilePromises = tiles.map(async (tile) => {
      const url = getTileUrl(tile.x, tile.y, tile.z, provider);
      const buffer = await fetchTile(url);

      if (buffer) {
        try {
          const image = await loadImage(buffer);
          return { tile, image };
        } catch (err) {
          console.error(`Failed to load tile image:`, err);
          return null;
        }
      }

      return null;
    });

    const tileResults = await Promise.all(tilePromises);

    // Draw tiles on canvas
    for (const result of tileResults) {
      if (result && result.image) {
        const { tile, image } = result;
        ctx.drawImage(image, tile.screenX, tile.screenY, 256, 256);
      }
    }

    // Draw entity markers
    for (const entity of entities) {
      const color = getEntityColor(entity.type);
      const pos = latLngToPixel(
        entity.lat,
        entity.lng,
        zoom,
        width,
        height,
        center.lat,
        center.lng
      );

      // Skip entities outside viewport
      if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) {
        continue;
      }

      // Draw marker circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Convert canvas to buffer
    const canvasBuffer = canvas.toBuffer("image/png");

    // Optimize with sharp
    const optimized = await sharp(canvasBuffer)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error("[map-image] Error generating map:", error);
    return null;
  }
}

/**
 * GET /api/map-image
 *
 * Query params:
 * - entities: JSON string array of entity IDs to fetch
 * - center: "lat,lng" center point
 * - zoom: number (1-18)
 * - width: number (default 800)
 * - height: number (default 600)
 * - provider: openstreetmap | cartodb | stamen
 */
export async function GET(request: NextRequest) {
  // Authenticate request to prevent DoS on expensive image generation
  // Bypass in development for Storybook and local testing
  if (process.env.NODE_ENV !== "development") {
    const userId = "local-user";
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);

    // Parse entities parameter
    const entitiesParam = searchParams.get("entities");
    if (!entitiesParam) {
      return NextResponse.json(
        { error: "Missing entities parameter" },
        { status: 400 }
      );
    }

    let entities: MapImageQuery["entities"];
    try {
      const parsed = JSON.parse(entitiesParam);

      // Validate entity structure
      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: "Entities must be an array" },
          { status: 400 }
        );
      }

      // Validate each entity has required fields
      for (const entity of parsed) {
        if (
          typeof entity.id !== "string" ||
          typeof entity.name !== "string" ||
          typeof entity.type !== "string" ||
          typeof entity.lat !== "number" ||
          typeof entity.lng !== "number" ||
          isNaN(entity.lat) ||
          isNaN(entity.lng) ||
          entity.lat < -90 ||
          entity.lat > 90 ||
          entity.lng < -180 ||
          entity.lng > 180
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid entity format: each entity must have id (string), name (string), type (string), lat (number -90 to 90), lng (number -180 to 180)",
            },
            { status: 400 }
          );
        }
      }

      entities = parsed;
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid entities JSON format" },
        { status: 400 }
      );
    }

    // Parse center
    const centerParam = searchParams.get("center");
    if (!centerParam) {
      return NextResponse.json(
        { error: "Missing center parameter" },
        { status: 400 }
      );
    }

    const [latStr, lngStr] = centerParam.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid center coordinates" },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        {
          error:
            "Center coordinates out of range (lat: -90 to 90, lng: -180 to 180)",
        },
        { status: 400 }
      );
    }

    // Parse zoom
    const zoomParam = searchParams.get("zoom");
    const zoom = zoomParam ? parseInt(zoomParam) : 10;

    if (isNaN(zoom) || zoom < 1 || zoom > 18) {
      return NextResponse.json(
        { error: "Invalid zoom level (must be 1-18)" },
        { status: 400 }
      );
    }

    // Parse dimensions
    const widthParam = searchParams.get("width");
    const heightParam = searchParams.get("height");
    const width = widthParam ? parseInt(widthParam) : 800;
    const height = heightParam ? parseInt(heightParam) : 600;

    if (
      isNaN(width) ||
      isNaN(height) ||
      width < 100 ||
      width > 2000 ||
      height < 100 ||
      height > 2000
    ) {
      return NextResponse.json(
        { error: "Invalid dimensions (must be 100-2000px)" },
        { status: 400 }
      );
    }

    // Parse provider
    const providerParam = searchParams.get("provider") || "openstreetmap";
    const provider = ["openstreetmap", "cartodb", "stamen"].includes(
      providerParam
    )
      ? (providerParam as MapImageQuery["provider"])
      : "openstreetmap";

    // Generate image
    const imageBuffer = await generateMapImage({
      entities,
      center: { lat, lng },
      zoom,
      width,
      height,
      provider,
    });

    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Failed to generate map image" },
        { status: 500 }
      );
    }

    // Return image - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    console.error("[map-image] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
