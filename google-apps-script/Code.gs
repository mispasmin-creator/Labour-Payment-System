/**
 * Labour Payment System - Google Apps Script backend (compact & fast)
 *
 * Sheets : Entry, FMS, Master, Login Page. Columns are matched by header NAME, never by position.
 * Speed  : each request reads a sheet at most once, writes each row with ONE call, and the
 *          read-all response is cached for 45 s (cleared on every write; ?fresh=1 skips it).
 * Safety : every write runs under a script lock, so two users can never get the same Work ID.
 * Deploy : Deploy > Manage deployments > Edit > Version: New version  (the /exec URL stays the same).
 */
const S = { ENTRY: 'Entry', FMS: 'FMS', MASTER: 'Master', LOGIN: 'Login Page' };
const ENTRY_HEADERS = ['Timestamp', 'Work ID', 'Date', 'Firm', 'Shift', 'Incharge', 'Work', 'Labour (Count)', 'Hours', 'Qty',
  'Amount per person', 'Total Amount', 'Status', 'Work Remark', 'Labour 1', 'Labour 2', 'Labour 3', 'Labour 4', 'Labour 5',
  'Labour 6', 'Labour 7', 'Labour 8', 'Labour 9', 'Labour 10', 'Labour 11'];
const LOGIN_HEADERS = ['Username', 'Password', 'Name', 'Administrate', 'Dashboard Overview', 'New Work Entry (Form)',
  'All Work Orders Master Grid', 'Work Verification', 'Payment Approval', 'Payment Disbursal', 'Tally Entry', 'Reports & Export'];
const ALL_PERMS = ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally', 'reports', 'admin'];
const DEFAULT_USERS = [
  { id: 'usr_admin', username: 'admin', password: 'admin123', name: 'Admin', role: 'admin', status: 'active', assignedFirms: ['*'], permissions: ALL_PERMS },
  { id: 'usr_bhupendra', username: 'DME', password: 'user123', name: 'Bhupendra', role: 'user', status: 'active', assignedFirms: ['*'],
    permissions: ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally'] }
];
const DEFAULT_SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
const DEFAULT_FIRMS = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];
const DEFAULT_WORKS = [['Production', 450], ['Loading', 480], ['Loading Jumbo', 480], ['Unloading', 450], ['Unloading Jumbo', 450],
  ['Daily Wags', 400], ['Grinding', 500], ['Housekeeping', 380], ['Mechanical', 550], ['Crusing', 460]]
  .map(w => ({ name: w[0], defaultRate: w[1] }));
const NOT_A_WORK_ID = ['what', 'who', 'when', 'where', 'why', 'how', 'work id', 'workid', 'timestamp', 'date', 'shift', 'incharge',
  'work', 'status', 'total', 'grand total', 'planned', 'actual', 'delay'];
const CACHE_KEY = 'all_data', CACHE_TTL = 45, CHUNK = 80000;

// ---------------------------------------------------------------- small helpers
const norm = v => String(v == null ? '' : v).toLowerCase().trim();
const str = v => String(v == null ? '' : v).trim();
const iso = v => (v ? (v instanceof Date ? v.toISOString() : str(v)) : null);

function stamp() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'M/d/yyyy H:mm:ss');
}

function json(o) {
  return ContentService.createTextOutput(typeof o === 'string' ? o : JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function delayText(v) {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v !== 'number') return str(v);
  if (v === 0) return '0 hrs';
  const sign = v > 0 ? '+' : '';
  return Math.abs(v) >= 1 ? sign + v.toFixed(1) + ' days' : sign + (v * 24).toFixed(1) + ' hrs';
}

function loginSheet(ss) {
  const sh = [S.LOGIN, 'Login', 'Users', 'User'].map(n => ss.getSheetByName(n)).find(Boolean) || ss.insertSheet(S.LOGIN);
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, LOGIN_HEADERS.length).setValues([LOGIN_HEADERS]).setFontWeight('bold').setBackground('#E6F4EA');
    sh.getRange(2, 1, 2, LOGIN_HEADERS.length).setValues([
      ['admin', 'admin123', 'Admin', true, true, true, true, true, true, true, true, true],
      ['DME', 'user123', 'Bhupendra', false, true, true, true, true, true, true, true, false]]);
  }
  return sh;
}

