"use client";

import { Suspense } from "react";
import GraphClient from "./GraphClient";

export default function GraphPage() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading graph…</p>}>
      <GraphClient />
    </Suspense>
  );
}
