import type { CpscRecall } from "./cpsc/types";
import {
  fetchRecentRecalls,
  fetchRecallsByProductName,
  fetchRecallsByUpc,
} from "./cpsc/client";
import { normalizeCpscRecall } from "./cpsc/normalize";
import type { RecallStore } from "./db/store";
import { fanOutRecall } from "./matcher";
import type { ParsedLineItem } from "./csv-parser";
import type { RecallEvent } from "./types";

export interface SyncResult {
  fetched: number;
  upserted: number;
  newRecallIds: string[];
  ownersNotified: number;
}

function syncDaysBack(): number {
  const raw = process.env.RECALL_SYNC_DAYS;
  const n = raw ? parseInt(raw, 10) : 90;
  return Number.isFinite(n) && n > 0 ? n : 90;
}

/** Upsert a normalized recall + products into the store */
export async function persistRecallBundle(
  store: RecallStore,
  raw: Parameters<typeof normalizeCpscRecall>[0],
  knownIds: Set<string>,
): Promise<{ recallId: string; isNew: boolean }> {
  const { recall, products } = normalizeCpscRecall(raw);
  const isNew = !knownIds.has(recall.recallId) && !(await store.getRecall(recall.recallId));

  for (const product of products) {
    await store.putProduct(product);
  }
  await store.putRecallEvent(recall);
  knownIds.add(recall.recallId);

  return { recallId: recall.recallId, isNew };
}

/** Sync recent CPSC recalls into the local catalog */
export async function syncRecallsFromCpsc(
  store: RecallStore,
  daysBack = syncDaysBack(),
): Promise<SyncResult> {
  const rawRecalls = await fetchRecentRecalls(daysBack);
  const knownIds = new Set((await store.listActiveRecalls()).map((r) => r.recallId));
  const newRecallIds: string[] = [];
  let upserted = 0;

  for (const raw of rawRecalls) {
    const { recallId, isNew } = await persistRecallBundle(store, raw, knownIds);
    upserted++;
    if (isNew) newRecallIds.push(recallId);
  }

  return { fetched: rawRecalls.length, upserted, newRecallIds, ownersNotified: 0 };
}

/** Build search terms for CPSC name lookup (brand-first, then title tokens) */
function nameSearchTerms(item: ParsedLineItem): string[] {
  const terms = new Set<string>();
  if (item.brand?.trim()) terms.add(item.brand.trim());
  const titleWords = item.title.trim().split(/\s+/);
  if (titleWords.length >= 2) terms.add(titleWords.slice(0, 2).join(" "));
  if (titleWords[0]) terms.add(titleWords[0]);
  return [...terms].filter((t) => t.length >= 2);
}

async function lookupByName(item: ParsedLineItem) {
  for (const term of nameSearchTerms(item)) {
    const results = await fetchRecallsByProductName(term);
    if (results.length > 0) return results;
  }
  return [];
}

/** Live CPSC lookup for a purchase line item; upserts matching recalls */
export async function lookupAndUpsertRecallsForItem(
  store: RecallStore,
  item: ParsedLineItem,
): Promise<RecallEvent[]> {
  let rawRecalls: CpscRecall[] = [];

  if (item.upc) {
    rawRecalls = await fetchRecallsByUpc(item.upc);
    if (rawRecalls.length === 0) {
      rawRecalls = await lookupByName(item);
    }
  } else if (item.brand?.trim()) {
    rawRecalls = await lookupByName(item);
  } else {
    // Name-only search without brand matches too many unrelated CPSC records
    rawRecalls = [];
  }

  const knownIds = new Set<string>();
  const matched: RecallEvent[] = [];

  for (const raw of rawRecalls) {
    const { recall } = normalizeCpscRecall(raw);
    await persistRecallBundle(store, raw, knownIds);
    matched.push(recall);
  }

  return matched;
}

/** Ensure catalog has recent recalls (called on app init) */
export async function ensureRecallCatalog(store: RecallStore): Promise<void> {
  const active = await store.listActiveRecalls();
  if (active.length > 0) return;
  await syncRecallsFromCpsc(store, syncDaysBack());
}

/** Pull latest CPSC recalls and fan-out alerts to affected owners */
export async function syncAndNotifyOwners(store: RecallStore): Promise<SyncResult> {
  const before = new Set((await store.listActiveRecalls()).map((r) => r.recallId));
  const syncResult = await syncRecallsFromCpsc(store, 30);

  const newRecallIds = syncResult.newRecallIds.filter((id) => !before.has(id));
  let ownersNotified = 0;

  for (const recallId of newRecallIds) {
    const { ownersNotified: n } = await fanOutRecall(store, recallId);
    ownersNotified += n;
  }

  return { ...syncResult, newRecallIds, ownersNotified };
}