// ---------------------------------------------------------------- sheet / column lookup
/** Index (0-based) of the header row inside already-read values (checks the first 10 rows). */
function headerRow(values) {
  for (let r = 0; r < Math.min(values.length, 10); r++) {
    const s = values[r].map(norm).join(' ');
    if (s.includes('work id') || s.includes('workid') || (s.includes('timestamp') && /date|shift|status/.test(s))) return r;
  }
  return 0;
}

/** Cheap sheet descriptor: header row, normalized headers, size. Reads only the top 10 rows. */
function sheetInfo(sheet) {
  const lr = sheet ? sheet.getLastRow() : 0, lc = sheet ? sheet.getLastColumn() : 0;
  if (!lr || !lc) return null;
  const top = sheet.getRange(1, 1, Math.min(lr, 10), lc).getValues(), hr = headerRow(top);
  return { sheet, hr, lr, lc, headers: top[hr].map(norm) };
}

/** 1-based column for the first matching header: exact match first, then a guarded partial match. */
function colOf(headers, names, def) {
  const exact = headers.findIndex(h => h && names.indexOf(h) >= 0);
  if (exact >= 0) return exact + 1;
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (!h) continue;
    for (const n of names) {
      if ((n === 'work' || n === 'activity' || n === 'work type') && /id|remark|date|count/.test(h)) continue;
      if ((n === 'work id' || n === 'workid') && h.includes('remark')) continue;
      if (h.includes(n) || (n.length >= 4 && h.length >= 4 && n.includes(h))) return c + 1;
    }
  }
  return def;
}

/** 1-based sheet row holding this Work ID (0 if absent). Reads only column B. */
function findRow(info, workId) {
  const n = info.lr - info.hr - 1;
  if (n < 1) return 0;
  const ids = info.sheet.getRange(info.hr + 2, 2, n, 1).getValues(), t = str(workId).toUpperCase();
  for (let i = 0; i < n; i++) if (str(ids[i][0]).toUpperCase() === t) return info.hr + 2 + i;
  return 0;
}

/** Set several cells of one row in a single write; untouched cells keep their formulas. map = {col1Based: value}. */
function setCells(info, row, map) {
  const w = Math.max(info.lc, ...Object.keys(map).map(Number));
  const rng = info.sheet.getRange(row, 1, 1, w), vals = rng.getValues()[0], fx = rng.getFormulas()[0];
  rng.setValues([vals.map((v, i) => (map[i + 1] !== undefined ? map[i + 1] : (fx[i] || v)))]);
}

/** All Work IDs of Entry + FMS (upper-cased) and the highest WRK-#### number. */
function workIds(ss) {
  const set = {};
  let max = 0;
  [S.ENTRY, S.FMS].forEach(name => {
    const info = sheetInfo(ss.getSheetByName(name));
    if (!info || info.lr < info.hr + 2) return;
    info.sheet.getRange(info.hr + 2, 2, info.lr - info.hr - 1, 1).getValues().forEach(r => {
      const id = str(r[0]).toUpperCase();
      if (!id) return;
      set[id] = true;
      const n = id.startsWith('WRK-') ? parseInt(id.slice(4), 10) : NaN;
      if (n > max) max = n;
    });
  });
  return { set, max };
}

function firstEmptyRow(sheet, startRow) {
  const max = sheet.getMaxRows();
  if (max >= startRow) {
    const ids = sheet.getRange(startRow, 2, max - startRow + 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (!str(ids[i][0])) return startRow + i;
  }
  sheet.insertRowsAfter(max, 1);
  return max + 1;
}

/** Make sure the Entry sheet has the standard headers and enough "Labour n" columns. Returns {hr, headers}. */
function ensureEntryHeaders(sheet, slots) {
  const empty = sheet.getLastRow() < 1, width = Math.max(sheet.getLastColumn(), 14 + slots, ENTRY_HEADERS.length);
  const top = empty ? [[]] : sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 10), width).getValues();
  const hr = empty ? 0 : headerRow(top), hdr = Array.from({ length: width }, (_, i) => (top[hr][i] === undefined ? '' : top[hr][i]));
  let changed = empty;
  if (empty || !norm(hdr[3]).includes('firm')) { ENTRY_HEADERS.forEach((h, i) => { hdr[i] = h; }); changed = true; }
  for (let i = 1; i <= slots; i++) {
    if (!norm(hdr[13 + i]).startsWith('labour')) { hdr[13 + i] = 'Labour ' + i; changed = true; }
  }
  if (changed) sheet.getRange(hr + 1, 1, 1, width).setValues([hdr]).setFontWeight('bold').setBackground('#D9EAD3');
  return { hr, headers: hdr.map(norm) };
}

