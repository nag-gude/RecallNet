import { getStore } from "./db/client";
import { productStatusFromAlerts, sumEligibleRemedy } from "./eligibility";
import { computeHouseholdSafetyScore } from "./risk-score";
import { sortAlerts } from "./sort-alerts";
import type { DashboardResponse } from "./types";

export async function buildDashboard(userId: string): Promise<DashboardResponse> {
  const store = await getStore();
  const rawAlerts = await store.listUserRecallStatus(userId);
  const alerts = sortAlerts(rawAlerts);
  const events = await store.listOwnershipByUser(userId);

  const productMap = new Map<string, { name: string; purchaseDate: string }>();
  for (const e of events) {
    const product = await store.getProduct(e.productId);
    const name = e.metadata?.title ?? product?.model ?? e.productId;
    if (!productMap.has(e.productId)) {
      productMap.set(e.productId, { name, purchaseDate: e.purchaseDate });
    }
  }

  const products = [...productMap.entries()].map(([productId, info]) => ({
    productId,
    name: info.name,
    purchaseDate: info.purchaseDate,
    status: productStatusFromAlerts(productId, alerts),
  }));

  const eligibleRemedyValueUsd = sumEligibleRemedy(alerts);
  const stopUseCount = alerts.filter((a) => a.actionRequired === "STOP_USE").length;
  const householdSafetyScore = computeHouseholdSafetyScore(alerts);

  return {
    userId,
    summary: {
      productsOwned: products.length,
      activeRecalls: alerts.filter((a) => a.eligibility !== "EXPIRED").length,
      eligibleRemedyValueUsd,
      stopUseCount,
      householdSafetyScore,
    },
    alerts,
    products,
  };
}
