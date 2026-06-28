"use client";

import Link from "next/link";
import type { DashboardResponse } from "@/lib/types";
import { statusBadge } from "@/lib/format";

interface Props {
  data: DashboardResponse;
}

export default function SafetyGraph({ data }: Props) {
  const alertByProduct = new Map(data.alerts.map((a) => [a.productId, a]));

  return (
    <div className="font-mono text-sm bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
      <div className="text-slate-800 font-semibold mb-4">You</div>
      <ul className="space-y-4 border-l-2 border-brand-200 pl-4">
        {data.products.map((p) => {
          const alert = alertByProduct.get(p.productId);
          const badge = alert ? statusBadge(alert) : null;
          return (
            <li key={p.productId}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">├──</span>
                <span className="font-sans font-medium text-slate-900">{p.name}</span>
                {!alert && <span className="text-xs text-green-600 font-sans">Safe</span>}
              </div>
              {alert && (
                <ul className="mt-2 ml-6 border-l border-red-200 pl-4">
                  <li className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400">└──</span>
                    <span
                      className={`text-xs font-sans px-2 py-0.5 rounded-full border ${badge?.className}`}
                    >
                      {badge?.label}
                    </span>
                    <span className="text-slate-600 font-sans text-xs truncate max-w-md">
                      {alert.hazardDescription.slice(0, 60)}…
                    </span>
                  </li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {data.products.length === 0 && (
        <p className="text-slate-500 font-sans">Upload purchase history to build your safety graph.</p>
      )}
    </div>
  );
}
