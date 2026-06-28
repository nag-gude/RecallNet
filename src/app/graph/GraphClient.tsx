"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SafetyGraph from "@/components/SafetyGraph";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import { getSessionId } from "@/lib/session";
import type { DashboardResponse } from "@/lib/types";

export default function GraphClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?userId=${encodeURIComponent(uid)}`);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const paramUser = searchParams.get("userId");
    const uid = paramUser || getSessionId();
    if (uid) load(uid);
    else setLoading(false);
  }, [searchParams, load]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-brand-700">
            RecallNet
          </Link>
          <span className="text-slate-400 text-sm">Safety graph</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-slate-600">Loading graph…</p>
        ) : !data || data.products.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-slate-600">Upload purchase history to build your safety graph.</p>
            <Link href="/upload" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
              Upload order CSV →
            </Link>
          </div>
        ) : (
          <>
            <SafetyScoreCard score={data.summary.householdSafetyScore} />
            <SafetyGraph data={data} />
          </>
        )}
      </div>
    </main>
  );
}
