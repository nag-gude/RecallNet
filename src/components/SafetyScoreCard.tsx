"use client";

import type { HouseholdSafetyScore } from "@/lib/types";

const bandColors: Record<HouseholdSafetyScore["band"], string> = {
  Critical: "bg-red-600 text-white border-red-700",
  Elevated: "bg-amber-500 text-white border-amber-600",
  Moderate: "bg-yellow-100 text-yellow-900 border-yellow-300",
  Low: "bg-green-50 text-green-800 border-green-200",
};

export default function SafetyScoreCard({ score }: { score: HouseholdSafetyScore }) {
  return (
    <div className={`rounded-xl border p-5 col-span-full sm:col-span-2 ${bandColors[score.band]}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Household Safety Score</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {score.total}
            <span className="text-lg font-medium opacity-80">/100</span>
          </p>
          <p className="text-sm mt-1 opacity-90">{score.band} risk</p>
        </div>
        <div className="text-sm space-y-1 min-w-[200px]">
          <p className="font-semibold text-xs uppercase opacity-80">Why this score</p>
          {score.factors.map((f) => (
            <p key={f.label} className="flex justify-between gap-4">
              <span>{f.label}</span>
              <span className="font-mono font-semibold">+{f.points}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
