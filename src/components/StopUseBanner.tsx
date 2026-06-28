"use client";

import type { UserRecallStatus } from "@/lib/types";

interface Props {
  alert: UserRecallStatus | null;
}

export default function StopUseBanner({ alert }: Props) {
  if (!alert) return null;

  const isBaby = alert.category === "baby";

  return (
    <div
      className="rounded-xl border border-red-300 bg-gradient-to-r from-red-600 to-red-500 p-4 text-white shadow-lg animate-pulse-slow"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          ⚠
        </span>
        <div>
          <p className="font-semibold text-sm uppercase tracking-wide opacity-90">
            Stop Use Immediately
          </p>
          <p className="mt-1 text-lg font-bold">
            {isBaby ? "Infant product recall — " : ""}
            {alert.productName}
          </p>
          <p className="mt-2 text-sm text-red-50 line-clamp-2">{alert.hazardDescription}</p>
        </div>
      </div>
    </div>
  );
}
