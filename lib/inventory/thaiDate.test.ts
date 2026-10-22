import { describe, it, expect } from "vitest";
import { parseThaiDate, formatThaiDate, addMonths, daysBetween } from "./thaiDate";

const ymd = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("thaiDate", () => {
  it("parses Buddhist-era dates", () => expect(ymd(parseThaiDate("28/05/2570"))).toEqual([2027, 5, 28]));
  it("parses two-digit BE years", () => expect(ymd(parseThaiDate("26/01/78"))).toEqual([2035, 1, 26]));
  it("parses Gregorian years", () => expect(ymd(parseThaiDate("1/12/2026"))).toEqual([2026, 12, 1]));
  it("returns null for junk", () => {
    expect(parseThaiDate("abc")).toBeNull();
    expect(parseThaiDate("")).toBeNull();
    expect(parseThaiDate("31/02/2570")).toBeNull();
  });
  it("formats as dd/mm/yyyy BE", () => expect(formatThaiDate(new Date(2027, 4, 1))).toBe("01/05/2570"));
  it("adds months and counts days", () => {
    expect(ymd(addMonths(new Date(2026, 9, 22), 6))).toEqual([2027, 4, 22]);
    expect(daysBetween(new Date(2026, 9, 22), new Date(2027, 3, 20))).toBe(180);
  });
});

describe("two-digit years", () => {
  it("reads yy < 60 as Gregorian 20yy", () => expect(ymd(parseThaiDate("1/12/26"))).toEqual([2026, 12, 1]));
});
