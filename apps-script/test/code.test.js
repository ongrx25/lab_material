const test = require("node:test");
const assert = require("node:assert");
const { load } = require("./gas-sim");
const fx = require("./fixtures");

const fresh = () => load({ Stock_record: fx.stock(), User: fx.users() });
const input = { name: "New", supplier: "S", unit: "Box", received: "10", issued: "2", unitPrice: "5", lot: "00123", expiry: "01/01/2571", invoice: "" };

test("login hashes plaintext password and rejects wrong ones", () => {
  const { ctx, sheets } = fresh();
  assert.equal(ctx.apiLogin("jo", "x").ok, false);
  const r = ctx.apiLogin(" JO ", "1234");
  assert.equal(r.ok, true);
  assert.match(sheets.User.data[1][2], /^sha256\$/);
  assert.equal(ctx.apiLogin("jo", "1234").ok, true);
  assert.equal(ctx.apiLogin("jo", "12345").ok, false);
});

test("load requires a session", () => {
  const { ctx } = fresh();
  assert.throws(() => ctx.apiLoad("nope"), /SESSION_EXPIRED/);
});

test("load computes on hand, legacy quantity, stats and urgency order", () => {
  const { ctx } = fresh();
  const d = ctx.apiLoad(ctx.apiLogin("jo", "1234").token);
  const hcg = d.rows.find((r) => r.item.code === "LAB-03").item;
  assert.equal(hcg.onHand, 70);
  assert.equal(d.rows.find((r) => r.item.code === "LAB-06").item.onHand, 300);
  assert.equal(d.stats.total, 6);
  assert.equal(d.rows[0].status, "expired");
  assert.equal(d.rows[d.rows.length - 1].status, "ok");
});

test("create inserts above total row, keeps notes row, writes SUM", () => {
  const { ctx, sheets } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  const r = ctx.apiSaveItem(t, null, input);
  assert.equal(r.ok, true);
  assert.equal(r.item.code, "LAB-07");
  const d = sheets.Stock_record.data;
  assert.equal(d[7][1], "LAB-07");
  assert.equal(d[7][10], "00123");
  assert.equal(d[8][8], "=SUM(J2:J8)");
  assert.deepEqual(d[9], ["ลงชื่อ ผู้ตรวจ"]);
});

test("validation errors in Thai", () => {
  const { ctx } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  const r = ctx.apiSaveItem(t, null, { ...input, issued: "50", name: " " });
  assert.equal(r.ok, false);
  assert.equal(r.fieldErrors.issued, "จำนวนจ่ายต้องไม่เกินจำนวนรับ");
  assert.equal(r.fieldErrors.name, "กรุณากรอกชื่อรายการ");
  assert.ok(ctx.apiSaveItem(t, null, { ...input, expiry: "31/02/2570" }).fieldErrors.expiry);
});

test("update by code after manual insert, delete, unknown code", () => {
  const { ctx, sheets } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  sheets.Stock_record.insertRowBefore(2);
  sheets.Stock_record.data[1] = ["0", "LAB-99", "Manual", "", "Box", "1", "0"];
  assert.equal(ctx.apiSaveItem(t, "LAB-03", { ...input, name: "HCG v2" }).ok, true);
  const d = sheets.Stock_record.data;
  assert.equal(d.find((r) => r[1] === "LAB-03")[2], "HCG v2");
  assert.equal(d.find((r) => r[1] === "LAB-99")[2], "Manual");
  assert.equal(ctx.apiDeleteItem(t, "LAB-02").ok, true);
  assert.ok(!sheets.Stock_record.data.some((r) => r[1] === "LAB-02"));
  assert.equal(ctx.apiDeleteItem(t, "LAB-404").ok, false);
});

test("receive adds to In, updates lot/expiry/price and logs it", () => {
  const { ctx, sheets } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  const r = ctx.apiReceive(t, { code: "LAB-02", qty: "50", lot: "L9", expiry: "01/06/2572", supplier: "NEW CO", unitPrice: "360", invoice: "INV-1" });
  assert.equal(r.ok, true);
  const row = sheets.Stock_record.data.find((x) => x[1] === "LAB-02");
  assert.equal(row[5], "250");
  assert.equal(row[7], "92");
  assert.equal(row[10], "L9");
  assert.equal(row[11], "01/06/2572");
  assert.equal(row[3], "NEW CO");
  const log = sheets.Receive_log.data;
  assert.equal(log[0][0], "วันที่เวลา");
  assert.equal(log[1][1], "LAB-02");
  assert.equal(log[1][4], "50");
  assert.equal(ctx.apiReceive(t, { code: "LAB-02", qty: "0" }).ok, false);
});

test("issue several items in one go, refuses more than on hand, logs a doc number", () => {
  const { ctx, sheets } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  const bad = ctx.apiIssue(t, { lines: [{ code: "LAB-04", qty: 5 }] });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /DCIP/);
  const r = ctx.apiIssue(t, { lines: [{ code: "LAB-02", qty: 2 }, { code: "LAB-03", qty: "10" }], note: "ward" });
  assert.equal(r.ok, true);
  assert.match(r.docNo, /^OUT-\d{4}-0001$/);
  const d = sheets.Stock_record.data;
  assert.equal(d.find((x) => x[1] === "LAB-02")[6], "160");
  assert.equal(d.find((x) => x[1] === "LAB-03")[6], "440");
  assert.equal(sheets.Issue_log.data.length, 3);
  assert.equal(ctx.apiIssue(t, { lines: [{ code: "LAB-02", qty: 1 }] }).docNo.slice(-4), "0002");
});

test("load lists frequently issued items first", () => {
  const { ctx } = fresh();
  const t = ctx.apiLogin("jo", "1234").token;
  ctx.apiIssue(t, { lines: [{ code: "LAB-03", qty: 1 }] });
  ctx.apiIssue(t, { lines: [{ code: "LAB-03", qty: 1 }, { code: "LAB-02", qty: 1 }] });
  assert.deepEqual(Array.from(ctx.apiLoad(t).frequent), ["LAB-03", "LAB-02"]);
});
