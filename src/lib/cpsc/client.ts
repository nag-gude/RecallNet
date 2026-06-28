import type { CpscRecall } from "./types";

const CPSC_BASE = "https://www.saferproducts.gov/RestWebServices/Recall";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const CPSC_TIMEOUT_MS = Number(process.env.CPSC_TIMEOUT_MS) || 7000;

/**
 * A real CPSC recall always carries a RecallNumber. When CPSC's database is
 * down, the API returns a synthetic record titled
 * "Error retrieving Recalls: The underlying provider failed on ...".
 * Drop those so they never reach normalization.
 */
function isValidRecall(r: CpscRecall): boolean {
  if (!r || typeof r !== "object") return false;
  if (!r.RecallNumber) return false;
  if (/^Error retrieving Recalls/i.test(r.Title ?? "")) return false;
  return true;
}

async function fetchRecalls(params: Record<string, string>): Promise<CpscRecall[]> {
  const url = new URL(CPSC_BASE);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  // CPSC can hang for tens of seconds during an outage — abort so callers can
  // fall back to the cached catalog instead of blocking the serverless function.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CPSC_TIMEOUT_MS);

  let data: unknown;
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`CPSC API error: ${res.status} ${res.statusText}`);
    }
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const list = Array.isArray(data) ? (data as CpscRecall[]) : [];
  return list.filter(isValidRecall);
}

/** Fetch recalls published within the last N days */
export async function fetchRecentRecalls(daysBack = 365): Promise<CpscRecall[]> {
  return fetchRecalls({
    RecallDateStart: daysAgoIso(daysBack),
    RecallDateEnd: new Date().toISOString().slice(0, 10),
  });
}

/** Look up recalls by UPC (exact match on CPSC ProductUPCs field) */
export async function fetchRecallsByUpc(upc: string): Promise<CpscRecall[]> {
  const normalized = upc.replace(/\D/g, "");
  if (!normalized) return [];

  const results = await fetchRecalls({ ProductUPC: normalized });

  // CPSC ProductUPC query often returns the full catalog — filter client-side
  const filtered = results.filter(
    (r) =>
      r.ProductUPCs?.some((u) => u.UPC.replace(/\D/g, "") === normalized) ||
      r.Description?.includes(normalized),
  );

  return filtered.length > 0 ? filtered : results.length <= 20 ? results : [];
}

/** Look up recalls by product or brand name (wildcard search) */
export async function fetchRecallsByProductName(name: string): Promise<CpscRecall[]> {
  const term = name.trim().slice(0, 80);
  if (term.length < 2) return [];
  return fetchRecalls({ ProductName: term });
}

/** Fetch a single recall by CPSC recall number */
export async function fetchRecallByNumber(recallNumber: string): Promise<CpscRecall | null> {
  const results = await fetchRecalls({ RecallNumber: recallNumber });
  return results[0] ?? null;
}
