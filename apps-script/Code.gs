/**
 * Lab Stock — ระบบวัสดุคงคลัง กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลวาริชภูมิ
 * Google Apps Script web app ที่ผูกกับ Google Sheet (แท็บ Stock_record และ User)
 */

var CONFIG = {
  // เว้นว่างไว้ถ้าสคริปต์ผูกกับชีต (Extensions → Apps Script); ใส่ ID ถ้าเป็นสคริปต์แยก
  SPREADSHEET_ID: '1KkhbX34xQJ_BMxGPjCZNc3tpB8HfdcgKObrQRoa_WRM',
  STOCK_TAB: 'Stock_record',
  USER_TAB: 'User',
  SESSION_HOURS: 6,
  EXPIRY_WARNING_MONTHS: 6
};

var HEADERS = {
  no: 'No.',
  code: 'Item code',
  name: 'Item discription',
  supplier: 'Distributor',
  unit: 'UOM',
  received: 'In',
  issued: 'Out',
  onHand: 'Quantity',
  unitPrice: 'Unit Price',
  value: 'Amount(Baht)',
  lot: 'Lot',
  expiry: 'EXP.',
  invoice: 'Inv#'
};
var REQUIRED = ['code', 'name', 'unit', 'received', 'issued', 'onHand', 'unitPrice', 'value'];

/* ───────────── Web app entry ───────────── */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Lab Stock · วัสดุคงคลัง')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ───────────── API (เรียกจาก Index.html ผ่าน google.script.run) ───────────── */

function apiLogin(username, password) {
  var user = verifyLogin_(String(username || ''), String(password || ''));
  if (!user) return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('s:' + token, JSON.stringify(user), CONFIG.SESSION_HOURS * 3600);
  return { ok: true, token: token, user: user };
}

function apiLogout(token) {
  CacheService.getScriptCache().remove('s:' + token);
  return { ok: true };
}

function apiLoad(token) {
  var user = requireUser_(token);
  var today = bangkokToday_();
  var items = loadSheet_().items;
  return {
    user: user,
    today: formatThaiDate_(today),
    todayLong: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'd') + ' ' + THAI_MONTHS[today.getMonth()] + ' ' + (today.getFullYear() + 543),
    stats: dashboardStats_(items, today),
    rows: sortByUrgency_(items, today).map(function (i) { return { item: i, status: itemStatus_(i, today) }; })
  };
}

function apiSaveItem(token, code, input) {
  requireUser_(token);
  var parsed = validateInput_(input);
  if (!parsed.ok) return parsed;
  return withLock_(function () {
    var item = code ? updateItem_(code, parsed.value) : createItem_(parsed.value);
    return { ok: true, item: item };
  });
}

function apiDeleteItem(token, code) {
  requireUser_(token);
  return withLock_(function () {
    deleteItem_(code);
    return { ok: true };
  });
}

function requireUser_(token) {
  var raw = token && CacheService.getScriptCache().get('s:' + token);
  if (!raw) throw new Error('SESSION_EXPIRED');
  return JSON.parse(raw);
}

