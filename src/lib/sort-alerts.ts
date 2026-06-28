import type { UserRecallStatus } from "./types";

const CATEGORY_PRIORITY: Record<string, number> = {
  baby: 0,
  kitchen: 1,
  home: 2,
  electronics: 3,
};

function severityRank(severity: UserRecallStatus["severity"], action: UserRecallStatus["actionRequired"]): number {
  if (action === "STOP_USE" || severity === "STOP_USE") return 0;
  if (severity === "REPAIR") return 1;
  if (severity === "REFUND") return 2;
  return 3;
}

function eligibilityRank(eligibility: UserRecallStatus["eligibility"]): number {
  if (eligibility === "ELIGIBLE") return 0;
  if (eligibility === "UNKNOWN") return 1;
  return 2;
}

/** Infant/baby STOP USE first, then other STOP USE, then ELIGIBLE, then EXPIRED */
export function sortAlerts(alerts: UserRecallStatus[]): UserRecallStatus[] {
  return [...alerts].sort((a, b) => {
    const catA = CATEGORY_PRIORITY[a.category] ?? 5;
    const catB = CATEGORY_PRIORITY[b.category] ?? 5;
    const sevA = severityRank(a.severity, a.actionRequired);
    const sevB = severityRank(b.severity, b.actionRequired);
    if (sevA !== sevB) return sevA - sevB;
    if (sevA === 0 && catA !== catB) return catA - catB;
    const elA = eligibilityRank(a.eligibility);
    const elB = eligibilityRank(b.eligibility);
    if (elA !== elB) return elA - elB;
    return a.productName.localeCompare(b.productName);
  });
}

export function primaryStopUseAlert(alerts: UserRecallStatus[]): UserRecallStatus | null {
  const sorted = sortAlerts(alerts);
  return sorted.find((a) => a.actionRequired === "STOP_USE") ?? null;
}
