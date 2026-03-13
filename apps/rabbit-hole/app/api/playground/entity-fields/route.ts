import { NextRequest, NextResponse } from "next/server";

import { getEnrichmentFieldsForEntityType } from "@proto/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    if (!entityType) {
      return NextResponse.json(
        { error: "entityType parameter is required" },
        { status: 400 }
      );
    }

    // Use the centralized function to get fields from both schema and examples
    const availableFields = getEnrichmentFieldsForEntityType(entityType);

    // Common fallback fields if nothing found
    const fields =
      availableFields.length > 0
        ? availableFields
        : [
            "name",
            "description",
            "type",
            "founded",
            "location",
            "headquarters",
          ];

    return NextResponse.json({
      entityType,
      fields,
    });
  } catch (error: any) {
    console.error("Entity fields error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
