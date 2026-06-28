export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";
export type Eligibility = "ELIGIBLE" | "EXPIRED" | "UNKNOWN";
export type Severity = "STOP_USE" | "REPAIR" | "REFUND" | "INFORMATIONAL";
export type RemedyType = "REPLACEMENT" | "REFUND" | "REPAIR_KIT" | "DISPOSE";
export type ActionRequired = "STOP_USE" | "SUBMIT_CLAIM" | "REGISTER" | "NONE";
export type EventType = "PURCHASE" | "RETURN" | "CONFIRMED";
export type EventSource = "AMAZON_CSV" | "RECEIPT_OCR" | "MANUAL" | "BARCODE_SCAN";
export type RecallAgency = "CPSC" | "FDA" | "NHTSA" | "MANUFACTURER";
export type RecallStatus = "ACTIVE" | "RESOLVED";

export interface Product {
  productId: string;
  brand: string;
  model: string;
  category: string;
  upc?: string;
  imageUrl?: string;
  aliases?: string[];
  createdAt: string;
}

export interface OwnershipEvent {
  userId: string;
  eventId: string;
  productId: string;
  eventType: EventType;
  source: EventSource;
  purchaseDate: string;
  serialNumber?: string;
  metadata?: {
    orderId?: string;
    retailer?: string;
    quantity?: number;
    price?: number;
    title?: string;
  };
  timestamp: string;
}

export interface EligibilityRules {
  /** When affected units were sold (parsed from CPSC retailer text) */
  saleWindow?: { start: string; end: string };
  /** Last day to file a remedy claim; after this → EXPIRED */
  claimDeadline?: string;
  /** @deprecated Legacy field — use saleWindow + claimDeadline */
  dateRange?: { start: string; end: string };
  serialPrefixes?: string[];
  regions?: string[];
  remedyValueUsd?: number;
}

export interface RecallEvent {
  recallId: string;
  publishedAt: string;
  productIds: string[];
  severity: Severity;
  agency: RecallAgency;
  hazardDescription: string;
  remedyType: RemedyType;
  eligibilityRules: EligibilityRules;
  sourceUrl: string;
  claimUrl?: string;
  status: RecallStatus;
  title: string;
}

export interface UserRecallStatus {
  userId: string;
  recallId: string;
  productId: string;
  productName: string;
  matchConfidence: MatchConfidence;
  matchReason: string;
  eligibility: Eligibility;
  severity: Severity;
  remedyType: RemedyType;
  actionRequired: ActionRequired;
  claimUrl?: string;
  sourceUrl: string;
  hazardDescription: string;
  notifiedAt: string;
  resolvedAt?: string;
  remedyValueUsd?: number;
  category: string;
}

export interface RiskFactor {
  label: string;
  points: number;
}

export interface HouseholdSafetyScore {
  total: number;
  band: "Critical" | "Elevated" | "Moderate" | "Low";
  factors: RiskFactor[];
}

export interface DashboardSummary {
  productsOwned: number;
  activeRecalls: number;
  eligibleRemedyValueUsd: number;
  stopUseCount: number;
  householdSafetyScore: HouseholdSafetyScore;
}

export interface DashboardResponse {
  userId: string;
  summary: DashboardSummary;
  alerts: UserRecallStatus[];
  products: Array<{
    productId: string;
    name: string;
    purchaseDate: string;
    status: "SAFE" | "RECALLED" | "ACTION_REQUIRED" | "EXPIRED";
  }>;
}

export interface IngestResponse {
  itemsParsed: number;
  productsMatched: number;
  recallsFound: number;
  alerts: UserRecallStatus[];
}

export interface ShareReport {
  token: string;
  createdAt: string;
  userId: string;
  items: Array<{
    productName: string;
    severity: Severity;
    eligibility: Eligibility;
    actionRequired: ActionRequired;
  }>;
}
