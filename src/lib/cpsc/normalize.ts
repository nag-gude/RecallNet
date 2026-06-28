import type { Product, RecallEvent, RecallAgency, RemedyType, Severity } from "../types";
import type { CpscRecall } from "./types";
import { extractHazardDescription, formatProductDisplayName } from "./hazard-text";
import { extractSaleWindow } from "./sale-window";

const STOP_USE_KEYWORDS =
  /\b(stop using|stop use|choking|suffocation|fire|burn|explosion|death|serious injury|overheat)\b/i;

function inferSeverity(recall: CpscRecall): Severity {
  const hazardText = extractHazardDescription(recall);
  const text = `${recall.Title} ${hazardText}`;
  if (STOP_USE_KEYWORDS.test(text)) return "STOP_USE";
  if (/\brefund\b/i.test(text)) return "REFUND";
  if (/\brepair\b/i.test(text)) return "REPAIR";
  return "INFORMATIONAL";
}

function inferRemedyType(recall: CpscRecall): RemedyType {
  const option = recall.RemedyOptions[0]?.Option?.toLowerCase() ?? "";
  const remedy = recall.Remedies[0]?.Name?.toLowerCase() ?? "";
  const combined = `${option} ${remedy}`;
  if (/\breplace/i.test(combined)) return "REPLACEMENT";
  if (/\brefund/i.test(combined)) return "REFUND";
  if (/\brepair/i.test(combined)) return "REPAIR_KIT";
  return "DISPOSE";
}

function inferCategory(recall: CpscRecall): string {
  const text = `${recall.Title} ${recall.Products.map((p) => p.Name).join(" ")}`.toLowerCase();
  if (/\b(infant|baby|child|toddler|kids|youth|stroller| crib|rocker|swing)\b/.test(text)) {
    return "baby";
  }
  if (/\b(kitchen|air fryer|cookware|appliance|coffee|blender|pot)\b/.test(text)) {
    return "kitchen";
  }
  if (/\b(electronic|battery|charger|phone|laptop|vaporizer)\b/.test(text)) {
    return "electronics";
  }
  return "general";
}

function extractBrandModel(productName: string): { brand: string; model: string } {
  const cleaned = productName.replace(/®|™/g, "").trim();
  const parts = cleaned.split(/\s+/);
  const brand = parts[0] ?? "Unknown";
  const model = parts.slice(1).join(" ") || cleaned;
  return { brand, model };
}

function buildProducts(recall: CpscRecall): Product[] {
  const now = new Date().toISOString();
  const category = inferCategory(recall);
  const products: Product[] = [];

  const upcs = recall.ProductUPCs.map((u) => u.UPC.replace(/\D/g, "")).filter(Boolean);

  if (recall.Products.length === 0) {
    const productId = upcs[0]
      ? `PRODUCT#${upcs[0]}`
      : `PRODUCT#CPSC-${recall.RecallNumber}`;
    const { brand, model } = extractBrandModel(recall.Title);
    products.push({
      productId,
      brand,
      model,
      category,
      upc: upcs[0],
      createdAt: now,
    });
    return products;
  }

  recall.Products.forEach((p, index) => {
    const upc = upcs[index] ?? upcs[0];
    const productId = upc ? `PRODUCT#${upc}` : `PRODUCT#CPSC-${recall.RecallNumber}-${index}`;
    const { brand, model } = extractBrandModel(p.Name);
    const displayModel = p.Model || p.Name || model;
    products.push({
      productId,
      brand,
      model: formatProductDisplayName(brand, displayModel),
      category,
      upc,
      aliases: [p.Name, recall.Title].filter(Boolean),
      createdAt: now,
    });
  });

  return products;
}

function extractClaimUrl(recall: CpscRecall): string | undefined {
  const contact = recall.ConsumerContact ?? "";
  const urlMatch = contact.match(/https?:\/\/[^\s,)]+/i);
  if (urlMatch) return urlMatch[0].replace(/[.)]+$/, "");
  const remedy = recall.Remedies[0]?.Name ?? "";
  const remedyUrl = remedy.match(/https?:\/\/[^\s,)]+/i);
  return remedyUrl?.[0]?.replace(/[.)]+$/, "");
}

export function normalizeCpscRecall(recall: CpscRecall): { recall: RecallEvent; products: Product[] } {
  const products = buildProducts(recall);
  const hazardDescription = extractHazardDescription(recall);

  const saleWindow = extractSaleWindow(recall);

  const recallEvent: RecallEvent = {
    recallId: `CPSC-${recall.RecallNumber}`,
    publishedAt: recall.LastPublishDate || recall.RecallDate,
    productIds: products.map((p) => p.productId),
    severity: inferSeverity(recall),
    agency: "CPSC" as RecallAgency,
    title: recall.Title,
    hazardDescription,
    remedyType: inferRemedyType(recall),
    eligibilityRules: {
      saleWindow: saleWindow ?? undefined,
      // Active CPSC recalls — no structured claim deadline in API; treat as open
      claimDeadline: "2099-12-31",
    },
    sourceUrl: recall.URL,
    claimUrl: extractClaimUrl(recall),
    status: "ACTIVE",
  };

  return { recall: recallEvent, products };
}
