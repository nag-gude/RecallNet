import type { UserRecallStatus } from "@/lib/types";

export function statusBadge(alert: UserRecallStatus): { label: string; className: string } {
  if (alert.actionRequired === "STOP_USE") {
    return { label: "STOP USE", className: "bg-red-100 text-red-800 border-red-200" };
  }
  if (alert.eligibility === "EXPIRED") {
    return { label: "Expired", className: "bg-gray-100 text-gray-600 border-gray-200" };
  }
  if (alert.eligibility === "ELIGIBLE") {
    return { label: "Action Required", className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
  return { label: "Review", className: "bg-yellow-50 text-yellow-800 border-yellow-200" };
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
