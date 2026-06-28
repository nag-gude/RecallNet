import { v4 as uuidv4 } from "uuid";
import { tokenOverlap } from "./csv-parser";
import { lookupAndUpsertRecallsForItem } from "./recall-sync";
import { evaluateEligibility, estimateRemedyValue, severityToAction } from "./eligibility";
import { formatProductDisplayName } from "./cpsc/hazard-text";
import type { RecallStore } from "./db/store";
import type {
  MatchConfidence,
  OwnershipEvent,
  Product,
  RecallEvent,
  UserRecallStatus,
} from "./types";
import type { ParsedLineItem as LineItem } from "./csv-parser";

export type { ParsedLineItem } from "./csv-parser";

function itemSearchText(item: LineItem): string {
  return [item.brand, item.title, item.model].filter(Boolean).join(" ");
}

/** Pick the CPSC catalog product when live lookup already found matching recalls. */
async function pickProductFromRecalls(
  store: RecallStore,
  item: LineItem,
  matchedRecalls: RecallEvent[],
): Promise<{ product: Product; confidence: MatchConfidence; reason: string } | null> {
  if (matchedRecalls.length === 0) return null;

  const searchText = itemSearchText(item);
  let best: Product | null = null;
  let bestScore = 0;

  for (const recall of matchedRecalls) {
    for (const productId of recall.productIds) {
      const product = await store.getProduct(productId);
      if (!product) continue;

      const brand = item.brand?.toLowerCase() ?? "";
      const productBrand = product.brand.toLowerCase();
      const brandOk =
        brand.length > 0 &&
        (productBrand.includes(brand) || brand.includes(productBrand));

      const productText = [product.brand, product.model, ...(product.aliases ?? [])].join(" ");
      const score = tokenOverlap(searchText, productText);
      const effective = brandOk ? Math.max(score, 0.35) : score;

      if (effective > bestScore) {
        bestScore = effective;
        best = product;
      }
    }
  }

  if (!best) return null;

  // Require meaningful overlap — avoid attaching unrelated CPSC products
  const brand = item.brand?.toLowerCase() ?? "";
  const brandOk =
    brand.length > 0 &&
    (best.brand.toLowerCase().includes(brand) || brand.includes(best.brand.toLowerCase()));
  if (!brandOk && bestScore < 0.25) return null;

  return {
    product: best,
    confidence: item.upc ? "HIGH" : "MEDIUM",
    reason: "Product matched against live CPSC recall data",
  };
}

export async function normalizeLineItem(
  store: RecallStore,
  item: LineItem,
  matchedRecalls: RecallEvent[] = [],
): Promise<{ product: Product; confidence: MatchConfidence; reason: string }> {
  if (item.upc) {
    const byUpc = await store.findProductByUpc(item.upc);
    if (byUpc) {
      return { product: byUpc, confidence: "HIGH", reason: "UPC exact match" };
    }
    const productId = `PRODUCT#${item.upc}`;
    const product: Product = {
      productId,
      brand: item.brand ?? item.title.split(" ")[0],
      model: item.model ?? item.title,
      category: "unknown",
      upc: item.upc,
      createdAt: new Date().toISOString(),
    };
    await store.putProduct(product);
    return { product, confidence: "HIGH", reason: "UPC exact match (new product)" };
  }

  const fromRecall = await pickProductFromRecalls(store, item, matchedRecalls);
  if (fromRecall) return fromRecall;

  const brand = item.brand ?? item.title.split(" ")[0];
  const model = item.model ?? item.title;
  const fuzzy = await store.findProductByTokens(brand, model);
  if (fuzzy) {
    const score = tokenOverlap(`${brand} ${model}`, `${fuzzy.brand} ${fuzzy.model}`);
    if (score >= 0.35) {
      return {
        product: fuzzy,
        confidence: "MEDIUM",
        reason: `Brand + model token match (${Math.round(score * 100)}%)`,
      };
    }
  }

  const productId = `PRODUCT#${uuidv4().slice(0, 12)}`;
  const product: Product = {
    productId,
    brand,
    model,
    category: "unknown",
    createdAt: new Date().toISOString(),
  };
  await store.putProduct(product);
  return { product, confidence: "LOW", reason: "New product — no recall data yet" };
}