// ---------------------------------------------------------------- reading
function getUsersData(ss) {
  const values = loginSheet(ss).getDataRange().getValues();
  if (values.length < 2) return DEFAULT_USERS;
  let hr = 0, uC = 0, pC = 1, nC = 2;
  for (let r = 0; r < Math.min(values.length, 5); r++) {
    const row = values[r].map(norm);
    if (row.includes('username') || row.includes('user') || (row.includes('password') && row.includes('name'))) {
      hr = r;
      row.forEach((h, c) => {
        if (['username', 'user name', 'user'].includes(h)) uC = c;
        else if (h === 'password' || h === 'pass') pC = c;
        else if (['name', 'full name', 'display name'].includes(h)) nC = c;
      });
      break;
    }
  }
  const keys = values[hr].map(norm), users = [];
  for (let i = hr + 1; i < values.length; i++) {
    const row = values[i], username = str(row[uC]);
    if (!username) continue;
    const f = {};   // which modules this user may use: 'full' or 'view'
    keys.forEach((h, c) => {
      const raw = row[c], t = norm(raw);
      if (!(raw === true || raw === 1 || ['true', 'yes', 'full', 'view'].includes(t))) return;
      const view = t === 'view' || /view|three party/.test(h);
      const mark = (k, isView) => { if (isView) f[k] = f[k] || 'view'; else f[k] = 'full'; };
      if (h.includes('admin') || h === 'all') f.admin = 'full';
      if (/new work entry|new entry|create indent|entry form/.test(h) || h === 'entry') f.new_entry = 'full';
      if (/master grid|work orders|tracker|store issue|inventory/.test(h)) f.tracker = 'full';
      if (/verification|verify/.test(h)) f.verification = 'full';
      if (h.includes('approval')) mark('approval', view);
      if (/disbursal|create po|payment/.test(h)) mark('payment', view);
      if (/tally|update vendor|accounts/.test(h)) mark('tally', view);
      if (/reports|export/.test(h)) f.reports = 'full';
    });
    const base = { id: 'usr_' + (i - hr), username, password: str(row[pC]), name: str(row[nC]) || username, status: 'active', assignedFirms: ['*'] };
    if (f.admin || norm(username) === 'admin') { users.push(Object.assign(base, { role: 'admin', permissions: ALL_PERMS })); continue; }
    const p = ['dashboard'], any = f.approval || f.payment || f.tally;
    if (f.new_entry) p.push('new_entry');
    if (f.tracker || (!f.new_entry && !any)) p.push('tracker');
    if (f.verification) p.push('verification');
    ['approval', 'payment', 'tally'].forEach(k => { if (f[k] === 'full') p.push(k); else if (f[k] === 'view') p.push(k + ':view'); });
    if (f.reports || f.tracker || f.approval === 'view' || f.payment === 'view' || f.tally === 'view') p.push('reports');
    users.push(Object.assign(base, { role: 'user', permissions: p }));
  }
  return users.length ? users : DEFAULT_USERS;
}

