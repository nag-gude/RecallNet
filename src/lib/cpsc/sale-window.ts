import type { CpscRecall } from "./types";

const SALE_WINDOW_RE =
  /\bfrom\s+([A-Za-z]+\s+\d{4})\s+through\s+([A-Za-z]+\s+\d{4})\b/i;

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parseMonthYear(monthYear: string): { year: number; month: number } | null {
  const match = monthYear.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_INDEX[match[1].toLowerCase()];
  const year = parseInt(match[2], 10);
  if (month === undefined || Number.isNaN(year)) return null;
  return { year, month };
}

function monthStart(monthYear: string): string | null {
  const parsed = parseMonthYear(monthYear);
  if (!parsed) return null;
  const mm = String(parsed.month + 1).padStart(2, "0");
  return `${parsed.year}-${mm}-01`;
}

function monthEnd(monthYear: string): string | null {
  const parsed = parseMonthYear(monthYear);
  if (!parsed) return null;
  const lastDay = new Date(parsed.year, parsed.month + 1, 0).getDate();
  const mm = String(parsed.month + 1).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return `${parsed.year}-${mm}-${dd}`;
}

/** Parse "sold from June 2018 through December 2022" from CPSC retailer/description text */
export function parseSaleWindowText(text: string): { start: string; end: string } | null {
  const match = SALE_WINDOW_RE.exec(text);
  if (!match) return null;

  const start = monthStart(match[1]);
  const end = monthEnd(match[2]);
  if (!start || !end || start > end) return null;

  return { start, end };
}

/** Extract affected-unit sale window from a CPSC recall record */
export function extractSaleWindow(recall: CpscRecall): { start: string; end: string } | null {
  const texts = [
    recall.Description,
    ...(recall.Retailers?.map((r) => r.Name) ?? []),
    ...recall.Products.map((p) => p.Description ?? ""),
  ].filter(Boolean);

  for (const text of texts) {
    const window = parseSaleWindowText(text);
    if (window) return window;
  }
  return null;
}
