import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";
import { parseTextList } from "@/lib/csv-parser";
import { ingestLineItems } from "@/lib/matcher";
import { sortAlerts } from "@/lib/sort-alerts";
import { sumEligibleRemedy } from "@/lib/eligibility";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string;
    const text = body.text as string;

    if (!userId || !text) {
      return NextResponse.json({ error: "userId and text are required" }, { status: 400 });
    }

    const items = parseTextList(text);
    const store = await getStore();
    const { alerts } = await ingestLineItems(store, userId, items, "MANUAL");
    const sorted = sortAlerts(alerts);

    return NextResponse.json({
      itemsParsed: items.length,
      productsMatched: items.length,
      recallsFound: sorted.length,
      eligibleRemedyValueUsd: sumEligibleRemedy(sorted),
      alerts: sorted,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