function getMasterData(ss, users) {
  const sheet = ss.getSheetByName(S.MASTER);
  const out = { incharges: [], labourers: [], shifts: DEFAULT_SHIFTS, workTypes: DEFAULT_WORKS, firmNames: DEFAULT_FIRMS, users: users || getUsersData(ss) };
  if (!sheet || sheet.getLastRow() < 1) return out;
  const values = sheet.getDataRange().getValues();
  let start = 0, cI = 0, cShift = 2, cWork = 3, cFirm = 4, cRate = 5;
  for (let r = 0; r < Math.min(values.length, 6); r++) {
    if (!/incharge|labour|shift|work|firm/.test(values[r].join(' ').toLowerCase())) continue;
    start = r + 1;
    values[r].forEach((v, c) => {
      const h = norm(v);
      if (h.includes('incharge')) cI = c;
      else if (h.includes('labour')) { /* labour names are always column B */ }
      else if (h.includes('shift')) cShift = c;
      else if (/work|type|activity/.test(h)) cWork = c;
      else if (h.includes('firm') || h.includes('company')) cFirm = c;
      else if (h.includes('rate') || h.includes('amount')) cRate = c;
    });
    break;
  }
  const seen = {}, works = {}, incharges = [], labourers = [], shifts = [], workTypes = [], firms = [];
  const BAD = ['labour', 'labours', 'labourer', 'labourers', 'labour names', 'labour name', 'name', 'names'];
  for (let i = start; i < values.length; i++) {
    const row = values[i], inc = str(row[cI]);
    if (inc && !inc.toLowerCase().includes('incharge') && !seen['i' + inc.toLowerCase()]) { seen['i' + inc.toLowerCase()] = 1; incharges.push(inc); }
    str(row[1]).split(/[,|\n\r/]+/).forEach(p => {
      const lab = p.trim().replace(/\s+/g, ' '), k = 'l' + lab.toLowerCase();
      if (lab.length >= 2 && BAD.indexOf(k.slice(1)) < 0 && !seen[k]) { seen[k] = 1; labourers.push(lab); }
    });
    const sh = str(row[cShift]), w = str(row[cWork]), fm = str(row[cFirm]);
    if (sh && shifts.indexOf(sh) < 0) shifts.push(sh);
    if (w && !w.toLowerCase().startsWith('shift') && !works[w.toLowerCase()]) { works[w.toLowerCase()] = 1; workTypes.push({ name: w, defaultRate: Number(row[cRate]) || 450 }); }
    if (fm && firms.indexOf(fm) < 0) firms.push(fm);
  }
  const byName = (a, b) => a.localeCompare(b);
  return { incharges: incharges.sort(byName), labourers: labourers.sort(byName), shifts: shifts.length ? shifts : DEFAULT_SHIFTS,
    workTypes: workTypes.length ? workTypes : DEFAULT_WORKS, firmNames: firms.length ? firms : DEFAULT_FIRMS, users: out.users };
}

