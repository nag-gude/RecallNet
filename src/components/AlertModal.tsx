"use client";

import type { UserRecallStatus } from "@/lib/types";
import { statusBadge, formatUsd } from "@/lib/format";
import RecallExplanation from "@/components/RecallExplanation";

interface Props {
  alert: UserRecallStatus | null;
  open: boolean;
  onClose: () => void;
}

export default function AlertModal({ alert, open, onClose }: Props) {
  if (!open || !alert) return null;

  const badge = statusBadge(alert);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-xl font-bold text-slate-900">{alert.productName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${badge.className}`}>
          {badge.label}
        </span>

        <RecallExplanation alert={alert} />

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Hazard</dt>
            <dd className="text-slate-800 mt-0.5">{alert.hazardDescription}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Match confidence</dt>
            <dd className="text-slate-800 mt-0.5">
              {alert.matchConfidence} — {alert.matchReason}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Eligibility</dt>
            <dd className="text-slate-800 mt-0.5">{alert.eligibility}</dd>
          </div>
          {alert.eligibility === "ELIGIBLE" && alert.remedyValueUsd != null && alert.remedyValueUsd > 0 && (
            <div>
              <dt className="text-slate-500">Estimated remedy value</dt>
              <dd className="text-green-700 font-semibold mt-0.5">{formatUsd(alert.remedyValueUsd)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {alert.claimUrl && alert.eligibility === "ELIGIBLE" && (
            <a
              href={alert.claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Submit claim
            </a>
          )}
          <a
            href={alert.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View CPSC listing
          </a>
        </div>
      </div>
    </div>
  );
}
