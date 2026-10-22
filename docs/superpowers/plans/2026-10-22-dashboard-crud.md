# Dashboard + จัดการวัสดุ (เฟส 1a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js web app: login against the `User` tab, a dashboard summarising `Stock_record`, and add/edit/delete of items in that tab.

**Architecture:** Pure domain modules (`lib/inventory/*`) map sheet rows to `Item`s and compute stats. A `SheetGateway` interface abstracts Google Sheets; `GoogleSheetGateway` (service account) in prod, `FakeSheetGateway` (in-memory, seeded with fixture rows) when `SHEETS_FAKE=1` and in tests. Repositories (`lib/inventory/repository.ts`, `lib/auth/users.ts`) depend only on the gateway. UI is App Router server components + server actions.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, googleapis, jose, bcryptjs, zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-dashboard-crud-design.md`

## Global Constraints

- UI copy in Thai; font IBM Plex Sans Thai; primary #1D4ED8, warn #B45309, danger #B91C1C, ground #F4F6F9.
- Sheet columns found by header name (trimmed), never by index. Required headers: `Item code`, `Item discription`, `UOM`, `In`, `Out`, `Quantity`, `Unit Price`, `Amount(Baht)`.
- Header row = row 1 of `Stock_record` (first cell contains "No."). Total row = last row whose Item code is empty.
- `Quantity = In − Out`; `Amount = Unit Price × Quantity` (2 dp). `0 ≤ Out ≤ In`.
- New code = `LAB-<max n + 1>`. Code is immutable.
- Dates stored `dd/mm/yyyy` in Buddhist Era; "near expiry" = within 6 calendar months of today.
- Env: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SESSION_SECRET`, optional `SHEETS_FAKE=1`.
- Session cookie `lab_session`, HS256 JWT, 8 h, httpOnly, sameSite lax, secure in prod.

## Review Focus

- Numbers with commas/spaces (`" 4,368.00"`), blank cells → parse as numbers / 0 — test in Task 2.
- Two-digit or Gregorian years in EXP. (`26/01/78`, `1/12/2026`) → treated as BE 2578 / CE 2026 sensibly, unparseable → `null`, never crash — test in Task 2.
- Editing after someone inserted a row in the sheet → row located by code, right row changed — test in Task 4.
- Deleting/editing an item already removed → `ItemNotFoundError`, UI says so — test in Task 4.
- Bcrypt upgrade write fails → login still succeeds — test in Task 5.

---

