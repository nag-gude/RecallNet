"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import ManualProductForm from "@/components/ManualProductForm";
import { getSessionId } from "@/lib/session";
import { VIDEO_DEMO_CSV } from "@/lib/live-demo-csv";
import { ingestCsv, ingestProduct, type ProductInput } from "@/lib/product-input";

type Tab = "scan" | "manual" | "csv";

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scan");
  const [csv, setCsv] = useState("");
  const [scannedUpc, setScannedUpc] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function runIngest(
    fn: () => Promise<{ recallsFound: number; itemsParsed: number }>,
    successVerb: string,
  ) {
    setError("");
    setLoading(true);
    setProgress("Querying live CPSC recall data…");

    try {
      const userId = getSessionId();
      if (!userId) throw new Error("Session unavailable — refresh and try again");

      const data = await fn();
      setProgress(`${successVerb} — ${data.recallsFound} recall(s) found`);
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }

  function handleProductSubmit(product: ProductInput, source: "MANUAL" | "BARCODE_SCAN") {
    const userId = getSessionId();
    if (!userId) {
      setError("Session unavailable — refresh and try again");
      return;
    }
    runIngest(
      () => ingestProduct({ userId, product, source }),
      `Checked ${product.title || "product"}`,
    );
  }

  function handleCsvSubmit(e: React.FormEvent) {
    e.preventDefault();
    const userId = getSessionId();
    if (!userId) {
      setError("Session unavailable — refresh and try again");
      return;
    }
    runIngest(() => ingestCsv(userId, csv), `Matched ${csv.split("\n").length - 1} products`);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "scan", label: "Scan barcode" },
    { id: "manual", label: "Enter manually" },
    { id: "csv", label: "Bulk CSV" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-brand-700">
            RecallNet
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 text-sm">Add products</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Add a product</h1>
        <p className="mt-2 text-slate-600">
          Scan a barcode with your camera, enter product details manually, or paste a bulk order CSV.
          Each product is checked against live CPSC recall data.
        </p>

        <div className="mt-8 flex gap-1 p-1 bg-slate-200 rounded-xl" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setError("");
                setProgress("");
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "scan" && (
            <div className="space-y-6">
              {!scannedUpc ? (
                <BarcodeScanner
                  onScan={(upc) => {
                    setScannedUpc(upc);
                    setError("");
                  }}
                  onError={setError}
                />
              ) : (
                <div className="bg-white border border-brand-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600">Barcode scanned</p>
                  <p className="font-mono text-lg font-semibold text-brand-700 mt-1">{scannedUpc}</p>
                  <button
                    type="button"
                    onClick={() => setScannedUpc("")}
                    className="mt-2 text-sm text-slate-500 hover:underline"
                  >
                    Scan again
                  </button>
                </div>
              )}

              {scannedUpc && (
                <ManualProductForm
                  key={scannedUpc}
                  initialUpc={scannedUpc}
                  loading={loading}
                  submitLabel="Check this product for recalls"
                  onSubmit={(product) => handleProductSubmit(product, "BARCODE_SCAN")}
                />
              )}
            </div>
          )}

          {tab === "manual" && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Live CPSC test: enter brand <strong>Cosori</strong> and product name{" "}
                <strong>Dual Blaze Air Fryer</strong> (or model <strong>Air Fryer</strong>).
              </p>
              <ManualProductForm
                loading={loading}
                onSubmit={(product) => handleProductSubmit(product, "MANUAL")}
              />
            </>
          )}

          {tab === "csv" && (
            <form onSubmit={handleCsvSubmit} className="space-y-4">
              <div>
                <div className="flex flex-wrap gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setCsv(VIDEO_DEMO_CSV)}
                    className="text-sm text-brand-600 hover:underline font-medium"
                  >
                    Load video demo CSV (live CPSC products)
                  </button>
                </div>
                <label htmlFor="csv" className="text-sm font-medium text-slate-700 block mb-2">
                  Order CSV
                </label>
                <textarea
                  id="csv"
                  rows={12}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  placeholder={"order_date,title,brand,model,upc,quantity,price,retailer\n2024-01-15,Product Name,Brand,Model,123456789012,1,49.99,Store"}
                  className="w-full font-mono text-sm border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !csv.trim()}
                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Scanning…" : "Upload CSV & scan"}
              </button>
            </form>
          )}
        </div>

        {progress && (
          <p className="mt-4 text-sm text-brand-700 font-medium" role="status">
            {progress}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
