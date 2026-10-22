import { describe, it, expect } from "vitest";
import { itemStatus, sortByUrgency, dashboardStats } from "./stats";
import { headerIndex, rowToItem, computeItem, type Item } from "./item";
import { STOCK_ROWS } from "./fixtures";

const today = new Date(2026, 9, 22);
const mk = (o: Partial<Item>): Item => computeItem({ code: "c", no: 1, name: "n", supplier: "", unit: "", received: 5, issued: 0, unitPrice: 1, lot: "", expiry: "", invoice: "", ...o });
const items = STOCK_ROWS.slice(1, -1).map((r) => rowToItem(r, headerIndex(STOCK_ROWS[0])));

describe("stats", () => {
  it("classifies status", () => {
    expect(itemStatus(mk({ expiry: "21/10/2569" }), today)).toBe("expired");
    expect(itemStatus(mk({ expiry: "22/03/2570" }), today)).toBe("expiring");
    expect(itemStatus(mk({ expiry: "22/05/2570", received: 0 }), today)).toBe("out");
    expect(itemStatus(mk({ expiry: "22/05/2570" }), today)).toBe("ok");
    expect(itemStatus(mk({ expiry: "" }), today)).toBe("ok");
  });

  it("an out-of-stock item is never flagged for expiry", () => {
    expect(itemStatus(mk({ expiry: "21/10/2569", received: 0 }), today)).toBe("out");
  });

  it("sorts by urgency", () => {
    const sorted = sortByUrgency([
      mk({ code: "ok", expiry: "" }),
      mk({ code: "out", received: 0 }),
      mk({ code: "exp2", expiry: "01/04/2570" }),
      mk({ code: "exp1", expiry: "01/12/2569" }),
      mk({ code: "dead", expiry: "01/01/2569" }),
    ], today).map((i) => i.code);
    expect(sorted).toEqual(["dead", "exp1", "exp2", "out", "ok"]);
  });

  it("summarises the dashboard", () => {
    const s = dashboardStats(items, today);
    expect(s.total).toBe(11);
    expect(s.stockValue).toBeCloseTo(items.reduce((a, i) => a + i.value, 0));
    expect(s.outOfStock).toBe(3);
    expect(s.expired).toBe(1);
    expect(s.expiring).toBe(1);
    expect(s.byStatus).toEqual({ expired: 1, expiring: 1, out: 3, ok: 6 });
    expect(s.valueBySupplier[0].supplier).toBe("RICH & LESS");
    expect(s.topUsage[0]).toMatchObject({ name: "HCG Strip", pct: 86 });
    expect(s.nextExpiring[0]).toMatchObject({ name: "DCIP", daysLeft: 180 });
    expect(s.nextExpiring.length).toBeLessThanOrEqual(6);
  });
});
