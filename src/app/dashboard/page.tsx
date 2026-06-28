"use client";

import { Suspense } from "react";
import DashboardPage from "./DashboardClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading dashboard…</p>}>
      <DashboardPage />
    </Suspense>
  );
}
