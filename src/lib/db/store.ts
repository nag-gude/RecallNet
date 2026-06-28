import type {
  DashboardResponse,
  IngestResponse,
  OwnershipEvent,
  Product,
  RecallEvent,
  ShareReport,
  UserRecallStatus,
} from "../types";

export interface RecallStore {
  ping(): Promise<boolean>;

  getProduct(productId: string): Promise<Product | null>;
  putProduct(product: Product): Promise<void>;
  listProducts(): Promise<Product[]>;
  findProductByUpc(upc: string): Promise<Product | null>;
  findProductByTokens(brand: string, model: string): Promise<Product | null>;

  putOwnershipEvent(event: OwnershipEvent): Promise<void>;
  listOwnershipByUser(userId: string): Promise<OwnershipEvent[]>;
  listOwnersByProduct(productId: string): Promise<string[]>;

  putRecallEvent(recall: RecallEvent): Promise<void>;
  getRecall(recallId: string): Promise<RecallEvent | null>;
  listActiveRecalls(): Promise<RecallEvent[]>;
  listRecallsForProduct(productId: string): Promise<RecallEvent[]>;

  putUserRecallStatus(status: UserRecallStatus): Promise<void>;
  listUserRecallStatus(userId: string): Promise<UserRecallStatus[]>;
  deleteUserRecallStatus(userId: string, recallId: string): Promise<void>;

  putShareReport(report: ShareReport): Promise<void>;
  getShareReport(token: string): Promise<ShareReport | null>;
}

export type { DashboardResponse, IngestResponse };
