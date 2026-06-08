import { NextRequest, NextResponse } from "next/server";

// Ping endpoint
export async function GET(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ pong: true });
}
