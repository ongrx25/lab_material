import type { SheetGateway, WriteOptions } from "./gateway";

/** In-memory gateway for tests and `SHEETS_FAKE=1` local runs. */
export class FakeSheetGateway implements SheetGateway {
  private tabs: Record<string, string[][]>;

  constructor(tabs: Record<string, string[][]>) {
    this.tabs = structuredClone(tabs);
  }

  private tab(name: string) {
    const t = this.tabs[name];
    if (!t) throw new Error(`no tab ${name}`);
    return t;
  }

  async read(tab: string) {
    return structuredClone(this.tab(tab));
  }

  async update(tab: string, row: number, values: (string | number)[], opts: WriteOptions = {}) {
    const t = this.tab(tab);
    const r = [...(t[row - 1] ?? [])];
    const start = opts.startCol ?? 0;
    while (r.length < start) r.push("");
    values.forEach((v, i) => (r[start + i] = String(v)));
    t[row - 1] = r;
  }

  async insertRowBefore(tab: string, row: number) {
    this.tab(tab).splice(row - 1, 0, []);
  }

  async deleteRow(tab: string, row: number) {
    this.tab(tab).splice(row - 1, 1);
  }
}
