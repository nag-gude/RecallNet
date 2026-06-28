"use client";

import { useEffect, useState } from "react";
import type { ProductInput } from "@/lib/product-input";

interface Props {
  initialUpc?: string;
  onSubmit: (product: ProductInput) => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function ManualProductForm({
  initialUpc = "",
  onSubmit,
  loading = false,
  submitLabel = "Check for recalls",
}: Props) {
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [upc, setUpc] = useState(initialUpc);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [retailer, setRetailer] = useState("");

  useEffect(() => {
    if (initialUpc) setUpc(initialUpc);
  }, [initialUpc]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim() || (brand ? `${brand} product` : "") || `UPC ${upc}`,
      brand: brand.trim() || undefined,
      upc: upc.replace(/\D/g, "") || undefined,
      orderDate,
      retailer: retailer.trim() || undefined,
      quantity: 1,
    });
  }

  const canSubmit = (title.trim() || brand.trim() || upc.replace(/\D/g, "").length >= 8) && !loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="product-title" className="block text-sm font-medium text-slate-700 mb-1">
          Product name
        </label>
        <input
          id="product-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Cosori Dual Blaze Air Fryer"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-brand" className="block text-sm font-medium text-slate-700 mb-1">
            Brand
          </label>
          <input
            id="product-brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Cosori"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="product-upc" className="block text-sm font-medium text-slate-700 mb-1">
            UPC / barcode
          </label>
          <input
            id="product-upc"
            type="text"
            inputMode="numeric"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            placeholder="12-digit UPC"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="purchase-date" className="block text-sm font-medium text-slate-700 mb-1">
            Purchase date
          </label>
          <input
            id="purchase-date"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="retailer" className="block text-sm font-medium text-slate-700 mb-1">
            Store / retailer (optional)
          </label>
          <input
            id="retailer"
            type="text"
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
            placeholder="Any store"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Provide a product name, brand, or UPC — we query live CPSC recall data.
      </p>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Checking…" : submitLabel}
      </button>
    </form>
  );
}
