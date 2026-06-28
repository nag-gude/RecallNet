import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db/client";
import { toLineItem, type ProductInput } from "@/lib/product-input";
import { ingestLineItems } from "@/lib/matcher";
import { sortAlerts } from "@/lib/sort-alerts";
import { sumEligibleRemedy } from "@/lib/eligibility";
import type { EventSource } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string;
    const product = body.product as ProductInput;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!product?.title?.trim() && !product?.upc?.trim()) {
      return NextResponse.json(
        { error: "Product title or UPC is required" },
        { status: 400 },
      );
    }

    const title =
      product.title?.trim() ||
      (product.brand ? `${product.brand} ${product.model ?? ""}`.trim() : "") ||
      `Product UPC ${product.upc}`;

    const item = toLineItem({ ...product, title });
    const store = await getStore();
    const source: EventSource =
      body.source === "BARCODE_SCAN"
        ? "BARCODE_SCAN"
        : body.source === "AMAZON_CSV"
          ? "AMAZON_CSV"
          : "MANUAL";
    const { alerts } = await ingestLineItems(store, userId, [item], source);
    const sorted = sortAlerts(alerts);

    return NextResponse.json({
      itemsParsed: 1,
      productsMatched: 1,
      recallsFound: sorted.length,
      eligibleRemedyValueUsd: sumEligibleRemedy(sorted),
      alerts: sorted,
      scannedUpc: item.upc,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Product ingest failed" }, { status: 500 });
  }
}
