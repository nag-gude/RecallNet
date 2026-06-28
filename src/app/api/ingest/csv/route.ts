import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";
import { parseOrderCsv } from "@/lib/csv-parser";
import { ingestLineItems } from "@/lib/matcher";
import { sortAlerts } from "@/lib/sort-alerts";
import { sumEligibleRemedy } from "@/lib/eligibility";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string;
    const csv = body.csv as string;

    if (!userId || !csv) {
      return NextResponse.json({ error: "userId and csv are required" }, { status: 400 });
    }

    const items = parseOrderCsv(csv);
    if (items.length === 0) {
      return NextResponse.json({ error: "No valid rows in CSV" }, { status: 400 });
    }

    const store = await getStore();
    const { alerts } = await ingestLineItems(store, userId, items);
    const sorted = sortAlerts(alerts);

    return NextResponse.json({
      itemsParsed: items.length,
      productsMatched: new Set(items.filter((i) => i.upc).map((i) => i.upc)).size,
      recallsFound: sorted.length,
      eligibleRemedyValueUsd: sumEligibleRemedy(sorted),
      alerts: sorted,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
