// Minimal Apps Script simulator: loads Code.gs into a VM with fake SpreadsheetApp/Cache/Lock/Utilities.
const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");
const path = require("path");

function makeSheet(rows) {
  const data = rows.map((r) => r.map(String));
  const width = () => Math.max(...data.map((r) => r.length));
  const range = (r, c, nr = 1, nc = 1) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (data[r - 1 + i] || [])[c - 1 + j] ?? "")),
    getFormulas: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (data[r - 1 + i] || [])[c - 1 + j] ?? ""; return String(v).startsWith("=") ? v : ""; })),
    setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => { const rr = (data[r - 1 + i] ||= []); while (rr.length < c - 1 + j) rr.push(""); rr[c - 1 + j] = String(v); })); },
    setValue: (v) => { const rr = (data[r - 1] ||= []); while (rr.length < c - 1) rr.push(""); rr[c - 1] = String(v); return range(r, c); },
    setFormula: (f) => range(r, c).setValue(f),
    setNumberFormat: () => range(r, c, nr, nc),
  });
  return {
    data,
    getDataRange: () => ({ getDisplayValues: () => data.map((r) => { const o = r.slice(); while (o.length < width()) o.push(""); return o; }) }),
    getRange: range,
    insertRowBefore: (r) => data.splice(r - 1, 0, []),
    appendRow: (row) => data.push(row.map(String)),
    setFrozenRows() {},
    getLastRow: () => data.length,
    deleteRow: (r) => data.splice(r - 1, 1),
  };
}

function load(tabs) {
  const sheets = Object.fromEntries(Object.entries(tabs).map(([k, v]) => [k, makeSheet(v)]));
  const cache = new Map();
  const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = makeSheet([])) };
  const ctx = {
    console,
    SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss, flush() {} },
    CacheService: { getScriptCache: () => ({ put: (k, v) => cache.set(k, v), get: (k) => cache.get(k) ?? null, remove: (k) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: {},
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, f) => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).map((p) => [p.type, p.value]));
        return f.replace("yyyy", parts.year).replace("MM", parts.month).replace("dd", parts.day).replace("HH", parts.hour).replace("mm", parts.minute).replace(/^d$/, String(Number(parts.day)));
      },
      computeDigest: (_a, text) => [...crypto.createHash("sha256").update(text, "utf8").digest()].map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8"), ctx);
  return { ctx, sheets };
}

module.exports = { load };
