#!/usr/bin/env tsx
/**
 * Sync live CPSC recalls into DynamoDB.
 */
import { DynamoDBStore } from "../src/lib/db/dynamodb";
import { syncRecallsFromCpsc } from "../src/lib/recall-sync";

async function main() {
  const store = new DynamoDBStore();
  const ok = await store.ping();
  if (!ok) {
    console.error("Cannot reach DynamoDB. Check AWS credentials and table names.");
    process.exit(1);
  }

  console.log("Syncing recalls from CPSC SaferProducts.gov…");
  const result = await syncRecallsFromCpsc(store);
  console.log(
    `Done: fetched ${result.fetched}, upserted ${result.upserted}, ${result.newRecallIds.length} new recall(s).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
