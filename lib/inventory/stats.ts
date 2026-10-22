import type { Item } from "./item";
import { addMonths, daysBetween, parseThaiDate, startOfDay } from "./thaiDate";

export type Status = "expired" | "expiring" | "out" | "ok";

export const EXPIRY_WARNING_MONTHS = 6;

export const STATUS_LABEL: Record<Status, string> = {
  expired: "หมดอายุแล้ว",
  expiring: "ใกล้หมดอายุ",
  out: "หมดสต็อก",
  ok: "ปกติ",
};

const RANK: Record<Status, number> = { expired: 0, expiring: 1, out: 2, ok: 3 };

export function itemStatus(item: Item, today: Date): Status {
  if (item.onHand <= 0) return "out";
  const exp = parseThaiDate(item.expiry);
  if (exp) {
    if (exp < startOfDay(today)) return "expired";
    if (exp <= addMonths(startOfDay(today), EXPIRY_WARNING_MONTHS)) return "expiring";
  }
  return "ok";
}

export function sortByUrgency(items: Item[], today: Date): Item[] {
  const key = (i: Item) => parseThaiDate(i.expiry)?.getTime() ?? Infinity;
  return [...items].sort((a, b) => {
    const sa = itemStatus(a, today);
    const sb = itemStatus(b, today);
    if (sa !== sb) return RANK[sa] - RANK[sb];
    if (sa === "expired" || sa === "expiring") return key(a) - key(b);
    return a.onHand - b.onHand || a.no - b.no;
  });
}

export type DashboardStats = {
  total: number;
  stockValue: number;
  outOfStock: number;
  expiring: number;
  expired: number;
  byStatus: Record<Status, number>;
  valueBySupplier: { supplier: string; value: number }[];
  topUsage: { name: string; pct: number; issued: number; received: number }[];
  nextExpiring: { code: string; name: string; expiry: string; daysLeft: number }[];
};

export function dashboardStats(items: Item[], today: Date): DashboardStats {
  const byStatus: Record<Status, number> = { expired: 0, expiring: 0, out: 0, ok: 0 };
  const bySupplier = new Map<string, number>();
  for (const i of items) {
    byStatus[itemStatus(i, today)]++;
    if (i.value > 0) {
      const s = i.supplier || "ไม่ระบุบริษัท";
      bySupplier.set(s, (bySupplier.get(s) ?? 0) + i.value);
    }
  }
  const nextExpiring = items
    .filter((i) => i.onHand > 0)
    .map((i) => ({ i, d: parseThaiDate(i.expiry) }))
    .filter((x): x is { i: Item; d: Date } => !!x.d && x.d >= startOfDay(today))
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .slice(0, 6)
    .map(({ i, d }) => ({ code: i.code, name: i.name, expiry: i.expiry, daysLeft: daysBetween(today, d) }));

  return {
    total: items.length,
    stockValue: Math.round(items.reduce((a, i) => a + i.value, 0) * 100) / 100,
    outOfStock: byStatus.out,
    expiring: byStatus.expiring,
    expired: byStatus.expired,
    byStatus,
    valueBySupplier: [...bySupplier]
      .map(([supplier, value]) => ({ supplier, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    topUsage: items
      .filter((i) => i.received > 0 && i.issued > 0)
      .map((i) => ({ name: i.name, issued: i.issued, received: i.received, pct: Math.round((i.issued / i.received) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 7),
    nextExpiring,
  };
}
