import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q") || "";

  return NextResponse.json({ echo: q }, { status: 200 });
}
