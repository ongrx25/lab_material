import { describe, it, expect, beforeEach } from "vitest";
import { FakeSheetGateway } from "@/lib/sheets/fake";
import { STOCK_ROWS } from "./fixtures";
import { listItems, createItem, updateItem, deleteItem, ItemNotFoundError } from "./repository";

const TAB = "Stock_record";
const input = { name: "Blood lancet", supplier: "RICH", unit: "Box", received: 10, issued: 2, unitPrice: 5, lot: "L1", expiry: "01/01/2571", invoice: "" };
let g: FakeSheetGateway;

beforeEach(() => {
  g = new FakeSheetGateway({ [TAB]: STOCK_ROWS });
});

const totalRow = async () => {
  const rows = await g.read(TAB);
  return { cells: rows[rows.length - 1], n: rows.length };
};

describe("item repository", () => {
  it("lists items without header or total row", async () => {
    const items = await listItems(g);
    expect(items).toHaveLength(11);
    expect(items[0].code).toBe("LAB-01");
  });

  it("creates above the total row with the next code and number", async () => {
    const item = await createItem(g, input);
    expect(item).toMatchObject({ code: "LAB-12", no: 12, onHand: 8, value: 40 });
    const rows = await g.read(TAB);
    expect(rows[rows.length - 2][1]).toBe("LAB-12");
    expect(rows[rows.length - 1][1]).toBe("");
  });

  it("points the total cell at every item row with a SUM formula", async () => {
    await createItem(g, input);
    const { cells, n } = await totalRow();
    expect(cells[8]).toBe(`=SUM(J2:J${n - 1})`);
    await deleteItem(g, "LAB-01");
    const after = await totalRow();
    expect(after.cells[8]).toBe(`=SUM(J2:J${after.n - 1})`);
  });

  it("updates the right row even after a row was inserted above it", async () => {
    await g.insertRowBefore(TAB, 2);
    await g.update(TAB, 2, ["0", "LAB-99", "Inserted", "", "Box", "1", "0"]);
    const updated = await updateItem(g, "LAB-04", { ...input, name: "HCG Strip v2" });
    expect(updated.code).toBe("LAB-04");
    const items = await listItems(g);
    expect(items.find((i) => i.code === "LAB-04")?.name).toBe("HCG Strip v2");
    expect(items.find((i) => i.code === "LAB-99")?.name).toBe("Inserted");
  });

  it("deletes exactly one row", async () => {
    await deleteItem(g, "LAB-05");
    const items = await listItems(g);
    expect(items).toHaveLength(10);
    expect(items.some((i) => i.code === "LAB-05")).toBe(false);
  });

  it("throws ItemNotFoundError for unknown codes", async () => {
    await expect(updateItem(g, "LAB-404", input)).rejects.toBeInstanceOf(ItemNotFoundError);
    await expect(deleteItem(g, "LAB-404")).rejects.toBeInstanceOf(ItemNotFoundError);
  });

  it("uses the next number when there is no total row", async () => {
    g = new FakeSheetGateway({ [TAB]: STOCK_ROWS.slice(0, 3) });
    const item = await createItem(g, input);
    expect(item.code).toBe("LAB-03");
    expect((await g.read(TAB))[3][1]).toBe("LAB-03");
  });
});