function getEntriesData(ss) {
  const entries = [], byId = {};
  const eSheet = ss.getSheetByName(S.ENTRY), fSheet = ss.getSheetByName(S.FMS);

  if (eSheet && eSheet.getLastRow() >= 1) {
    const data = eSheet.getDataRange().getValues(), hr = headerRow(data), h = (data[hr] || []).map(norm);
    const c = n => colOf(h, n[0], n[1]) - 1;
    const [cFirm, cShift, cInc, cWork, cCount, cHours, cQty, cRate, cTotal, cStatus, cRemark] = [
      [['firm', 'firm name', 'company'], 4], [['shift'], 5], [['incharge', 'supervisor'], 6], [['work', 'activity', 'work type'], 7],
      [['labour (count)', 'labour count', 'count'], 8], [['hours'], 9], [['qty', 'quantity'], 10], [['amount per person', 'rate'], 11],
      [['total amount', 'amount', 'total'], 12], [['status'], 13], [['work remark', 'remark', 'remarks'], 14]].map(c);
    for (let i = hr + 1; i < data.length; i++) {
      const row = data[i], workId = str(row[1] || row[0]);
      if (!workId || NOT_A_WORK_ID.indexOf(workId.toLowerCase()) >= 0) continue;
      const labourNames = [];
      for (let k = 14; k < row.length; k++) {
        const v = str(row[k]);
        if (v && !v.toLowerCase().startsWith('labour') && k !== cRemark) labourNames.push(v);
      }
      const count = Number(row[cCount]) || labourNames.length || 1, rate = Number(row[cRate]) || 0;
      const e = {
        timestamp: row[0], workId, date: row[2], firmName: str(row[cFirm] || 'PMMPL'), shift: str(row[cShift] || 'Shift 1'),
        incharge: str(row[cInc]), work: str(row[cWork]), labourCount: count, hours: Number(row[cHours]) || 0, qty: Number(row[cQty]) || 0,
        rate, totalAmount: Number(row[cTotal]) > 0 ? Number(row[cTotal]) : count * rate,
        status: str(row[cStatus] || 'Pending Verification'), workRemark: str(row[cRemark]), labourNames,
        verificationPlanned: null, verificationActual: null, verificationDelay: '-', approvalPlanned: null, approvalActual: null,
        approvalDelay: '-', paymentPlanned: null, paymentActual: null, paymentDelay: '-', tallyPlanned: null, tallyActual: null, tallyDelay: '-'
      };
      entries.push(e);
      (byId[workId] = byId[workId] || []).push(e);
    }
  }

  if (fSheet && fSheet.getLastRow() >= 1) {
    const data = fSheet.getDataRange().getValues(), hr = headerRow(data), h = (data[hr] || []).map(norm);
    const c = (names, def) => colOf(h, names, def) - 1;
    const p1 = c(['planned timestamp', 'planned 1', 'planned date', 'planned date 1', 'planned', 'verification planned', 'plan date'], 14);
    const a1 = c(['actual timestamp', 'actual 1', 'actual'], 15), d1 = c(['delay', 'delay 1'], 16);
    const cur = c(['current status', 'current', 'verification status'], 17), rem = c(['remark', 'remarks', 'verifier remark', 'verification remark'], 18);
    const p3 = c(['planned 3', 'planned date 3', 'payment planned', 'planned payment', 'payment plan', 'plan date 3'], 19);
    const a3 = c(['actual 3', 'payment actual', 'actual payment'], 20), d3 = c(['delay 3'], 21);
    const wRem = c(['work remark', 'work remarks'], 13), stCol = c(['status'], 12);
    for (let i = hr + 1; i < data.length; i++) {
      const row = data[i], workId = str(row[1] || row[0]);
      if (!workId || NOT_A_WORK_ID.indexOf(workId.toLowerCase()) >= 0) continue;
      const matches = byId[workId] || [], e = matches.find(m => !m._fmsMatched) || matches[0];
      if (!e) continue;
      e._fmsMatched = true;
      const curStatus = str(row[cur]), fmsRemark = str(row[rem]), main = norm(row[stCol]), cancelled = norm(curStatus).includes('cancel') || main.includes('cancel');
      e.verificationPlanned = iso(row[p1]); e.verificationActual = iso(row[a1]); e.verificationDelay = delayText(row[d1]);
      e.paymentPlanned = iso(row[p3]); e.paymentActual = iso(row[a3]); e.paymentDelay = delayText(row[d3]);
      if (curStatus) e.currentStatus = curStatus;
      if (fmsRemark) { e.verificationRemarks = fmsRemark; if (cancelled) e.cancellationRemarks = fmsRemark; }
      if (!e.workRemark && row[wRem]) e.workRemark = str(row[wRem]);
      e.status = (e.status === 'Cancelled' || cancelled) ? 'Cancelled'
        : e.paymentActual ? 'Paid (Pending Tally)'
        : (e.verificationActual || norm(curStatus).includes('verified')) ? 'Verified (Pending Approval)' : 'Pending Verification';
    }
  }
  return entries;
}

/** Everything the app needs in one response; served from cache for 45 s unless fresh. */
function getAllData(ss, fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    try {
      const n = Number(cache.get(CACHE_KEY + '_n'));
      if (n) {
        const parts = cache.getAll(Array.from({ length: n }, (_, i) => CACHE_KEY + '_' + i));
        const text = Array.from({ length: n }, (_, i) => parts[CACHE_KEY + '_' + i]).join('');
        if (text.length && !text.includes('undefined')) return text;
      }
    } catch (e) { /* cache is optional */ }
  }
  const users = getUsersData(ss);
  const text = JSON.stringify({ master: getMasterData(ss, users), entries: getEntriesData(ss), users, status: 'success' });
  try {
    const put = {}, n = Math.ceil(text.length / CHUNK);
    for (let i = 0; i < n; i++) put[CACHE_KEY + '_' + i] = text.slice(i * CHUNK, (i + 1) * CHUNK);
    put[CACHE_KEY + '_n'] = String(n);
    cache.putAll(put, CACHE_TTL);
  } catch (e) { /* too big to cache: fine */ }
  return text;
}

