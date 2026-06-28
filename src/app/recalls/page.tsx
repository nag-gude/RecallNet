"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface RecallItem {
  recallId: string;
  title: string;
  publishedAt: string;
  severity: string;
  sourceUrl: string;
}

export default function RecallsPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalls, setRecalls] = useState<RecallItem[]>([]);
  const [source, setSource] = useState("cpsc.gov");

  const loadRecalls = useCallback(async () => {
    const res = await fetch("/api/recalls");
    const data = await res.json();
    setRecalls(data.recalls ?? []);
    setSource(data.source ?? "cpsc.gov");
  }, []);

  useEffect(() => {
    loadRecalls();
  }, [loadRecalls]);

  async function syncRecalls() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/recalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify: true }),
      });
      const data = await res.json();
      setResult(data.message ?? "Sync complete");
      await loadRecalls();
    } catch {
      setResult("CPSC sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-brand-700">
            RecallNet
          </Link>
          <span className="text-slate-400 text-sm">Live recall feed</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Live CPSC recall feed</h1>
        <p className="mt-2 text-slate-600">
          Recalls synced from{" "}
          <a
            href="https://www.saferproducts.gov/"
            className="text-brand-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            SaferProducts.gov
          </a>
          . Sync pulls the latest records and notifies affected owners via{" "}
          <code className="text-sm bg-slate-200 px-1 rounded">ProductOwnersIndex</code>.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={syncRecalls}
            disabled={loading}
            className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Syncing…" : "Sync latest recalls"}
          </button>
          <button
            type="button"
            onClick={loadRecalls}
            className="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-white"
          >
            Refresh list
          </button>
        </div>

        {result && (
          <p className="mt-4 p-4 bg-white border rounded-xl text-sm text-slate-700">{result}</p>
        )}

        <p className="mt-8 text-xs text-slate-500 uppercase tracking-wide">
          Source: {source} · {recalls.length} active recall(s) in catalog
        </p>

        {recalls.length > 0 && (
          <ul className="mt-4 space-y-2">
            {recalls.slice(0, 50).map((r) => (
              <li key={r.recallId} className="text-sm bg-white border rounded-lg px-4 py-3">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">{r.severity}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {r.publishedAt.slice(0, 10)} ·{" "}
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    Official listing
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
