"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AlertCounter from "@/components/AlertCounter";
import AlertModal from "@/components/AlertModal";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import StopUseBanner from "@/components/StopUseBanner";
import { formatUsd, statusBadge } from "@/lib/format";
import { getSessionId } from "@/lib/session";
import { primaryStopUseAlert } from "@/lib/sort-alerts";
import type { DashboardResponse, UserRecallStatus } from "@/lib/types";

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRecallStatus | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?userId=${encodeURIComponent(uid)}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    const paramUser = searchParams.get("userId");
    const uid = paramUser || getSessionId();
    setUserId(uid);
    if (uid) load(uid);
    else setLoading(false);
  }, [searchParams, load]);

  async function handleShare() {
    const res = await fetch("/api/report/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (json.url) setShareUrl(json.url);
  }

  const stopUse = data ? primaryStopUseAlert(data.alerts) : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading your safety dashboard…</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Upload purchase history to see your recall alerts.</p>
        <Link href="/upload" className="text-brand-600 font-semibold hover:underline">
          Upload order CSV →
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-brand-700">
              RecallNet
            </Link>
            <span className="text-slate-400 text-sm">Dashboard</span>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/upload" className="text-slate-600 hover:underline">
              Upload
            </Link>
            <Link href="/graph" className="text-slate-600 hover:underline">
              Safety graph
            </Link>
            <Link href="/recalls" className="text-slate-600 hover:underline">
              Live recalls
            </Link>
          </nav>
        </div>
      </header>

      {stopUse && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button type="button" onClick={() => setSelected(stopUse)} className="w-full text-left">
            <StopUseBanner alert={stopUse} />
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {!data || data.products.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No purchase history yet</h2>
            <p className="mt-2 text-slate-600">
              Upload your order CSV to scan against live CPSC recall data.
            </p>
            <Link
              href="/upload"
              className="inline-block mt-6 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700"
            >
              Upload purchases
            </Link>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${data.summary.eligibleRemedyValueUsd > 0 ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <p className="text-sm text-slate-500">Products owned</p>
                <p className="text-3xl font-bold text-slate-900">
                  <AlertCounter target={data.summary.productsOwned} />
                </p>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <p className="text-sm text-slate-500">Active recalls</p>
                <p className="text-3xl font-bold text-red-600">
                  <AlertCounter target={data.summary.activeRecalls} />
                </p>
              </div>
              {data.summary.eligibleRemedyValueUsd > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm md:col-span-2">
                  <p className="text-sm text-slate-500">Eligible remedy value</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {formatUsd(data.summary.eligibleRemedyValueUsd)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Estimated from purchase price where CPSC omits value</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <SafetyScoreCard score={data.summary.householdSafetyScore} />
            </div>

            <div className="mt-8 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Recall alerts</h2>
              <button
                type="button"
                onClick={handleShare}
                className="text-sm text-brand-600 hover:underline"
              >
                Share safety report
              </button>
            </div>
            {shareUrl && (
              <p className="mt-2 text-sm text-slate-600">
                Report link:{" "}
                <a href={shareUrl} className="text-brand-600 break-all">
                  {shareUrl}
                </a>
              </p>
            )}

            {data.alerts.length === 0 ? (
              <p className="mt-4 text-slate-600 bg-white border rounded-xl p-6">
                No recalls matched your products against live CPSC data.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.alerts.map((alert) => {
                  const badge = statusBadge(alert);
                  return (
                  <li key={alert.recallId}>
                    <button
                      type="button"
                      onClick={() => setSelected(alert)}
                      className="w-full text-left bg-white border rounded-xl p-4 hover:border-brand-300 transition-colors"
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{alert.productName}</p>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {alert.hazardDescription}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}

            <h2 className="mt-10 text-lg font-semibold text-slate-900">Your products</h2>
            <ul className="mt-4 space-y-2">
              {data.products.map((p) => (
                <li
                  key={p.productId}
                  className="flex justify-between bg-white border rounded-lg px-4 py-3 text-sm"
                >
                  <span className="text-slate-800">{p.name}</span>
                  <span className="text-slate-500">{p.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AlertModal alert={selected} open={!!selected} onClose={() => setSelected(null)} />
    </main>
  );
}
