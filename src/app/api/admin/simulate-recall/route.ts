import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";
import { syncAndNotifyOwners } from "@/lib/recall-sync";

/** @deprecated Use POST /api/recalls instead */
export async function POST(req: NextRequest) {
  try {
    const store = await getStore();
    const result = await syncAndNotifyOwners(store);

    return NextResponse.json({
      recallId: result.newRecallIds[0] ?? null,
      title: "CPSC recall sync",
      ownersNotified: result.ownersNotified,
      alertsCreated: result.newRecallIds.length,
      newRecallIds: result.newRecallIds,
      message: `ProductOwnersIndex fan-out: ${result.ownersNotified} owner(s) notified after CPSC sync`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

/** @deprecated Use GET /api/recalls instead */
export async function GET() {
  const store = await getStore();
  const recalls = await store.listActiveRecalls();
  return NextResponse.json({ recalls });
}
