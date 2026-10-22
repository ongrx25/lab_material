import { TABS, type SheetGateway } from "@/lib/sheets/gateway";
import { computeItem, headerIndex, itemToRow, rowToItem, type ColumnMap, type Item, type ItemFormValues } from "./item";

export class ItemNotFoundError extends Error {
  constructor(code: string) {
    super(`ไม่พบรายการ ${code} — อาจถูกลบหรือเปลี่ยนแปลงไปแล้ว`);
  }
}

type Sheet = {
  rows: string[][];
  cols: ColumnMap;
  width: number;
  /** 1-based row number of each item, keyed by item code. */
  rowOf: Map<string, number>;
  items: Item[];
  /** 1-based row of the trailing total row, if any. */
  totalRow: number | null;
};

async function load(g: SheetGateway): Promise<Sheet> {
  const rows = await g.read(TABS.stock);
  const cols = headerIndex(rows[0] ?? []);
  const width = Math.max(rows[0]?.length ?? 0, ...Object.values(cols).map((c) => c + 1));
  const rowOf = new Map<string, number>();
  const items: Item[] = [];
  let totalRow: number | null = null;
  rows.forEach((row, i) => {
    if (i === 0) return;
    const code = (row[cols.code] ?? "").trim();
    if (code) {
      rowOf.set(code, i + 1);
      items.push(rowToItem(row, cols));
    } else if (row.some((c) => (c ?? "").trim() !== "")) {
      totalRow = i + 1;
    }
  });
  return { rows, cols, width, rowOf, items, totalRow };
}

export async function listItems(g: SheetGateway): Promise<Item[]> {
  return (await load(g)).items;
}

function nextCode(items: Item[]): string {
  const max = Math.max(0, ...items.map((i) => Number(/(\d+)$/.exec(i.code)?.[1] ?? 0)));
  return `LAB-${String(max + 1).padStart(2, "0")}`;
}

const colLetter = (i: number): string => (i >= 26 ? colLetter(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

/**
 * Points the total row at all item rows with a SUM formula, so it stays right after inserts/deletes
 * made by the app or by hand. The formula goes where the sheet already shows the total.
 */
async function writeTotal(g: SheetGateway) {
  const s = await load(g);
  if (s.totalRow === null) return;
  const row = [...(s.rows[s.totalRow - 1] ?? [])];
  while (row.length < s.width) row.push("");
  const existing = row.findIndex((c) => /\d/.test(c ?? ""));
  const target = existing >= 0 ? existing : s.cols.value;
  const col = colLetter(s.cols.value);
  row[target] = `=SUM(${col}2:${col}${s.totalRow - 1})`;
  await g.update(TABS.stock, s.totalRow, row);
}

export async function createItem(g: SheetGateway, input: ItemFormValues): Promise<Item> {
  const s = await load(g);
  const item = computeItem({
    ...input,
    code: nextCode(s.items),
    no: Math.max(0, ...s.items.map((i) => i.no)) + 1,
  });
  let target: number;
  if (s.totalRow !== null) {
    target = s.totalRow;
    await g.insertRowBefore(TABS.stock, target);
  } else {
    target = s.rows.length + 1;
  }
  await g.update(TABS.stock, target, itemToRow(item, s.cols, s.width));
  await writeTotal(g);
  return item;
}

export async function updateItem(g: SheetGateway, code: string, input: ItemFormValues): Promise<Item> {
  const s = await load(g);
  const row = s.rowOf.get(code);
  if (!row) throw new ItemNotFoundError(code);
  const existing = s.items.find((i) => i.code === code)!;
  const item = computeItem({ ...input, code, no: existing.no });
  // Preserve cells in columns the app does not manage.
  const merged = itemToRow(item, s.cols, s.width).map((v, i) =>
    Object.values(s.cols).includes(i) ? v : (s.rows[row - 1][i] ?? ""),
  );
  await g.update(TABS.stock, row, merged);
  await writeTotal(g);
  return item;
}

export async function deleteItem(g: SheetGateway, code: string): Promise<void> {
  const s = await load(g);
  const row = s.rowOf.get(code);
  if (!row) throw new ItemNotFoundError(code);
  await g.deleteRow(TABS.stock, row);
  await writeTotal(g);
}
