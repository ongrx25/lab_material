import { z } from "zod";

export type Item = {
  no: number;
  code: string;
  name: string;
  supplier: string;
  unit: string;
  received: number;
  issued: number;
  onHand: number;
  unitPrice: number;
  value: number;
  lot: string;
  expiry: string;
  invoice: string;
};

export type ItemField = keyof Item;

/** Sheet header (trimmed) for each field. `no` is matched by suffix: the real header is prefixed with a title. */
const HEADERS: Record<ItemField, string> = {
  no: "No.",
  code: "Item code",
  name: "Item discription",
  supplier: "Distributor",
  unit: "UOM",
  received: "In",
  issued: "Out",
  onHand: "Quantity",
  unitPrice: "Unit Price",
  value: "Amount(Baht)",
  lot: "Lot",
  expiry: "EXP.",
  invoice: "Inv#",
};

const REQUIRED: ItemField[] = ["code", "name", "unit", "received", "issued", "onHand", "unitPrice", "value"];

export type ColumnMap = Record<ItemField, number>;

export class MissingColumnError extends Error {
  constructor(public missing: string[]) {
    super(`ไม่พบคอลัมน์ในชีต Stock_record: ${missing.join(", ")}`);
  }
}

export function headerIndex(header: string[]): ColumnMap {
  const trimmed = header.map((h) => (h ?? "").trim());
  const cols = {} as ColumnMap;
  const missing: string[] = [];
  for (const field of Object.keys(HEADERS) as ItemField[]) {
    const name = HEADERS[field];
    const idx = field === "no" ? trimmed.findIndex((h) => h.endsWith(name)) : trimmed.indexOf(name);
    if (idx === -1 && REQUIRED.includes(field)) missing.push(name);
    cols[field] = idx;
  }
  if (missing.length) throw new MissingColumnError(missing);
  return cols;
}

export function parseNumber(s: string | number | undefined | null): number {
  if (typeof s === "number") return s;
  const n = Number((s ?? "").replace(/[,\s฿]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ItemInput = Omit<Item, "onHand" | "value">;

/** Fills the derived fields: on hand = In − Out, value = unit price × on hand. */
export function computeItem(input: ItemInput): Item {
  const onHand = input.received - input.issued;
  return { ...input, onHand, value: round2(input.unitPrice * onHand) };
}

export function rowToItem(row: string[], cols: ColumnMap): Item {
  const cell = (f: ItemField) => (cols[f] >= 0 ? (row[cols[f]] ?? "").trim() : "");
  const inCell = cell("received");
  const outCell = cell("issued");
  let received = parseNumber(inCell);
  const issued = parseNumber(outCell);
  // Legacy rows carry a typed Quantity with no In/Out: keep that stock as received.
  if (inCell === "" && outCell === "") received = parseNumber(cell("onHand"));
  return computeItem({
    no: parseNumber(cell("no")),
    code: cell("code"),
    name: cell("name"),
    supplier: cell("supplier"),
    unit: cell("unit"),
    received,
    issued,
    unitPrice: parseNumber(cell("unitPrice")),
    lot: cell("lot"),
    expiry: cell("expiry"),
    invoice: cell("invoice"),
  });
}

export function itemToRow(item: Item, cols: ColumnMap, width: number): (string | number)[] {
  const row: (string | number)[] = Array(width).fill("");
  for (const field of Object.keys(cols) as ItemField[]) {
    if (cols[field] >= 0) row[cols[field]] = item[field];
  }
  return row;
}

const num = (label: string) =>
  z.coerce.number({ message: `${label}ต้องเป็นตัวเลข` }).min(0, `${label}ต้องไม่ติดลบ`);

const text = z.string().trim().max(200).default("");

export const itemInputSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณากรอกชื่อรายการ").max(200),
    supplier: text,
    unit: z.string().trim().min(1, "กรุณากรอกหน่วย").max(40),
    received: num("จำนวนรับ"),
    issued: num("จำนวนจ่าย"),
    unitPrice: num("ราคาต่อหน่วย"),
    lot: text,
    expiry: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v), "วันหมดอายุต้องเป็น วว/ดด/ปปปป (พ.ศ.)"),
    invoice: text,
  })
  .refine((v) => v.issued <= v.received, { message: "จำนวนจ่ายต้องไม่เกินจำนวนรับ", path: ["issued"] });

export type ItemFormValues = z.infer<typeof itemInputSchema>;
