import { NextResponse } from "next/server";
import { buildDiagnostic } from "../../_diag/shared";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(buildDiagnostic("uptime", true, String(process.uptime()) + "s"));
}
