export interface ParsedLineItem {
  orderDate: string;
  title: string;
  brand?: string;
  model?: string;
  upc?: string;
  quantity: number;
  price?: number;
  retailer?: string;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export function parseOrderCsv(csv: string): ParsedLineItem[] {
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const dateIdx = idx("order_date");
  const titleIdx = idx("title");
  const brandIdx = idx("brand");
  const modelIdx = idx("model");
  const upcIdx = idx("upc");
  const qtyIdx = idx("quantity");
  const priceIdx = idx("price");
  const retailerIdx = idx("retailer");

  const items: ParsedLineItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const title = titleIdx >= 0 ? cols[titleIdx] : cols[0];
    if (!title) continue;

    items.push({
      orderDate: dateIdx >= 0 ? cols[dateIdx] : new Date().toISOString().slice(0, 10),
      title,
      brand: brandIdx >= 0 ? cols[brandIdx] || undefined : undefined,
      model: modelIdx >= 0 ? cols[modelIdx] || undefined : undefined,
      upc: upcIdx >= 0 ? cols[upcIdx] || undefined : undefined,
      quantity: qtyIdx >= 0 ? parseInt(cols[qtyIdx], 10) || 1 : 1,
      price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || undefined : undefined,
      retailer: retailerIdx >= 0 ? cols[retailerIdx] || undefined : undefined,
    });
  }

  return items;
}

export function parseTextList(text: string): ParsedLineItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        return {
          orderDate: today,
          title: parts.slice(0, -2).join(", "),
          brand: parts[0],
          model: parts[1],
          upc: parts[2],
          quantity: 1,
        };
      }
      return { orderDate: today, title: line, quantity: 1 };
    });
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = tokenize(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  let matches = 0;
  for (const t of tb) {
    if (ta.has(t)) matches++;
  }
  return matches / Math.max(ta.size, tb.length);
}
