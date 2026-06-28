import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-brand-700 text-lg">RecallNet</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/upload" className="text-slate-600 hover:text-brand-600">
              Add product
            </Link>
            <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
              Dashboard
            </Link>
            <Link href="/recalls" className="text-slate-600 hover:text-brand-600">
              Recalls
            </Link>
            <Link href="/graph" className="text-slate-600 hover:text-brand-600">
              Safety graph
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
          Consumer product safety
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-3xl">
          Millions of products are recalled every year — most owners never find out.
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl">
          Retailer notifications are inconsistent and fragmented across stores and channels.{" "}
          <a
            href="https://www.saferproducts.gov/"
            className="text-brand-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            SaferProducts.gov
          </a>{" "}
          lets you search if you already know the product.{" "}
          <strong className="text-slate-800">
            RecallNet connects what you own to live CPSC recall data.
          </strong>
        </p>
        <p className="mt-4 text-slate-500 max-w-2xl">
          Upload your purchase history from any retailer — scan a barcode, enter a product, or paste a CSV.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/upload"
            className="inline-flex px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 shadow-sm"
          >
            Scan or add product
          </Link>
          <Link
            href="/recalls"
            className="inline-flex px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-white"
          >
            Live recall feed
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Scan with camera",
              body: "Point your phone at a product UPC — instant lookup against live CPSC recalls.",
            },
            {
              title: "Live CPSC matching",
              body: "Each product is checked against SaferProducts.gov recall records as you upload.",
            },
            {
              title: "Actionable alerts",
              body: "Explainable match confidence, hazard details, and official source links on every alert.",
            },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
