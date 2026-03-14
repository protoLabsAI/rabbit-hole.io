/**
 * Clerk Webhook Handler (stub)
 *
 * Clerk has been removed. This route returns 200 for any webhook event.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Clerk removed — webhook events are no-ops
  return NextResponse.json(
    { success: true, note: "Clerk removed" },
    { status: 200 }
  );
}
