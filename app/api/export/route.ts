import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({ message: "Export endpoint — not yet implemented" }, { status: 501 });
}
