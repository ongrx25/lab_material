import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { FakeSheetGateway } from "@/lib/sheets/fake";
import { USER_ROWS } from "@/lib/inventory/fixtures";
import { verifyLogin } from "./users";

const fresh = () => new FakeSheetGateway({ User: USER_ROWS });

describe("verifyLogin", () => {
  it("accepts a plaintext password and upgrades it to bcrypt", async () => {
    const g = fresh();
    const user = await verifyLogin(g, "jo", "1234");
    expect(user).toEqual({ username: "jo", name: "โจ ทดสอบ", position: "นวก.เทคนิคการแพทย์" });
    const stored = (await g.read("User"))[1][2];
    expect(stored.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare("1234", stored)).toBe(true);
    expect(await verifyLogin(g, "jo", "1234")).not.toBeNull();
  });

  it("accepts a bcrypt password", async () => {
    const rows = structuredClone(USER_ROWS);
    rows[2][2] = await bcrypt.hash("secret", 4);
    const g = new FakeSheetGateway({ User: rows });
    expect(await verifyLogin(g, "yonlada", "secret")).not.toBeNull();
    expect(await verifyLogin(g, "yonlada", "abcd")).toBeNull();
  });

  it("rejects wrong passwords and unknown users", async () => {
    expect(await verifyLogin(fresh(), "jo", "nope")).toBeNull();
    expect(await verifyLogin(fresh(), "ghost", "1234")).toBeNull();
    expect(await verifyLogin(fresh(), "jo", "")).toBeNull();
  });

  it("matches usernames case-insensitively and trimmed", async () => {
    expect(await verifyLogin(fresh(), " JO ", "1234")).not.toBeNull();
  });

  it("still logs in when the hash write-back fails", async () => {
    const g = fresh();
    vi.spyOn(g, "update").mockRejectedValue(new Error("quota"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyLogin(g, "jo", "1234")).not.toBeNull();
  });
});
