"use client";

import type { UserRecallStatus } from "@/lib/types";
import { generateRecallExplanation } from "@/lib/recall-explanation";

export default function RecallExplanation({ alert }: { alert: UserRecallStatus }) {
  const text = generateRecallExplanation(alert);

  return (
    <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-2">
        Recall explanation
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
      <p className="text-xs text-slate-400 mt-2">
        Generated from official recall data — not a black-box AI guess.
      </p>
    </div>
  );
}
