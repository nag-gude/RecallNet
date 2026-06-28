import type { RecallStore } from "./store";
import type {
  OwnershipEvent,
  Product,
  RecallEvent,
  ShareReport,
  UserRecallStatus,
} from "../types";

export class MemoryStore implements RecallStore {
  private products = new Map<string, Product>();
  private ownership: OwnershipEvent[] = [];
  private recalls = new Map<string, RecallEvent>();
  private statuses: UserRecallStatus[] = [];
  private reports = new Map<string, ShareReport>();

  async ping(): Promise<boolean> {
    return true;
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) ?? null;
  }

  async putProduct(product: Product): Promise<void> {
    this.products.set(product.productId, product);
  }

  async listProducts(): Promise<Product[]> {
    return [...this.products.values()];
  }

  async findProductByUpc(upc: string): Promise<Product | null> {
    for (const p of this.products.values()) {
      if (p.upc === upc) return p;
    }
    return null;
  }

  async findProductByTokens(brand: string, model: string): Promise<Product | null> {
    const b = brand.toLowerCase();
    const m = model.toLowerCase();
    for (const p of this.products.values()) {
      if (p.brand.toLowerCase().includes(b) || b.includes(p.brand.toLowerCase())) {
        if (p.model.toLowerCase().includes(m) || m.includes(p.model.toLowerCase())) {
          return p;
        }
      }
    }
    return null;
  }

  async putOwnershipEvent(event: OwnershipEvent): Promise<void> {
    this.ownership.push(event);
  }

  async listOwnershipByUser(userId: string): Promise<OwnershipEvent[]> {
    return this.ownership.filter((e) => e.userId === userId);
  }

  async listOwnersByProduct(productId: string): Promise<string[]> {
    return [...new Set(this.ownership.filter((e) => e.productId === productId).map((e) => e.userId))];
  }

  async putRecallEvent(recall: RecallEvent): Promise<void> {
    this.recalls.set(recall.recallId, recall);
  }

  async getRecall(recallId: string): Promise<RecallEvent | null> {
    return this.recalls.get(recallId) ?? null;
  }

  async listActiveRecalls(): Promise<RecallEvent[]> {
    return [...this.recalls.values()]
      .filter((r) => r.status === "ACTIVE")
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async listRecallsForProduct(productId: string): Promise<RecallEvent[]> {
    return [...this.recalls.values()].filter((r) => r.productIds.includes(productId));
  }

  async putUserRecallStatus(status: UserRecallStatus): Promise<void> {
    const idx = this.statuses.findIndex(
      (s) => s.userId === status.userId && s.recallId === status.recallId,
    );
    if (idx >= 0) this.statuses[idx] = status;
    else this.statuses.push(status);
  }

  async listUserRecallStatus(userId: string): Promise<UserRecallStatus[]> {
    return this.statuses.filter((s) => s.userId === userId);
  }

  async deleteUserRecallStatus(userId: string, recallId: string): Promise<void> {
    this.statuses = this.statuses.filter((s) => !(s.userId === userId && s.recallId === recallId));
  }

  async putShareReport(report: ShareReport): Promise<void> {
    this.reports.set(report.token, report);
  }

  async getShareReport(token: string): Promise<ShareReport | null> {
    return this.reports.get(token) ?? null;
  }
}

const GLOBAL_KEY = "__recallnetMemoryStore";

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: MemoryStore };

/** Process-wide singleton — Next.js route handlers must share one in-memory store. */
export function getMemoryStore(): MemoryStore {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new MemoryStore();
  }
  return g[GLOBAL_KEY];
}