/** Serialises writes so two people saving at once cannot clash (duplicate codes, wrong rows). */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'ระบบกำลังบันทึกข้อมูลของผู้ใช้อื่น กรุณาลองใหม่' };
  try {
    return fn();
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/* ───────────── Sheet access ───────────── */

function spreadsheet_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function tab_(name) {
  var sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('ไม่พบแท็บ "' + name + '" ในชีต');
  return sh;
}

function loadSheet_() {
  var sh = tab_(CONFIG.STOCK_TAB);
  var rows = sh.getDataRange().getDisplayValues();
  return parseStock_(rows, sh);
}

/** Pure: turns the tab's display values into items + row positions. */
function parseStock_(rows, sheet) {
  var cols = headerIndex_(rows[0] || []);
  var rowOf = {};
  var items = [];
  var lastItemRow = 1;
  for (var i = 1; i < rows.length; i++) {
    var code = String(rows[i][cols.code] || '').trim();
    if (code) {
      rowOf[code] = i + 1;
      items.push(rowToItem_(rows[i], cols));
      lastItemRow = i + 1;
    }
  }
  var totalRow = null;
  for (var j = lastItemRow; j < rows.length; j++) {
    if (String(rows[j][cols.code] || '').trim()) break;
    if (rows[j].some(function (c) { return String(c).trim() !== ''; })) { totalRow = j + 1; break; }
  }
  return { sheet: sheet, rows: rows, cols: cols, rowOf: rowOf, items: items, totalRow: totalRow };
}

function headerIndex_(header) {
  var trimmed = header.map(function (h) { return String(h || '').trim(); });
  var cols = {};
  var missing = [];
  Object.keys(HEADERS).forEach(function (f) {
    var name = HEADERS[f];
    var idx = -1;
    for (var k = 0; k < trimmed.length; k++) {
      if (f === 'no' ? trimmed[k].slice(-name.length) === name : trimmed[k] === name) { idx = k; break; }
    }
    if (idx === -1 && REQUIRED.indexOf(f) !== -1) missing.push(name);
    cols[f] = idx;
  });
  if (missing.length) throw new Error('ไม่พบคอลัมน์ในชีต ' + CONFIG.STOCK_TAB + ': ' + missing.join(', '));
  return cols;
}

function parseNumber_(s) {
  if (typeof s === 'number') return s;
  var n = Number(String(s == null ? '' : s).replace(/[,\s฿]/g, ''));
  return isFinite(n) ? n : 0;
}

function round2_(n) { return Math.round(n * 100) / 100; }

function computeItem_(i) {
  i.onHand = i.received - i.issued;
  i.value = round2_(i.unitPrice * i.onHand);
  return i;
}

function rowToItem_(row, cols) {
  function cell(f) { return cols[f] >= 0 ? String(row[cols[f]] == null ? '' : row[cols[f]]).trim() : ''; }
  var inCell = cell('received'), outCell = cell('issued');
  var received = parseNumber_(inCell);
  // แถวเก่าที่มีแต่ Quantity ไม่มี In/Out: ถือว่าเป็นยอดรับ
  if (inCell === '' && outCell === '') received = parseNumber_(cell('onHand'));
  return computeItem_({
    no: parseNumber_(cell('no')), code: cell('code'), name: cell('name'), supplier: cell('supplier'),
    unit: cell('unit'), received: received, issued: parseNumber_(outCell), unitPrice: parseNumber_(cell('unitPrice')),
    lot: cell('lot'), expiry: cell('expiry'), invoice: cell('invoice')
  });
}

/** Values for columns A..last managed column. Text cells are written as plain text (see writeRow_). */
function itemToRow_(item, cols, existing) {
  var width = 0;
  Object.keys(cols).forEach(function (f) { width = Math.max(width, cols[f] + 1); });
  var row = [];
  for (var k = 0; k < width; k++) row.push(existing && existing[k] != null ? existing[k] : '');
  Object.keys(cols).forEach(function (f) { if (cols[f] >= 0) row[cols[f]] = item[f]; });
  return row;
}

var TEXT_FIELDS = ['code', 'name', 'supplier', 'unit', 'lot', 'expiry', 'invoice'];

function writeRow_(s, rowNum, item, existing) {
  var values = itemToRow_(item, s.cols, existing);
  var range = s.sheet.getRange(rowNum, 1, 1, values.length);
  // ช่องข้อความตั้งเป็น Plain text เพื่อไม่ให้ "=..." กลายเป็นสูตร และ Lot "00123" / วันที่ พ.ศ. ไม่ถูกแปลง
  TEXT_FIELDS.forEach(function (f) {
    if (s.cols[f] >= 0) s.sheet.getRange(rowNum, s.cols[f] + 1).setNumberFormat('@');
  });
  range.setValues([values]);
}

function colLetter_(i) {
  return (i >= 26 ? colLetter_(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));
}

function writeTotal_() {
  var s = loadSheet_();
  if (s.totalRow === null) return;
  var row = s.rows[s.totalRow - 1];
  var target = -1;
  for (var k = 0; k < row.length; k++) {
    if (k !== s.cols.no && /^[\d,.\s]*\d[\d,.\s]*$/.test(String(row[k]).trim())) { target = k; break; }
  }
  if (target < 0) target = s.cols.value;
  var col = colLetter_(s.cols.value);
  s.sheet.getRange(s.totalRow, target + 1).setFormula('=SUM(' + col + '2:' + col + (s.totalRow - 1) + ')');
}

function nextCode_(items) {
  var max = 0;
  items.forEach(function (i) { var m = /(\d+)$/.exec(i.code); if (m) max = Math.max(max, Number(m[1])); });
  var n = String(max + 1);
  return 'LAB-' + (n.length < 2 ? '0' + n : n);
}

function createItem_(input) {
  var s = loadSheet_();
  var maxNo = 0;
  s.items.forEach(function (i) { maxNo = Math.max(maxNo, i.no); });
  var item = computeItem_(Object.assign({}, input, { code: nextCode_(s.items), no: maxNo + 1 }));
  var target;
  if (s.totalRow !== null) {
    s.sheet.insertRowBefore(s.totalRow);
    target = s.totalRow;
  } else {
    target = s.rows.length + 1;
  }
  writeRow_(s, target, item, null);
  writeTotal_();
  return item;
}

function updateItem_(code, input) {
  var s = loadSheet_();
  var row = s.rowOf[code];
  if (!row) throw new Error('ไม่พบรายการ ' + code + ' — อาจถูกลบหรือเปลี่ยนแปลงไปแล้ว กรุณาโหลดใหม่');
  var existing = s.items.filter(function (i) { return i.code === code; })[0];
  var item = computeItem_(Object.assign({}, input, { code: code, no: existing.no }));
  // เก็บสูตร/ค่าเดิมในคอลัมน์ที่ระบบไม่ได้จัดการ
  var formulas = s.sheet.getRange(row, 1, 1, s.rows[0].length).getFormulas()[0];
  var raw = s.sheet.getRange(row, 1, 1, s.rows[0].length).getValues()[0];
  var keep = raw.map(function (v, k) { return formulas[k] || v; });
  writeRow_(s, row, item, keep);
  writeTotal_();
  return item;
}

function deleteItem_(code) {
  var s = loadSheet_();
  var row = s.rowOf[code];
  if (!row) throw new Error('ไม่พบรายการ ' + code + ' — อาจถูกลบหรือเปลี่ยนแปลงไปแล้ว กรุณาโหลดใหม่');
  s.sheet.deleteRow(row);
  writeTotal_();
}

/* ───────────── Validation ───────────── */

function validateInput_(input) {
  input = input || {};
  var errors = {};
  function text(k, max) { return String(input[k] == null ? '' : input[k]).trim().slice(0, max || 200); }
  function num(k, label) {
    var raw = String(input[k] == null ? '' : input[k]).trim();
    var n = raw === '' ? 0 : Number(raw);
    if (!isFinite(n)) errors[k] = label + 'ต้องเป็นตัวเลข';
    else if (n < 0) errors[k] = label + 'ต้องไม่ติดลบ';
    return n;
  }
  var v = {
    name: text('name'), supplier: text('supplier'), unit: text('unit', 40),
    received: num('received', 'จำนวนรับ'), issued: num('issued', 'จำนวนจ่าย'), unitPrice: num('unitPrice', 'ราคาต่อหน่วย'),
    lot: text('lot'), expiry: text('expiry'), invoice: text('invoice')
  };
  if (!v.name) errors.name = 'กรุณากรอกชื่อรายการ';
  if (!v.unit) errors.unit = 'กรุณากรอกหน่วย';
  if (v.expiry && (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.expiry) || !parseThaiDate_(v.expiry))) errors.expiry = 'วันหมดอายุต้องเป็น วว/ดด/ปปปป (พ.ศ.)';
  if (!errors.issued && !errors.received && v.issued > v.received) errors.issued = 'จำนวนจ่ายต้องไม่เกินจำนวนรับ';
  if (Object.keys(errors).length) return { ok: false, error: 'กรุณาตรวจสอบข้อมูลที่กรอก', fieldErrors: errors };
  return { ok: true, value: v };
}

