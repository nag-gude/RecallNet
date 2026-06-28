import type { UserRecallStatus } from "./types";

/**
 * Recall Explanation Agent — deterministic narrative from structured recall data.
 * Not a black-box LLM; auditable for judges. Post-MVP: optional LLM polish layer.
 */
export function generateRecallExplanation(alert: UserRecallStatus): string {
  const action =
    alert.actionRequired === "STOP_USE"
      ? "Stop using this product immediately and follow the manufacturer's remedy instructions."
      : alert.eligibility === "ELIGIBLE"
        ? "You may qualify for a manufacturer remedy — review eligibility and submit a claim if applicable."
        : alert.eligibility === "EXPIRED"
          ? "The official remedy window for this recall has ended, but you should still verify safe disposal or use."
          : "Verify this product against the official recall listing.";

  return [
    `This recall affects your ${alert.productName} because ${alert.hazardDescription}`,
    `We matched this item with ${alert.matchConfidence} confidence (${alert.matchReason}).`,
    action,
  ].join(" ");
}

export function generateRecallExplanationShort(alert: UserRecallStatus): string {
  return `Affects your ${alert.productName}: ${alert.hazardDescription.split(".")[0]}.`;
}