// ---------------------------------------------------------------- writing
/** Normalized field bag shared by create + update. */
function fields(d) {
  const names = Array.isArray(d.labourNames) ? d.labourNames.map(str).filter(Boolean) : [];
  const count = names.length || Number(d.labourCount) || 1, rate = Number(d.rate) || 0;
  return {
    names, count, rate, qty: Number(d.qty) || 0, hours: Number(d.hours) || 0, date: d.date || '', shift: str(d.shift), incharge: str(d.incharge),
    work: str(d.work), remark: str(d.workRemark), firm: str(d.firmName || d.firm) || 'PMMPL',
    total: Number(d.totalAmount) > 0 ? Number(d.totalAmount) : count * rate,
    currentStatus: d.currentStatus, fmsRemark: d.remarks || d.verificationRemarks || d.cancellationRemarks
  };
}

/** Value a sheet column should hold for header h (undefined = leave untouched / blank). fms: FMS sheet; upd: edit of an existing row. */
function cellValue(h, v, fms, upd) {
  switch (h) {
    case 'timestamp': return upd ? undefined : v.ts;
    case 'work id': case 'workid': return upd ? undefined : v.workId;
    case 'date': return v.date;
    case 'firm': case 'firm name': case 'company': return v.firm;
    case 'shift': return v.shift;
    case 'incharge': case 'supervisor': return v.incharge;
    case 'work': case 'activity': case 'work type': return v.work;
    case 'hours': return v.hours;
    case 'qty': case 'quantity': return v.qty;
    case 'rate': return fms ? undefined : v.rate;
    case 'total amount': case 'amount': case 'total': return v.total;
    case 'status': return v.status;
    case 'current status': case 'current':
      if (fms && upd) return v.status === 'Cancelled' ? 'Cancelled' : v.currentStatus;
      return h === 'current status' ? v.status : undefined;
    case 'remark': case 'remarks': case 'verifier remark':
      if (fms && upd) return v.fmsRemark || undefined;
      return h === 'verifier remark' ? undefined : v.remark;
  }
  if (h.includes('work remark') || (h.includes('remark') && !(fms && upd)) || (!fms && h.includes('notes'))) return v.remark;
  if (h.includes('amount per person')) return fms ? undefined : v.rate;
  if (fms ? h.includes('labour') : /labour \(count\)|labour count|no of labour/.test(h)) return v.count;
  if (!fms && h.startsWith('labour') && !h.includes('count')) {
    const i = parseInt(h.replace('labour', '').trim(), 10);
    return i >= 1 ? (v.names[i - 1] || '') : undefined;
  }
  return undefined;
}