/* ───────────── Dates ───────────── */

var THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/** d/m/y โดย y เป็น พ.ศ. (2400+), ค.ศ., หรือสองหลัก (60+ = พ.ศ. 25yy, ต่ำกว่า = ค.ศ. 20yy) */
function parseThaiDate_(s) {
  var m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*$/.exec(String(s || ''));
  if (!m) return null;
  var day = Number(m[1]), month = Number(m[2]), year = Number(m[3]);
  if (year < 100) year += year >= 60 ? 2500 : 2000;
  if (year > 2400) year -= 543;
  var d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }
function formatThaiDate_(d) { return pad2_(d.getDate()) + '/' + pad2_(d.getMonth() + 1) + '/' + (d.getFullYear() + 543); }
function addMonths_(d, m) { return new Date(d.getFullYear(), d.getMonth() + m, d.getDate()); }
function startOfDay_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysBetween_(a, b) { return Math.round((startOfDay_(b) - startOfDay_(a)) / 86400000); }

function bangkokToday_() {
  var p = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd').split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

/* ───────────── Status & stats ───────────── */

var RANK = { expired: 0, expiring: 1, out: 2, ok: 3 };

function itemStatus_(item, today) {
  if (item.onHand <= 0) return 'out';
  var exp = parseThaiDate_(item.expiry);
  if (exp) {
    if (exp < startOfDay_(today)) return 'expired';
    if (exp <= addMonths_(startOfDay_(today), CONFIG.EXPIRY_WARNING_MONTHS)) return 'expiring';
  }
  return 'ok';
}

function sortByUrgency_(items, today) {
  function key(i) { var d = parseThaiDate_(i.expiry); return d ? d.getTime() : Infinity; }
  return items.slice().sort(function (a, b) {
    var sa = itemStatus_(a, today), sb = itemStatus_(b, today);
    if (sa !== sb) return RANK[sa] - RANK[sb];
    if (sa === 'expired' || sa === 'expiring') return key(a) - key(b);
    return (a.onHand - b.onHand) || (a.no - b.no);
  });
}

function dashboardStats_(items, today) {
  var byStatus = { expired: 0, expiring: 0, out: 0, ok: 0 };
  var bySupplier = {};
  var suppliers = {};
  var total = 0;
  items.forEach(function (i) {
    byStatus[itemStatus_(i, today)]++;
    if (i.supplier) suppliers[i.supplier] = true;
    total += i.value;
    if (i.value > 0) {
      var s = i.supplier || 'ไม่ระบุบริษัท';
      bySupplier[s] = (bySupplier[s] || 0) + i.value;
    }
  });
  var next = items
    .filter(function (i) { return i.onHand > 0; })
    .map(function (i) { return { i: i, d: parseThaiDate_(i.expiry) }; })
    .filter(function (x) { return x.d && x.d >= startOfDay_(today); })
    .sort(function (a, b) { return a.d - b.d; })
    .slice(0, 6)
    .map(function (x) { return { code: x.i.code, name: x.i.name, expiry: x.i.expiry, daysLeft: daysBetween_(today, x.d) }; });
  return {
    total: items.length,
    suppliers: Object.keys(suppliers).length,
    stockValue: round2_(total),
    outOfStock: byStatus.out,
    expiring: byStatus.expiring,
    expired: byStatus.expired,
    byStatus: byStatus,
    valueBySupplier: Object.keys(bySupplier).map(function (k) { return { supplier: k, value: round2_(bySupplier[k]) }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 8),
    topUsage: items.filter(function (i) { return i.received > 0 && i.issued > 0; })
      .map(function (i) { return { name: i.name, pct: Math.round(i.issued / i.received * 100) }; })
      .sort(function (a, b) { return b.pct - a.pct; }).slice(0, 7),
    nextExpiring: next
  };
}

/* ───────────── Users ───────────── */

function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function hashPassword_(password, salt) {
  salt = salt || Utilities.getUuid().replace(/-/g, '');
  var h = salt + password;
  for (var i = 0; i < 1000; i++) h = sha256Hex_(h + salt);
  return 'sha256$' + salt + '$' + h;
}

/** ตรวจกับแท็บ User; รหัสผ่านแบบข้อความธรรมดาจะถูกเปลี่ยนเป็น hash อัตโนมัติเมื่อล็อกอินสำเร็จ */
function verifyLogin_(username, password) {
  var wanted = username.trim().toLowerCase();
  if (!wanted || !password) return null;
  var sh = tab_(CONFIG.USER_TAB);
  var rows = sh.getDataRange().getDisplayValues();
  var header = (rows[0] || []).map(function (h) { return String(h).trim().toLowerCase(); });
  var c = { username: header.indexOf('username'), password: header.indexOf('password'), name: header.indexOf('name'), position: header.indexOf('position') };
  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][c.username]).trim().toLowerCase() !== wanted) continue;
    var stored = String(rows[r][c.password]);
    var ok;
    if (stored.indexOf('sha256$') === 0) {
      ok = hashPassword_(password, stored.split('$')[1]) === stored;
    } else {
      ok = stored !== '' && stored === password;
      if (ok) {
        try { sh.getRange(r + 1, c.password + 1).setNumberFormat('@').setValue(hashPassword_(password)); }
        catch (e) { console.error('password hash upgrade failed', e); }
      }
    }
    if (!ok) return null;
    return { username: String(rows[r][c.username]).trim(), name: c.name >= 0 ? String(rows[r][c.name]).trim() : '', position: c.position >= 0 ? String(rows[r][c.position]).trim() : '' };
  }
  return null;
}

/** เรียกจากเมนู Apps Script เพื่อเพิ่ม/รีเซ็ตรหัสผ่านผู้ใช้ให้เป็นแบบ hash ทันที */
function hashAllPlainPasswords() {
  var sh = tab_(CONFIG.USER_TAB);
  var rows = sh.getDataRange().getDisplayValues();
  var col = rows[0].map(function (h) { return String(h).trim().toLowerCase(); }).indexOf('password');
  for (var r = 1; r < rows.length; r++) {
    var p = String(rows[r][col]);
    if (p && p.indexOf('sha256$') !== 0) sh.getRange(r + 1, col + 1).setNumberFormat('@').setValue(hashPassword_(p));
  }
}
