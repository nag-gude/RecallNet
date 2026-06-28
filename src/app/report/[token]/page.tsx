"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportItem {
  productName: string;
  severity: string;
  eligibility: string;
  actionRequired: string;
}

export default function ReportPage({ params }: { params: { token: string } }) {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/report/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items ?? []);
      });
  }, [params.token]);

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-brand-600 text-sm hover:underline">
          RecallNet
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Shared Safety Report</h1>
        <p className="text-sm text-slate-500 mt-1">No personal information — product alerts only.</p>

        {error && <p className="mt-4 text-red-600">{error}</p>}

        <ul className="mt-6 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="bg-white border rounded-xl p-4">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-slate-500 mt-1">
                {item.severity} · {item.eligibility} · {item.actionRequired}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
