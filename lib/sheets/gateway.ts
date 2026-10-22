/** Minimal row-level access to a spreadsheet. Rows are 1-based like the Sheets UI. */
export interface SheetGateway {
  read(tab: string): Promise<string[][]>;
  update(tab: string, row: number, values: (string | number)[]): Promise<void>;
  insertRowBefore(tab: string, row: number): Promise<void>;
  deleteRow(tab: string, row: number): Promise<void>;
}

export const TABS = { stock: "Stock_record", users: "User" } as const;

export class SheetAccessError extends Error {}
