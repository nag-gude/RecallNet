import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getStore } from "@/lib/db/client";
import { sortAlerts } from "@/lib/sort-alerts";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const store = await getStore();
    const alerts = sortAlerts(await store.listUserRecallStatus(userId));
    const token = uuidv4().slice(0, 12);

    const report = {
      token,
      createdAt: new Date().toISOString(),
      userId,
      items: alerts.map((a) => ({
        productName: a.productName,
        severity: a.severity,
        eligibility: a.eligibility,
        actionRequired: a.actionRequired,
      })),
    };

    await store.putShareReport(report);

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
    return NextResponse.json({
      token,
      url: `${base}/report/${token}`,
      itemCount: report.items.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
