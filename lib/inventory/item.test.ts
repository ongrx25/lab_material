import { describe, it, expect } from "vitest";
import { parseNumber, headerIndex, rowToItem, itemToRow, computeItem, itemInputSchema, MissingColumnError } from "./item";
import { STOCK_HEADER, STOCK_ROWS } from "./fixtures";

const base = { name: "X", supplier: "S", unit: "Box", received: 500, issued: 430, unitPrice: 10, lot: "", expiry: "", invoice: "" };

describe("item", () => {
  it("parses formatted numbers", () => {
    expect(parseNumber(" 4,368.00")).toBe(4368);
    expect(parseNumber("")).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber("abc")).toBe(0);
  });

  it("finds columns by trimmed header and throws listing missing ones", () => {
    const cols = headerIndex(STOCK_HEADER);
    expect(cols.unit).toBe(4);
    expect(cols.no).toBe(0);
    expect(() => headerIndex(STOCK_HEADER.filter((h) => h !== "In"))).toThrow(MissingColumnError);
    expect(() => headerIndex(STOCK_HEADER.filter((h) => h !== "In"))).toThrow(/In/);
  });

  it("maps a row to an item and back", () => {
    const cols = headerIndex(STOCK_HEADER);
    const item = rowToItem(STOCK_ROWS[3], cols);
    expect(item).toMatchObject({ no: 3, code: "LAB-03", name: "DTX Strip", unit: "Box", received: 200, issued: 158, onHand: 42, unitPrice: 350, lot: "200092", expiry: "26/02/2571" });
    const row = itemToRow(item, cols, STOCK_HEADER.length);
    expect(row).toHaveLength(13);
    expect(row[cols.code]).toBe("LAB-03");
    expect(row[cols.onHand]).toBe(42);
  });

  it("computes on-hand and value", () => {
    const item = computeItem({ ...base, code: "LAB-1", no: 1 });
    expect(item.onHand).toBe(70);
    expect(item.value).toBe(700);
    expect(computeItem({ ...base, unitPrice: 0.333, received: 3, issued: 0, code: "c", no: 1 }).value).toBe(1);
  });

  it("validates input", () => {
    const bad = itemInputSchema.safeParse({ ...base, issued: 600 });
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error?.issues)).toContain("จำนวนจ่ายต้องไม่เกินจำนวนรับ");
    expect(itemInputSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(itemInputSchema.safeParse({ ...base, received: "12", issued: "2" }).data?.received).toBe(12);
  });
});

describe("legacy rows", () => {
  it("treats a quantity with blank In/Out as received stock", () => {
    const cols = headerIndex(STOCK_HEADER);
    const item = rowToItem(["12", "LAB-12", "Blood lancet", "", "Box", "", "", "300", "0", "0", "", "", ""], cols);
    expect(item.received).toBe(300);
    expect(item.onHand).toBe(300);
  });
});
