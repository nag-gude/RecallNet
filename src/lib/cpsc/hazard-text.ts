import type { CpscRecall } from "./types";

/** Significant tokens for relevance checks (ignore common recall boilerplate) */
function significantTokens(text: string): string[] {
  const stop = new Set([
    "recall", "recalled", "product", "products", "involves", "about", "units",
    "sold", "through", "from", "with", "that", "this", "these", "those",
    "risk", "serious", "injury", "death", "children", "consumer", "consumers",
  ]);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

/**
 * CPSC Hazards[] is sometimes cross-contaminated with unrelated recall text.
 * Only accept hazard copy that overlaps with the recall title, description, or products.
 */
function hazardMatchesRecall(hazard: string, recall: CpscRecall): boolean {
  const context = [
    recall.Title,
    recall.Description,
    ...recall.Products.map((p) => p.Name),
    ...recall.Products.map((p) => p.Model ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  const hazardTokens = significantTokens(hazard);
  if (hazardTokens.length === 0) return false;

  const matches = hazardTokens.filter((t) => context.includes(t));
  const ratio = matches.length / hazardTokens.length;

  // Require meaningful overlap — e.g. "pajama sleepwear" won't match "vaporizer battery"
  return matches.length >= 2 || ratio >= 0.35;
}

/** Best available hazard narrative from CPSC fields */
export function extractHazardDescription(recall: CpscRecall): string {
  const validatedHazards = recall.Hazards.map((h) => h.Name)
    .filter(Boolean)
    .filter((h) => hazardMatchesRecall(h, recall));

  if (validatedHazards.length > 0) {
    return validatedHazards.join(" ").slice(0, 500);
  }

  // Description is more reliable when Hazards[] is corrupted
  const desc = recall.Description.trim();
  if (desc.length > 0) {
    const sentences = desc.match(/[^.!?]+[.!?]+/g) ?? [desc];
    const summary = sentences.slice(0, 2).join(" ").trim();
    if (summary.length > 20) return summary.slice(0, 500);
    return desc.slice(0, 500);
  }

  return recall.Title;
}

/** Avoid "Arizer Arizer Solo III…" when model already includes brand */
export function formatProductDisplayName(brand: string, model: string): string {
  const b = brand.trim();
  const m = model.trim();
  if (!m) return b;
  if (!b) return m;
  if (m.toLowerCase().startsWith(b.toLowerCase())) return m;
  return `${b} ${m}`;
}

export function productDisplayNameFromCpsc(recall: CpscRecall, productIndex = 0): string {
  const p = recall.Products[productIndex];
  if (p?.Name) return p.Name.replace(/®|™/g, "").trim();
  return recall.Title.replace(/®|™/g, "").trim();
}
