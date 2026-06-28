import { NextResponse } from "next/server";
import { getStore, getStorageMode } from "@/lib/db/client";

export async function GET() {
  try {
    const store = await getStore();
    const ok = await store.ping();
    const storage = getStorageMode() ?? "memory";
    const recalls = await store.listActiveRecalls();

    return NextResponse.json({
      status: ok ? "ok" : "degraded",
      storage,
      recallSource: "cpsc.gov",
      recallsInCatalog: recalls.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        status: "error",
        storage: "unavailable",
        recallSource: "cpsc.gov",
        error: err instanceof Error ? err.message : "Store initialization failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
