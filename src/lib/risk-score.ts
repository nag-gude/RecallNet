import type { HouseholdSafetyScore, RiskFactor, UserRecallStatus } from "./types";

function alertFactors(alert: UserRecallStatus): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (alert.severity === "STOP_USE" || alert.actionRequired === "STOP_USE") {
    factors.push({ label: "Fire / stop-use hazard", points: 45 });
  } else if (alert.severity === "REPAIR") {
    factors.push({ label: "Repair required", points: 25 });
  } else if (alert.severity === "REFUND") {
    factors.push({ label: "Refund recall active", points: 20 });
  }

  if (alert.category === "baby") {
    factors.push({ label: "Child product", points: 30 });
  } else if (alert.category === "kitchen") {
    factors.push({ label: "Kitchen appliance", points: 15 });
  }

  if (alert.eligibility === "ELIGIBLE") {
    factors.push({ label: "Active eligible recall", points: 15 });
  } else if (alert.eligibility === "EXPIRED") {
    factors.push({ label: "Expired remedy window", points: 5 });
  }

  return factors;
}

/** Household Safety Score from highest-risk alert + aggregated exposure */
export function computeHouseholdSafetyScore(alerts: UserRecallStatus[]): HouseholdSafetyScore {
  if (alerts.length === 0) {
    return { total: 0, band: "Low", factors: [{ label: "No active recalls detected", points: 0 }] };
  }

  const scored = alerts.map((a) => {
    const factors = alertFactors(a);
    const subtotal = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
    return { alert: a, factors, subtotal };
  });

  scored.sort((a, b) => b.subtotal - a.subtotal);
  const top = scored[0];

  const extra =
    alerts.length > 1 ? [{ label: `Multiple recalled products (+${alerts.length - 1})`, points: Math.min(10, (alerts.length - 1) * 5) }] : [];

  const allFactors = [...top.factors, ...extra];
  const total = Math.min(100, allFactors.reduce((s, f) => s + f.points, 0));

  let band: HouseholdSafetyScore["band"] = "Low";
  if (total >= 80) band = "Critical";
  else if (total >= 50) band = "Elevated";
  else if (total >= 20) band = "Moderate";

  return { total, band, factors: allFactors };
}
