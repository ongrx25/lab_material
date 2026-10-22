import "server-only";
import { STOCK_ROWS, USER_ROWS } from "@/lib/inventory/fixtures";
import { FakeSheetGateway } from "./fake";
import { SheetAccessError, TABS, type SheetGateway } from "./gateway";
import { GoogleSheetGateway } from "./google";

const g = globalThis as unknown as { __sheetGateway?: SheetGateway };

export function getGateway(): SheetGateway {
  if (g.__sheetGateway) return g.__sheetGateway;
  if (process.env.SHEETS_FAKE === "1") {
    g.__sheetGateway = new FakeSheetGateway({ [TABS.stock]: STOCK_ROWS, [TABS.users]: USER_ROWS });
  } else {
    const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY)
      throw new SheetAccessError("ยังไม่ได้ตั้งค่า GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY");
    g.__sheetGateway = new GoogleSheetGateway(GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY);
  }
  return g.__sheetGateway;
}

export { TABS, SheetAccessError, type SheetGateway };