export async function matchUserProducts(
  store: RecallStore,
  userId: string,
): Promise<UserRecallStatus[]> {
  const events = await store.listOwnershipByUser(userId);
  const productIds = [...new Set(events.map((e) => e.productId))];
  const alerts: UserRecallStatus[] = [];
  const now = new Date().toISOString();

  for (const productId of productIds) {
    const product = await store.getProduct(productId);
    if (!product) continue;

    const purchaseEvent = events
      .filter((e) => e.productId === productId)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))[0];

    const recalls = await store.listRecallsForProduct(productId);
    for (const recall of recalls) {
      if (recall.status !== "ACTIVE") continue;

      const { eligibility, remedyValueUsd: ruleValue } = evaluateEligibility(
        purchaseEvent.purchaseDate,
        recall.eligibilityRules,
      );

      const purchasePrice = purchaseEvent.metadata?.price;
      const remedyValueUsd =
        eligibility === "ELIGIBLE"
          ? estimateRemedyValue(recall.remedyType, purchasePrice, ruleValue)
          : 0;

      const confidence: MatchConfidence = product.upc ? "HIGH" : "MEDIUM";
      const matchReason = product.upc
        ? "UPC matched against live CPSC recall data"
        : "Product name matched against live CPSC recall data";

      const displayName =
        purchaseEvent.metadata?.title ??
        formatProductDisplayName(product.brand, product.model);

      const alert: UserRecallStatus = {
        userId,
        recallId: recall.recallId,
        productId,
        productName: displayName,
        matchConfidence: confidence,
        matchReason,
        eligibility,
        severity: recall.severity,
        remedyType: recall.remedyType,
        actionRequired: severityToAction(recall.severity, eligibility),
        claimUrl: recall.claimUrl,
        sourceUrl: recall.sourceUrl,
        hazardDescription: recall.hazardDescription,
        notifiedAt: now,
        remedyValueUsd,
        category: product.category,
      };

      await store.putUserRecallStatus(alert);
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function ingestLineItems(
  store: RecallStore,
  userId: string,
  items: LineItem[],
  source: OwnershipEvent["source"] = "AMAZON_CSV",
): Promise<{ events: OwnershipEvent[]; alerts: UserRecallStatus[] }> {
  const events: OwnershipEvent[] = [];

  for (const item of items) {
    const matchedRecalls = await lookupAndUpsertRecallsForItem(store, item);
    const { product } = await normalizeLineItem(store, item, matchedRecalls);
    const eventId = uuidv4().slice(0, 8);
    const event: OwnershipEvent = {
      userId,
      eventId,
      productId: product.productId,
      eventType: "PURCHASE",
      source,
      purchaseDate: item.orderDate,
      timestamp: new Date().toISOString(),
      metadata: {
        title: item.title,
        retailer: item.retailer,
        quantity: item.quantity,
        price: item.price,
        orderId: `ORD-${eventId}`,
      },
    };
    await store.putOwnershipEvent(event);
    events.push(event);
  }

  const alerts = await matchUserProducts(store, userId);
  return { events, alerts };
}

export async function fanOutRecall(
  store: RecallStore,
  recallId: string,
): Promise<{ ownersNotified: number; alerts: UserRecallStatus[] }> {
  const recall = await store.getRecall(recallId);
  if (!recall) throw new Error(`Recall not found: ${recallId}`);

  const allAlerts: UserRecallStatus[] = [];
  const userIds = new Set<string>();

  for (const productId of recall.productIds) {
    const owners = await store.listOwnersByProduct(productId);
    owners.forEach((u) => userIds.add(u));
  }

  for (const userId of userIds) {
    const userAlerts = await matchUserProducts(store, userId);
    allAlerts.push(...userAlerts.filter((a) => a.recallId === recallId));
  }

  return { ownersNotified: userIds.size, alerts: allAlerts };
}
