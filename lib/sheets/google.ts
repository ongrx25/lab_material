import { google, type sheets_v4 } from "googleapis";
import { SheetAccessError, type SheetGateway } from "./gateway";

/** Google Sheets via a service account (ADR 0002). Server-only. */
export class GoogleSheetGateway implements SheetGateway {
  private api: sheets_v4.Sheets;
  private sheetIds = new Map<string, number>();

  constructor(private spreadsheetId: string, email: string, privateKey: string) {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.api = google.sheets({ version: "v4", auth });
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { code?: number }).code;
      if (status === 403 || status === 404)
        throw new SheetAccessError("เข้าถึง Google Sheet ไม่ได้ — ตรวจว่าแชร์ชีตให้ Service Account เป็นผู้แก้ไขแล้ว");
      throw new SheetAccessError(`เชื่อมต่อ Google Sheet ไม่สำเร็จ: ${(e as Error).message}`);
    }
  }

  private async sheetId(tab: string): Promise<number> {
    if (!this.sheetIds.has(tab)) {
      const res = await this.call(() =>
        this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: "sheets.properties(sheetId,title)" }),
      );
      for (const s of res.data.sheets ?? []) this.sheetIds.set(s.properties!.title!, s.properties!.sheetId!);
    }
    const id = this.sheetIds.get(tab);
    if (id === undefined) throw new SheetAccessError(`ไม่พบแท็บ "${tab}" ในชีต`);
    return id;
  }

  async read(tab: string) {
    const res = await this.call(() =>
      this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `'${tab}'` }),
    );
    return (res.data.values ?? []).map((r) => r.map((c) => String(c ?? "")));
  }

  async update(tab: string, row: number, values: (string | number)[]) {
    await this.call(() =>
      this.api.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${tab}'!A${row}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      }),
    );
  }

  private async dimension(tab: string, row: number, op: "insert" | "delete") {
    const range = { sheetId: await this.sheetId(tab), dimension: "ROWS", startIndex: row - 1, endIndex: row };
    await this.call(() =>
      this.api.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [op === "insert" ? { insertDimension: { range, inheritFromBefore: row > 1 } } : { deleteDimension: { range } }],
        },
      }),
    );
  }

  insertRowBefore(tab: string, row: number) {
    return this.dimension(tab, row, "insert");
  }

  deleteRow(tab: string, row: number) {
    return this.dimension(tab, row, "delete");
  }
}
