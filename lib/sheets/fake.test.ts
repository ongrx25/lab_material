import { describe, it, expect } from "vitest";
import { FakeSheetGateway } from "./fake";

describe("FakeSheetGateway", () => {
  it("updates, inserts and deletes 1-based rows", async () => {
    const g = new FakeSheetGateway({ T: [["h"], ["a"], ["b"]] });
    await g.update("T", 2, ["A"]);
    await g.insertRowBefore("T", 3);
    await g.update("T", 3, ["new"]);
    expect(await g.read("T")).toEqual([["h"], ["A"], ["new"], ["b"]]);
    await g.deleteRow("T", 2);
    expect(await g.read("T")).toEqual([["h"], ["new"], ["b"]]);
  });

  it("returns copies so callers cannot mutate state", async () => {
    const g = new FakeSheetGateway({ T: [["h"]] });
    (await g.read("T"))[0][0] = "x";
    expect(await g.read("T")).toEqual([["h"]]);
  });

  it("stringifies written numbers like formatted values", async () => {
    const g = new FakeSheetGateway({ T: [["h"]] });
    await g.update("T", 1, [42]);
    expect(await g.read("T")).toEqual([["42"]]);
  });
});
