import type { EligibilityRules, OwnershipEvent, RecallEvent, RemedyType } from "./types";
import type { Eligibility, ActionRequired } from "./types";

/** When CPSC omits remedyValueUsd, estimate from purchase price for replacement/refund recalls. */
export function estimateRemedyValue(
  remedyType: RemedyType,
  purchasePrice?: number,
  ruleValue?: number,
): number {
  if (ruleValue != null && ruleValue > 0) return ruleValue;
  if (purchasePrice != null && purchasePrice > 0) {
    if (remedyType === "REPLACEMENT" || remedyType === "REFUND") return purchasePrice;
  }
  return 0;
}

function toDate(iso: string): Date {
  return new Date(iso.slice(0, 10));
}

/**
 * Evaluate remedy eligibility for a purchase against CPSC recall rules.
 *
 * - EXPIRED: claim deadline has passed
 * - UNKNOWN: purchase outside the affected sale window (when CPSC provides one)
 * - ELIGIBLE: purchase during sale window, or no sale window on record
 */
export function evaluateEligibility(
  purchaseDate: string,
  rules: EligibilityRules,
  now = new Date(),
): { eligibility: Eligibility; remedyValueUsd: number } {
  const value = rules.remedyValueUsd ?? 0;
  const purchased = toDate(purchaseDate);

  const claimDeadlineIso = rules.claimDeadline ?? rules.dateRange?.end;
  if (claimDeadlineIso && now > toDate(claimDeadlineIso)) {
    return { eligibility: "EXPIRED", remedyValueUsd: 0 };
  }

  const saleWindow = rules.saleWindow ?? legacySaleWindow(rules);
  if (saleWindow) {
    const saleStart = toDate(saleWindow.start);
    const saleEnd = toDate(saleWindow.end);
    if (purchased < saleStart || purchased > saleEnd) {
      return { eligibility: "UNKNOWN", remedyValueUsd: 0 };
    }
  }

  return { eligibility: "ELIGIBLE", remedyValueUsd: value };
}

/** Back-compat for recalls stored before saleWindow field existed */
function legacySaleWindow(rules: EligibilityRules): { start: string; end: string } | undefined {
  if (rules.dateRange?.start && rules.dateRange.end) {
    return { start: rules.dateRange.start, end: rules.dateRange.end };
  }
  return undefined;
}

export function severityToAction(severity: RecallEvent["severity"], eligibility: Eligibility): ActionRequired {
  if (eligibility === "EXPIRED") return "NONE";
  if (severity === "STOP_USE") return "STOP_USE";
  if (severity === "REFUND" || severity === "REPAIR") return "SUBMIT_CLAIM";
  return "REGISTER";
}

export function sumEligibleRemedy(alerts: { eligibility: Eligibility; remedyValueUsd?: number }[]): number {
  return alerts
    .filter((a) => a.eligibility === "ELIGIBLE")
    .reduce((sum, a) => sum + (a.remedyValueUsd ?? 0), 0);
}

export function productStatusFromAlerts(
  productId: string,
  alerts: { productId: string; severity: string; eligibility: Eligibility; actionRequired: ActionRequired }[],
): "SAFE" | "RECALLED" | "ACTION_REQUIRED" | "EXPIRED" {
  const match = alerts.find((a) => a.productId === productId);
  if (!match) return "SAFE";
  if (match.eligibility === "EXPIRED") return "EXPIRED";
  if (match.actionRequired === "STOP_USE") return "ACTION_REQUIRED";
  return "RECALLED";
}

export type { OwnershipEvent, RecallEvent };
