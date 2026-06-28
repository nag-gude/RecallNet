import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";
import { syncAndNotifyOwners, syncRecallsFromCpsc } from "@/lib/recall-sync";

/** List active recalls from the synced CPSC catalog */
export async function GET() {
  try {
    const store = await getStore();
    const recalls = await store.listActiveRecalls();
    return NextResponse.json({
      source: "cpsc.gov",
      count: recalls.length,
      recalls: recalls.map((r) => ({
        recallId: r.recallId,
        title: r.title,
        publishedAt: r.publishedAt,
        severity: r.severity,
        agency: r.agency,
        sourceUrl: r.sourceUrl,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load recalls" }, { status: 500 });
  }
}

/** Sync latest recalls from CPSC and notify affected owners */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const notify = body.notify !== false;
    const store = await getStore();

    const result = notify
      ? await syncAndNotifyOwners(store)
      : await syncRecallsFromCpsc(store);

    return NextResponse.json({
      source: "cpsc.gov",
      fetched: result.fetched,
      upserted: result.upserted,
      newRecalls: result.newRecallIds.length,
      newRecallIds: result.newRecallIds,
      ownersNotified: result.ownersNotified,
      message:
        result.newRecallIds.length > 0
          ? `Synced ${result.newRecallIds.length} new recall(s) from CPSC — ${result.ownersNotified} owner(s) notified`
          : `Recall catalog up to date (${result.fetched} recalls checked)`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "CPSC sync failed" }, { status: 500 });
  }
}
