export const thb = (n: number, digits = 0) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Today's calendar date in Thailand, as a local-midnight Date (servers usually run in UTC). */
export function bangkokToday(now = new Date()): Date {
  const [y, m, d] = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const thaiLongDate = (d: Date) =>
  d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
