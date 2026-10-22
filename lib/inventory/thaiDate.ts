const pad = (n: number) => String(n).padStart(2, "0");

/** Parses d/m/y where y is BE (2400+), Gregorian, or two digits. */
export function parseThaiDate(s: string | undefined | null): Date | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*$/.exec(s ?? "");
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  // Two-digit years: 60+ is BE (e.g. 78 → 2578), below that is Gregorian (26 → 2026).
  if (year < 100) year += year >= 60 ? 2500 : 2000;
  if (year > 2400) year -= 543;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function formatThaiDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}
