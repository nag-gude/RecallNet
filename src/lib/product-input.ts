import type { ParsedLineItem } from "./csv-parser";
import type { EventSource } from "./types";

export interface ProductInput {
  title: string;
  brand?: string;
  model?: string;
  upc?: string;
  orderDate?: string;
  retailer?: string;
  quantity?: number;
  price?: number;
}

export function toLineItem(input: ProductInput): ParsedLineItem {
  const title = input.title.trim();
  const brand = input.brand?.trim() || title.split(/\s+/)[0] || "Unknown";
  return {
    orderDate: input.orderDate ?? new Date().toISOString().slice(0, 10),
    title,
    brand,
    model: input.model?.trim() || title,
    upc: input.upc?.replace(/\D/g, "") || undefined,
    quantity: input.quantity ?? 1,
    price: input.price,
    retailer: input.retailer?.trim() || undefined,
  };
}

export function upcFromScan(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidUpc(upc: string): boolean {
  const digits = upc.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 14;
}

export type IngestSource = EventSource | "BARCODE_SCAN";

export interface IngestProductPayload {
  userId: string;
  product: ProductInput;
  source?: IngestSource;
}

export interface IngestResult {
  itemsParsed: number;
  recallsFound: number;
  eligibleRemedyValueUsd: number;
  alerts: unknown[];
}

export async function ingestProduct(payload: IngestProductPayload): Promise<IngestResult> {
  const res = await fetch("/api/ingest/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ingest failed");
  return data;
}

export async function ingestCsv(userId: string, csv: string): Promise<IngestResult> {
  const res = await fetch("/api/ingest/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, csv }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data;
}
