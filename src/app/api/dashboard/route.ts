import { NextRequest, NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId query param required" }, { status: 400 });
  }

  const dashboard = await buildDashboard(userId);
  return NextResponse.json(dashboard);
}