### Task 1: Scaffold

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`, `vitest.config.ts`, `.env.example`, `.gitignore`

- [ ] create-next-app (TS, Tailwind, App Router, no src dir); add deps listed in Tech Stack; `npm test` = `vitest run`.
- [ ] Layout loads IBM Plex Sans Thai via `next/font/google`, `lang="th"`, body bg #F4F6F9.
- [ ] Verify `npm run build` and `npm test` (no tests → passWithNoTests) succeed. Commit.

### Task 2: Domain — items, numbers, dates, stats

**Files:** `lib/inventory/item.ts`, `lib/inventory/thaiDate.ts`, `lib/inventory/stats.ts`, tests beside them as `*.test.ts`, `lib/inventory/fixtures.ts` (≈12 rows copied from the real sheet incl. header and total row).

**Produces:**
- `type Item = { code; name; supplier; unit; received; issued; onHand; unitPrice; value; lot; expiry: string; invoice; no: number }`
- `parseNumber(s: string): number`
- `parseThaiDate(s: string): Date | null`, `formatThaiDate(d: Date): string`
- `headerIndex(header: string[]): ColumnMap` (throws `MissingColumnError` listing missing names)
- `rowToItem(row: string[], cols: ColumnMap): Item`, `itemToRow(item: Item, cols: ColumnMap, width: number): (string|number)[]`
- `itemInputSchema` (zod; Thai messages) and `computeItem(input): Item` (fills onHand/value)
- `type Status = 'expired'|'expiring'|'out'|'ok'`; `itemStatus(item, today): Status`; `sortByUrgency(items, today): Item[]`
- `dashboardStats(items, today): { total; stockValue; outOfStock; expiring; expired; byStatus; valueBySupplier (top 8); topUsage (top 7, issued/received %); nextExpiring (6, with daysLeft) }`

Tests (write first, see fail, implement, pass, commit):
- `parseNumber(" 4,368.00") === 4368`, `parseNumber("") === 0`
- `parseThaiDate("28/05/2570")` → 2027-05-28; `"26/01/78"` → 2035-01-26; `"1/12/2026"` → 2026-12-01; `"abc"` → null
- `computeItem({received:500, issued:430, unitPrice:10,...}).onHand === 70`, `.value === 700`
- schema rejects `issued > received` with message `จำนวนจ่ายต้องไม่เกินจำนวนรับ`, rejects empty name
- `itemStatus`: expiry yesterday → expired; +5 months → expiring; +7 months & qty 0 → out
- `sortByUrgency`: expired < expiring (earliest first) < out < ok
- `dashboardStats` on fixtures: total equals fixture item count, stockValue = Σ value
- `headerIndex` tolerates `" UOM"` and throws when `In` missing

### Task 3: Sheet gateway

**Files:** `lib/sheets/gateway.ts`, `lib/sheets/google.ts`, `lib/sheets/fake.ts`, `lib/sheets/index.ts`, `lib/sheets/fake.test.ts`

**Produces:**
```ts
interface SheetGateway {
  read(tab: string): Promise<string[][]>;              // formatted values, all rows
  update(tab: string, row1: number, values: (string|number)[]): Promise<void>;
  insertRowBefore(tab: string, row1: number): Promise<void>;
  deleteRow(tab: string, row1: number): Promise<void>;
}
getGateway(): SheetGateway  // Fake when SHEETS_FAKE=1 (singleton seeded from fixtures), else Google
```
- Google impl: `google.sheets v4` with JWT auth from env (private key `\n` unescaped); sheetId (numeric) looked up by title for insert/delete via `batchUpdate`; values written with `USER_ENTERED`.
- Test the fake: insert/delete shift rows; update writes 1-based row. Commit.

### Task 4: Item repository

**Files:** `lib/inventory/repository.ts`, `lib/inventory/repository.test.ts`

**Consumes:** Tasks 2–3. **Produces:** `listItems(g)`, `createItem(g, input): Item`, `updateItem(g, code, input): Item`, `deleteItem(g, code)`, `class ItemNotFoundError`.

Behaviour: every write re-reads the tab; create inserts before the total row with next code and next No.; after every write, total row's `Amount(Baht)` cell = Σ value (2 dp).

Tests (FakeSheetGateway): create lands above total row with `LAB-112` when max is 111; total updated; update after an extra row was inserted above still changes the right item; update/delete of unknown code throws `ItemNotFoundError`; delete removes exactly one row. Commit.

### Task 5: Auth

**Files:** `lib/auth/users.ts`, `lib/auth/session.ts`, `lib/auth/users.test.ts`, `middleware.ts`, `app/login/page.tsx`, `app/login/actions.ts`

**Produces:** `verifyLogin(g, username, password): Promise<SessionUser | null>` (`SessionUser = {username, name, position}`), `createSession(user)`, `getSession(): Promise<SessionUser|null>`, `logout()`.

- Password starting `$2` → bcrypt compare; else plain compare, then write bcrypt hash (cost 10) back; if that write throws, log and still return user.
- Middleware redirects to `/login` when no valid cookie (except `/login`, `/_next`, static).
- Login page: centred card, logo, username/password, Thai error `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง`.
- Tests: plain ok + hash written back; bcrypt ok; wrong pw null; unknown user null; write-back failure still logs in. Commit.

### Task 6: App shell + dashboard

**Files:** `app/(app)/layout.tsx`, `components/Sidebar.tsx`, `components/MobileNav.tsx`, `app/(app)/page.tsx`, `components/dashboard/*`

- Shell per mockup (https://claude.ai/artifact/Pmg2LJaZoPKQcXCTbZtQqo): dark sidebar ≥ lg, bottom nav on mobile; header with user name + logout.
- Dashboard from `dashboardStats`: 5 KPI cards, donut (CSS conic-gradient) of byStatus, horizontal bars valueBySupplier and topUsage, next-expiring list with day badges. Sheet errors render a Thai error panel.
- Commit.

### Task 7: Items page (CRUD)

**Files:** `app/(app)/items/page.tsx`, `app/(app)/items/actions.ts`, `components/items/ItemTable.tsx` (client), `components/items/ItemForm.tsx` (client dialog), `components/items/DeleteDialog.tsx`

- Table sorted by `sortByUrgency`; client-side instant filter on name/code substring (case-insensitive); status chips filter; status pills; mobile = card list.
- Actions `saveItem(code|null, formData)` and `removeItem(code)` validate with `itemInputSchema`, call repository, `revalidatePath('/')`, `revalidatePath('/items')`; return `{ok}|{error, fieldErrors}`; `ItemNotFoundError` → `รายการนี้ถูกลบหรือเปลี่ยนแปลงไปแล้ว`.
- Form shows computed คงเหลือ/มูลค่า live; UOM datalist from existing units. Commit.

### Task 8: Setup docs + end-to-end check

**Files:** `docs/setup.md`, `README.md`, `e2e/smoke.spec.ts`, `playwright.config.ts`

- setup.md (Thai): create GCP project, enable Sheets API, create service account + JSON key, share sheet as Editor, stop public link sharing, deploy to Vercel with env vars.
- Playwright with `SHEETS_FAKE=1` (Chromium at /opt/pw-browsers): login with fixture user → dashboard shows KPI → add item → edit → delete; screenshot at 1280 and 390 widths.
- Run `npm test`, `npm run build`, `npx playwright test`; all green. Commit, push, open PR.
