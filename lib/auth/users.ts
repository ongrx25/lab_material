import bcrypt from "bcryptjs";
import { TABS, type SheetGateway } from "@/lib/sheets/gateway";

export type SessionUser = { username: string; name: string; position: string };

const col = (header: string[], name: string) => header.findIndex((h) => (h ?? "").trim().toLowerCase() === name);

/** Checks credentials against the User tab; upgrades plaintext passwords to bcrypt (ADR 0003). */
export async function verifyLogin(g: SheetGateway, username: string, password: string): Promise<SessionUser | null> {
  const wanted = username.trim().toLowerCase();
  if (!wanted || !password) return null;
  const rows = await g.read(TABS.users);
  const header = rows[0] ?? [];
  const c = { username: col(header, "username"), password: col(header, "password"), name: col(header, "name"), position: col(header, "position") };
  const idx = rows.findIndex((r, i) => i > 0 && (r[c.username] ?? "").trim().toLowerCase() === wanted);
  if (idx < 0) return null;
  const row = rows[idx];
  const stored = row[c.password] ?? "";

  const isHash = stored.startsWith("$2");
  const ok = isHash ? await bcrypt.compare(password, stored) : stored !== "" && stored === password;
  if (!ok) return null;

  if (!isHash) {
    try {
      await g.update(TABS.users, idx + 1, [await bcrypt.hash(password, 10)], { startCol: c.password });
    } catch (e) {
      console.error("password hash upgrade failed", e);
    }
  }
  return { username: (row[c.username] ?? "").trim(), name: (row[c.name] ?? "").trim(), position: (row[c.position] ?? "").trim() };
}
