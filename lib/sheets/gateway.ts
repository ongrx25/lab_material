/** Minimal row-level access to a spreadsheet. Rows are 1-based like the Sheets UI. */
export interface SheetGateway {
  read(tab: string): Promise<string[][]>;
  /** Writes values into `row` starting at column `startCol` (0-based). Text is stored as-is unless `formulas` is set. */
  update(tab: string, row: number, values: (string | number)[], opts?: WriteOptions): Promise<void>;
  insertRowBefore(tab: string, row: number): Promise<void>;
  deleteRow(tab: string, row: number): Promise<void>;
}

export type WriteOptions = { startCol?: number; formulas?: boolean };

export const colLetter = (i: number): string =>
  (i >= 26 ? colLetter(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

export const TABS = { stock: "Stock_record", users: "User" } as const;

export class SheetAccessError extends Error {}
