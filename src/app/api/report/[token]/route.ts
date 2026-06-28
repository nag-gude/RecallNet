import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const store = await getStore();
  const report = await store.getShareReport(params.token);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
