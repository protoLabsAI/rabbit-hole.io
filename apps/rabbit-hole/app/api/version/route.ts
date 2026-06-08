import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NextRequest, NextResponse } from "next/server";

// Version endpoint — returns the app version from package.json
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    );

    return NextResponse.json({ version: packageJson.version }, { status: 200 });
  } catch (error) {
    console.error("Version check failed:", error);

    return NextResponse.json(
      {
        version: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