function createEntry(ss, d) {
  const ids = workIds(ss), v = fields(d);
  v.ts = stamp();
  v.status = 'Pending Verification';
  v.workId = str(d.workId);
  if (!v.workId || ids.set[v.workId.toUpperCase()]) v.workId = 'WRK-' + String(ids.max + 1).padStart(4, '0');

  const entry = ss.getSheetByName(S.ENTRY) || ss.insertSheet(S.ENTRY);
  const eh = ensureEntryHeaders(entry, Math.max(v.names.length, 11));
  const row = firstEmptyRow(entry, eh.hr + 2);
  entry.getRange(row, 1, 1, eh.headers.length).setValues([eh.headers.map(h => { const x = h ? cellValue(h, v, false, false) : undefined; return x === undefined ? '' : x; })]);

  const fi = sheetInfo(ss.getSheetByName(S.FMS));
  if (fi) {
    // Only the entry columns (A..M) are written; planned/actual/delay columns hold the user's formulas.
    const stop = fi.headers.findIndex(h => h.includes('planned timestamp') || h === 'planned 1');
    const width = stop >= 0 ? stop : 13, fRow = firstEmptyRow(fi.sheet, fi.hr + 2);
    fi.sheet.getRange(fRow, 1, 1, width).setValues([Array.from({ length: width }, (_, c) => { const x = fi.headers[c] ? cellValue(fi.headers[c], v, true, false) : undefined; return x === undefined ? '' : x; })]);
    if (fRow > fi.hr + 2) {   // keep the "planned" formula column filled down
      const prev = fi.sheet.getRange(fRow - 1, width + 1);
      if (prev.getFormula()) prev.copyTo(fi.sheet.getRange(fRow, width + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
  }
  return { status: 'success', workId: v.workId, timestamp: v.ts, firmName: v.firm, labourCount: v.count, labourNames: v.names, workRemark: v.remark, message: 'Entry created successfully' };
}

function updateEntry(ss, d) {
  if (!d.workId) return { status: 'error', message: 'Work ID is required for update' };
  const v = fields(d);
  v.status = d.status ? str(d.status) : 'Pending Verification';

  const entry = ss.getSheetByName(S.ENTRY);
  if (entry && entry.getLastRow() >= 1) ensureEntryHeaders(entry, Math.max(v.names.length, 11));
  [[entry, false], [ss.getSheetByName(S.FMS), true]].forEach(pair => {
    const info = sheetInfo(pair[0]), row = info ? findRow(info, d.workId) : 0;
    if (!row) return;
    const map = {};
    info.headers.forEach((h, c) => { const x = h ? cellValue(h, v, pair[1], true) : undefined; if (x !== undefined) map[c + 1] = x; });
    if (pair[1] && v.status === 'Cancelled') {   // stamp the verification time once
      const col = colOf(info.headers, ['actual timestamp', 'actual 1', 'verification actual', 'actual'], 15);
      if (!info.sheet.getRange(row, col).getValue()) map[col] = stamp();
    }
    setCells(info, row, map);
  });
  return { status: 'success', workId: d.workId, message: 'Work entry updated successfully' };
}

/**
 * Move a work order to the next stage: writes the given FMS cells + status on FMS, and the status on Entry.
 * cells = [[header names, default column, value], ...] (empty values are skipped).
 */
function advance(ss, workId, status, cells) {
  const fms = sheetInfo(ss.getSheetByName(S.FMS)), fRow = fms ? findRow(fms, workId) : 0;
  if (fRow) {
    const map = {};
    cells.forEach(c => { if (c[2]) map[colOf(fms.headers, c[0], c[1])] = c[2]; });
    map[colOf(fms.headers, ['status'], 12)] = status;
    setCells(fms, fRow, map);
  }
  const ent = sheetInfo(ss.getSheetByName(S.ENTRY)), eRow = ent ? findRow(ent, workId) : 0;
  if (eRow) setCells(ent, eRow, { [colOf(ent.headers, ['status', 'current status'], 13)]: status });
}

const A1 = ['actual timestamp', 'actual 1', 'verification actual', 'actual'], CUR = ['current status', 'current', 'verification status'],
  REM = ['remark', 'remarks', 'verifier remark', 'work remark'];

function verifyWork(ss, d) {
  const cancel = d.status === 'Cancelled' || d.isCancelled === true, at = stamp();
  const next = cancel ? 'Cancelled' : 'Verified (Pending Approval)', cur = cancel ? 'Cancelled' : 'Verified';
  advance(ss, d.workId, next, [[A1, 15, at], [CUR, 17, cur], [REM, 18, d.remarks]]);
  return { status: 'success', workId: d.workId, actualDate: at, currentStatus: cur, nextStatus: next };
}

function cancelWork(ss, d) {
  const at = stamp();
  advance(ss, d.workId, 'Cancelled', [[A1, 15, at], [CUR, 17, 'Cancelled'], [REM, 18, d.remarks || 'Cancelled by Verifier']]);
  return { status: 'success', workId: d.workId, actualDate: at, currentStatus: 'Cancelled', nextStatus: 'Cancelled' };
}

function approvePayment(ss, d) {
  const at = stamp(), next = 'Approved (Pending Payment)';
  advance(ss, d.workId, next, [[['actual 2', 'actual approval', 'payment approval actual'], 18, at]]);
  return { status: 'success', workId: d.workId, actualDate: at, nextStatus: next };
}

function recordPayment(ss, d) {
  const at = stamp(), next = 'Paid (Pending Tally)';
  advance(ss, d.workId, next, [[['actual 3', 'actual payment', 'payment actual'], 20, at]]);
  return { status: 'success', workId: d.workId, actualDate: at, nextStatus: next };
}

function recordTally(ss, d) {
  const at = stamp(), next = 'Tally Complete';
  advance(ss, d.workId, next, [[['actual 4', 'actual tally', 'tally actual'], 24, at]]);
  return { status: 'success', workId: d.workId, actualDate: at, nextStatus: next };
}

function updateWorkRemark(ss, d) {
  if (!d.workId) return { status: 'error', message: 'Work ID required' };
  [[S.ENTRY, 14], [S.FMS, 13]].forEach(p => {
    const info = sheetInfo(ss.getSheetByName(p[0])), row = info ? findRow(info, d.workId) : 0;
    if (row) info.sheet.getRange(row, colOf(info.headers, ['work remark', 'remark', 'remarks'], p[1])).setValue(d.workRemark || '');
  });
  return { status: 'success', workId: d.workId, workRemark: d.workRemark || '' };
}

function updateMasterData(ss, d) {
  const sheet = ss.getSheetByName(S.MASTER) || ss.insertSheet(S.MASTER);
  const inc = d.incharges || [], lab = d.labourers || [], sh = d.shifts || [], wt = d.workTypes || [], fm = d.firmNames || [];
  const rows = [['Incharge Names', 'Labour Names', 'Shifts', 'Work Types', 'Firm Names', 'Default Rates']];
  for (let i = 0, n = Math.max(inc.length, lab.length, sh.length, wt.length, fm.length); i < n; i++) {
    const w = wt[i];
    rows.push([inc[i] || '', lab[i] || '', sh[i] || '', w ? (typeof w === 'string' ? w : w.name) : '', fm[i] || '', w && typeof w === 'object' ? w.defaultRate : '']);
  }
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 6).setValues(rows);
  return { status: 'success', message: 'Master data updated' };
}

function updateUsers(ss, d) {
  const list = Array.isArray(d) ? d : (d.users || []);
  if (!list.length) return { status: 'error', message: 'No users provided' };
  const sheet = loginSheet(ss), rows = [LOGIN_HEADERS];
  list.forEach(u => {
    const p = Array.isArray(u.permissions) ? u.permissions : [], admin = u.role === 'admin' || p.includes('admin');
    const can = m => admin || p.includes(m) || p.includes(m + ':full') || p.includes(m + ':view');
    rows.push([u.username || '', u.password || '', u.name || u.displayName || u.username || '', admin, can('dashboard'), admin || p.includes('new_entry') || p.includes('new_entry:full'),
      can('tracker'), can('verification'), can('approval'), can('payment'), can('tally'), can('reports')]);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, LOGIN_HEADERS.length).setValues(rows);
  sheet.getRange(1, 1, 1, LOGIN_HEADERS.length).setFontWeight('bold').setBackground('#E6F4EA');
  return { status: 'success', message: 'Users updated in Login Page sheet' };
}

function init(ss) {
  ensureEntryHeaders(ss.getSheetByName(S.ENTRY) || ss.insertSheet(S.ENTRY), 11);
  loginSheet(ss);
  return { message: 'Sheets auto-configured and ready', status: 'success' };
}

// ---------------------------------------------------------------- HTTP entry points
const WRITES = {
  submitLaborPayment: createEntry, createEntry, verifyWork, cancelWork, updateWorkEntry: updateEntry, updateEntry, approvePayment,
  recordPayment, recordTally, updateMasterData, updateUsers, saveUsers: updateUsers, updateWorkRemark, init
};

/** Run a write under a lock (no duplicate IDs / interleaved edits) and drop the read cache. */
function runWrite(action, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const result = WRITES[action](SpreadsheetApp.getActiveSpreadsheet(), data);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(CACHE_KEY + '_n');
    return result;
  } finally {
    lock.releaseLock();
  }
}

function respond(fn) {
  try { return json(fn()); } catch (err) { return json({ status: 'error', message: String(err) }); }
}

function doGet(e) {
  return respond(() => {
    const p = (e && e.parameter) || {}, action = p.action || 'getAllData', ss = SpreadsheetApp.getActiveSpreadsheet();
    if (WRITES[action]) return runWrite(action, p.data ? JSON.parse(p.data) : {});
    switch (action) {
      case 'getAllData': return getAllData(ss, p.fresh === '1');
      case 'getMasterData': case 'getDropdownData': return getMasterData(ss);
      case 'getUsers': case 'getLoginUsers': return { users: getUsersData(ss) };
      case 'getEntries': return { entries: getEntriesData(ss) };
      default: return { error: 'Unknown GET action: ' + action, status: 'error' };
    }
  });
}

function doPost(e) {
  return respond(() => {
    let payload = {};
    try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = {}; }
    const action = payload.action || (e && e.parameter && e.parameter.action);
    if (!WRITES[action]) return { error: 'Unknown POST action: ' + action, status: 'error' };
    return runWrite(action, payload.data || {});
  });
}
