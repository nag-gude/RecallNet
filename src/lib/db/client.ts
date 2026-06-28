import { DynamoDBStore } from "./dynamodb";
import { getMemoryStore } from "./memory";
import type { RecallStore } from "./store";
import { ensureRecallCatalog } from "../recall-sync";

export type StorageMode = "memory" | "dynamodb";

let store: RecallStore | null = null;
let storageMode: StorageMode | null = null;
let initPromise: Promise<RecallStore> | null = null;
let initError: Error | null = null;

function useLocalStore(): boolean {
  if (process.env.USE_LOCAL_STORE === "true") return true;
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_REGION) return true;
  return false;
}

export function getStorageMode(): StorageMode | null {
  return storageMode;
}

export async function getStore(): Promise<RecallStore> {
  if (initError) throw initError;
  if (store) return store;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (useLocalStore()) {
      store = getMemoryStore();
      storageMode = "memory";
    } else {
      const dynamo = new DynamoDBStore();
      const ok = await dynamo.ping();
      if (!ok) {
        const err = new Error(
          "DynamoDB unreachable. Fix AWS credentials or set USE_LOCAL_STORE=true for local-only dev.",
        );
        initError = err;
        initPromise = null;
        throw err;
      }
      store = dynamo;
      storageMode = "dynamodb";
    }
    await ensureRecallCatalog(store);
    return store;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export function resetStoreForTests(): void {
  store = null;
  storageMode = null;
  initPromise = null;
  initError = null;
}
