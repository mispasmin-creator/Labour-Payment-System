/**
 * API Service Layer for Labour Payment & Workflow Tracking System
 * Handles communication with Google Apps Script Web App with offline LocalStorage fallback.
 */

import { INITIAL_ENTRIES, INITIAL_MASTER_DATA, DEFAULT_LOGIN_USERS } from '../utils/mockData';
import { calculateWorkflowDelay, getNowTimestamp } from '../utils/dateUtils';
import { isTonBasedWork } from '../utils/workTypes';

const STORAGE_KEYS = {
  SCRIPT_URL: 'labour_sys_script_url',
  ENTRIES: 'labour_sys_entries',
  MASTER: 'labour_sys_master',
  ROLE: 'labour_sys_current_role',
  USERS: 'labour_sys_users_db'
};

const INVALID_ROW_KEYWORDS = [
  'what', 'who', 'when', 'where', 'why', 'how',
  'work id', 'workid', 'timestamp', 'date', 'shift',
  'incharge', 'work', 'status', 'total', 'grand total',
  'planned', 'actual', 'delay'
];

export function isValidEntry(item) {
  if (!item) return false;
  const wId = String(item.workId || '').trim().toLowerCase();
  if (!wId || INVALID_ROW_KEYWORDS.includes(wId)) return false;
  
  const plan = String(item.verificationPlanned || item.timestamp || '').trim().toLowerCase();
  if (INVALID_ROW_KEYWORDS.includes(plan)) return false;

  const incharge = String(item.incharge || '').trim().toLowerCase();
  if (INVALID_ROW_KEYWORDS.includes(incharge)) return false;

  // Filter out dummy blank rows (like WRK-0015 & WRK-0016) that have no work activity and no incharge
  const work = String(item.work || '').trim();
  const inc = String(item.incharge || '').trim();
  if (!work && !inc) return false;

  return true;
}

export function cleanTimestamp(val) {
  if (!val || val === 'null' || val === 'undefined' || val === '-') return null;
  return String(val).trim();
}

export function normalizeStatus(status, entry = {}) {
  const vActual = cleanTimestamp(entry.verificationActual);
  const aActual = cleanTimestamp(entry.approvalActual);
  const pActual = cleanTimestamp(entry.paymentActual);
  const tActual = cleanTimestamp(entry.tallyActual);

  // If verification has not actually occurred (Col O Actual Timestamp is empty), it is strictly Pending Verification!
  if (!vActual) {
    return 'Pending Verification';
  }

  const s = String(status || '').toLowerCase().trim();
  if (s.includes('tally') || tActual) return 'Tally Complete';
  if (s.includes('paid') || pActual) return 'Paid (Pending Tally)';
  if (s.includes('approved') || aActual) return 'Approved (Pending Payment)';
  return 'Verified (Pending Approval)';
}

export function cleanDelay(val) {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'number') {
    if (val === 0) return '0 hrs';
    if (Math.abs(val) >= 1) return `${val > 0 ? '+' : ''}${val.toFixed(1)} days`;
    return `${val > 0 ? '+' : ''}${(val * 24).toFixed(1)} hrs`;
  }
  return String(val).trim();
}

export function filterValidEntries(list) {
  if (!Array.isArray(list)) return [];
  const defaultFirms = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];
  return list.filter(isValidEntry).map((e, idx) => {
    let firmName = String(e.firmName || e.firm || '').trim();
    if (!firmName || firmName === '-' || firmName.toLowerCase().startsWith('firm ')) {
      firmName = defaultFirms[idx % defaultFirms.length];
    }
    let work = String(e.work || e.activity || '').trim();
    if (!work || work === e.workId || work.startsWith('WRK-')) {
      work = 'Production';
    }
    const isTon = isTonBasedWork(work);
    const qty = Number(e.qty) || 0;
    const rate = Number(e.rate) || 0;
    const labourCount = Number(e.labourCount) || (e.labourNames ? e.labourNames.length : 1);

    // Compute true total amount
    let totalAmount = 0;
    if (isTon && qty > 0 && rate > 0) {
      totalAmount = qty * rate;
    } else if (!isTon && labourCount > 0 && rate > 0) {
      totalAmount = labourCount * rate;
    } else {
      totalAmount = Number(e.totalAmount) || (isTon ? qty * rate : labourCount * rate);
    }

    return {
      ...e,
      work,
      firmName,
      qty,
      rate,
      labourCount,
      totalAmount,
      verificationActual: cleanTimestamp(e.verificationActual),
      approvalActual: cleanTimestamp(e.approvalActual),
      paymentActual: cleanTimestamp(e.paymentActual),
      tallyActual: cleanTimestamp(e.tallyActual),
      verificationDelay: cleanDelay(e.verificationDelay),
      approvalDelay: cleanDelay(e.approvalDelay),
      paymentDelay: cleanDelay(e.paymentDelay),
      tallyDelay: cleanDelay(e.tallyDelay),
      status: normalizeStatus(e.status, e)
    };
  });
}

export function initLocalStorage() {
  const existingMaster = localStorage.getItem(STORAGE_KEYS.MASTER);
  if (!existingMaster) {
    localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(INITIAL_MASTER_DATA));
  } else {
    try {
      const parsed = JSON.parse(existingMaster);
      if (!parsed.shifts || !parsed.shifts.includes('Shift 1') || !parsed.workTypes || !parsed.workTypes.some(w => (typeof w === 'string' ? w : w.name) === 'Production')) {
        parsed.shifts = INITIAL_MASTER_DATA.shifts;
        parsed.workTypes = INITIAL_MASTER_DATA.workTypes;
        localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(parsed));
      }
    } catch (e) {
      localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(INITIAL_MASTER_DATA));
    }
  }

  if (localStorage.getItem(STORAGE_KEYS.ENTRIES) === null) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify([]));
  }
}

/**
 * Get current Google Apps Script Web App URL from environment or settings
 */
export function getScriptUrl() {
  const envUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || 'https://script.google.com/macros/s/AKfycbwD76h13k1eEvdiymPjX3mthEMFtUfYIb-Y5NvgG-fdPaofVVVDQdREFUH69eQJFN4FeA/exec';
}

/**
 * Save Google Apps Script Web App URL
 */
export function setScriptUrl(url) {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.SCRIPT_URL);
  }
}

/**
 * Test Connection to Google Apps Script Web App
 */
export async function testConnection(url) {
  if (!url) throw new Error('Please enter a Google Apps Script Web App URL.');

  try {
    const sep = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${sep}action=init`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    throw new Error(`Failed to reach Web App: ${err.message}. Ensure Apps Script is deployed with "Who has access: Anyone".`);
  }
}

export const testGoogleSheetsConnection = testConnection;

/**
 * Robust fetch with timeout to prevent Google Apps Script from hanging indefinitely
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export const STAGE_RANKS = {
  'Pending Verification': 1,
  'Pending': 1,
  'Verified': 2,
  'Verified (Pending Approval)': 2,
  'Approved': 3,
  'Approved (Pending Payment)': 3,
  'Paid': 4,
  'Paid (Pending Tally)': 4,
  'Tally Complete': 5
};

export function reconcileRemoteWithLocal(remoteCleaned, localEntries = []) {
  if (!Array.isArray(remoteCleaned)) return [];
  if (remoteCleaned.length === 0) return [];
  if (!Array.isArray(localEntries) || localEntries.length === 0) return remoteCleaned;

  return remoteCleaned.map(remote => {
    // Robust match: Check timestamp or workId+work first to avoid duplicate workId collisions (e.g. multiple WRK-0019 in Sheet)
    const local = localEntries.find(l => 
      (l.timestamp && remote.timestamp && l.timestamp === remote.timestamp) ||
      (l.workId && remote.workId && l.workId === remote.workId && l.work === remote.work)
    ) || localEntries.find(l => l.workId && remote.workId && l.workId === remote.workId);

    if (!local) return remote;

    const isLocalVerified = Boolean(local.verificationActual && local.verificationActual !== '-' && local.verificationActual !== 'null');
    const isRemoteVerified = Boolean(remote.verificationActual && remote.verificationActual !== '-' && remote.verificationActual !== 'null');

    const rRank = STAGE_RANKS[remote.status] || (isRemoteVerified ? 2 : 1);
    const lRank = STAGE_RANKS[local.status] || (isLocalVerified ? 2 : 1);

    // If local was verified, NEVER downgrade back to Pending even if remote is still pending sync
    if (lRank > rRank || (isLocalVerified && !isRemoteVerified)) {
      return {
        ...remote,
        status: local.status || (isLocalVerified ? 'Verified (Pending Approval)' : remote.status),
        verificationActual: local.verificationActual || remote.verificationActual,
        approvalActual: local.approvalActual || remote.approvalActual,
        paymentActual: local.paymentActual || remote.paymentActual,
        tallyActual: local.tallyActual || remote.tallyActual,
        paymentMethod: local.paymentMethod || remote.paymentMethod,
        paymentRef: local.paymentRef || remote.paymentRef,
        tallyVoucher: local.tallyVoucher || remote.tallyVoucher,
        tallyLedger: local.tallyLedger || remote.tallyLedger,
        labourNames: (local.labourNames && local.labourNames.length > 0) ? local.labourNames : (remote.labourNames || []),
        firmName: local.firmName || remote.firmName || '',
        workRemark: local.workRemark || remote.workRemark || ''
      };
    }

    return {
      ...remote,
      verificationActual: remote.verificationActual || local.verificationActual || null,
      approvalActual: remote.approvalActual || local.approvalActual || null,
      paymentActual: remote.paymentActual || local.paymentActual || null,
      tallyActual: remote.tallyActual || local.tallyActual || null,
      labourNames: (remote.labourNames && remote.labourNames.length > 0) ? remote.labourNames : (local.labourNames || []),
      firmName: remote.firmName || local.firmName || '',
      workRemark: remote.workRemark || local.workRemark || ''
    };
  });
}

/**
 * Fetch All Data (Entries + Master + Users) in a single unified roundtrip
 */
export async function fetchAllData() {
  const url = getScriptUrl();
  if (!url) return null;

  try {
    const sep = url.includes('?') ? '&' : '?';
    const response = await fetchWithTimeout(`${url}${sep}action=getAllData`, { redirect: 'follow' }, 10000);
    if (response.ok) {
      const json = await response.json();
      if (json && (json.entries || json.master || json.users)) {
        const cleanedEntries = filterValidEntries(json.entries || []);

        // Read FRESH local entries right now (after the network response arrives)
        let freshLocal = [];
        try {
          const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ENTRIES) : null;
          freshLocal = rawLocal ? filterValidEntries(JSON.parse(rawLocal)) : [];
        } catch (e) {
          freshLocal = [];
        }

        const mergedEntries = reconcileRemoteWithLocal(cleanedEntries, freshLocal);

        const sanitizedMaster = json.master ? sanitizeMasterData(json.master) : null;

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(mergedEntries));
          if (sanitizedMaster) localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(sanitizedMaster));
          if (json.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(json.users));
        }
        return {
          entries: mergedEntries,
          master: sanitizedMaster,
          users: json.users
        };
      }
    }
  } catch (e) {
    console.warn('Unified getAllData fetch failed or timed out:', e.message);
  }
  return null;
}

/**
 * Sanitize, split comma/newline-separated names, deduplicate (case-insensitive) & sort labourers list
 * Specifically parses Master Sheet Col B data into clean individual names
 */
export function sanitizeLabourersList(rawLabourers) {
  if (!rawLabourers || !Array.isArray(rawLabourers)) return [];
  const seen = new Set();
  const list = [];

  for (const item of rawLabourers) {
    if (!item) continue;
    // Split entries that have multiple names separated by comma, newline, pipe or slash
    const parts = String(item).split(/[,|\n\r/]+/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/\s+/g, ' ');
      if (!trimmed || trimmed.length < 2) continue;
      const lower = trimmed.toLowerCase();
      // Filter out generic header words
      if (
        lower === 'labour' ||
        lower === 'labours' ||
        lower === 'labourer' ||
        lower === 'labourers' ||
        lower === 'labour names' ||
        lower === 'labour name' ||
        lower === 'name' ||
        lower === 'names'
      ) {
        continue;
      }
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(trimmed);
      }
    }
  }

  return list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Sanitize all Master Sheet data fields
 */
export function sanitizeMasterData(master) {
  if (!master) return master;

  // Sanitize labourers from Master Sheet Col B
  const rawLabourers = Array.isArray(master.labourers) ? master.labourers : [];
  const cleanLabourers = sanitizeLabourersList(rawLabourers);

  // Sanitize incharges from Master Sheet Col A
  const seenInc = new Set();
  const cleanIncharges = [];
  const rawIncharges = Array.isArray(master.incharges) ? master.incharges : [];
  for (const inc of rawIncharges) {
    const trimmed = String(inc || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower === 'incharge' || lower === 'incharges' || lower === 'incharge names') continue;
    if (!seenInc.has(lower)) {
      seenInc.add(lower);
      cleanIncharges.push(trimmed);
    }
  }

  // Sanitize workTypes
  const rawWorks = Array.isArray(master.workTypes) ? master.workTypes : [];
  const validWorkTypes = rawWorks.filter(
    w => !(typeof w === 'string' ? w : w?.name || '').toLowerCase().startsWith('shift')
  );

  return {
    ...master,
    incharges: cleanIncharges.length > 0 ? cleanIncharges : INITIAL_MASTER_DATA.incharges,
    labourers: cleanLabourers.length > 0 ? cleanLabourers : INITIAL_MASTER_DATA.labourers,
    shifts: Array.isArray(master.shifts) && master.shifts.length > 0 ? master.shifts : INITIAL_MASTER_DATA.shifts,
    workTypes: validWorkTypes.length > 0 ? validWorkTypes : INITIAL_MASTER_DATA.workTypes,
    firmNames: Array.isArray(master.firmNames) && master.firmNames.length > 0 ? master.firmNames : INITIAL_MASTER_DATA.firmNames
  };
}

/**
 * Fetch Full Master Data from Google Sheets
 */
export async function fetchMasterData() {
  const url = getScriptUrl();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const response = await fetchWithTimeout(`${url}${sep}action=getMasterData`, { redirect: 'follow' }, 9000);
      if (response.ok) {
        const json = await response.json();
        if (json && (json.incharges || json.labourers)) {
          const sanitized = sanitizeMasterData(json);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(sanitized));
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.warn('Google Sheets API unavailable, using local cache:', e);
    }
  }

  // Fallback to local storage
  initLocalStorage();
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MASTER) : null;
  const parsed = raw ? JSON.parse(raw) : INITIAL_MASTER_DATA;
  return sanitizeMasterData(parsed);
}

export async function sendToAppsScript(action, data) {
  const url = getScriptUrl();
  if (!url) return false;

  try {
    // Primary: POST with text/plain (mode: 'no-cors' prevents browser CORS preflight blocks)
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, data })
    });
    return true;
  } catch (postErr) {
    console.warn('POST sync failed, trying GET fallback:', postErr);
    try {
      const sep = url.includes('?') ? '&' : '?';
      const encodedData = encodeURIComponent(JSON.stringify(data));
      await fetch(`${url}${sep}action=${action}&data=${encodedData}`, {
        method: 'GET',
        mode: 'no-cors'
      });
      return true;
    } catch (getErr) {
      console.error('All sync channels failed:', getErr);
      return false;
    }
  }
}

/**
 * Save / Update Master Data
 */
export async function saveMasterData(masterData) {
  localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(masterData));
  await sendToAppsScript('updateMasterData', masterData);
  return { success: true, data: masterData };
}

/**
 * Fetch Users from "Login Page" Sheet in Google Sheets
 */
export async function fetchUsers() {
  const url = getScriptUrl();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const response = await fetchWithTimeout(`${url}${sep}action=getUsers`, { redirect: 'follow' }, 9000);
      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.users) && json.users.length > 0) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(json.users));
          return json.users;
        }
      }
    } catch (e) {
      console.warn('Google Sheets fetchUsers failed or timed out, using cached/default users:', e.message);
    }
  }

  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USERS) : null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length >= DEFAULT_LOGIN_USERS.length) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_LOGIN_USERS));
  return DEFAULT_LOGIN_USERS;
}

/**
 * Save / Update Users in "Login Page" Sheet in Google Sheets
 */
export async function saveUsersToRemote(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  await sendToAppsScript('updateUsers', { users });
  return { success: true, data: users };
}

/**
 * Fetch All Entries with 4-Stage Workflow state & smart reconciliation
 */
export async function fetchEntries() {
  const url = getScriptUrl();

  let localEntries = [];
  try {
    const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ENTRIES) : null;
    localEntries = rawLocal ? filterValidEntries(JSON.parse(rawLocal)) : [];
  } catch (e) {
    localEntries = [];
  }

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const response = await fetchWithTimeout(`${url}${sep}action=getEntries`, { redirect: 'follow' }, 10000);
      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.entries)) {
          const remoteCleaned = filterValidEntries(json.entries);


          // If Google Sheet is empty (user deleted rows in Sheet), reflect empty list!
          if (remoteCleaned.length === 0) {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify([]));
            }
            return [];
          }

          // Read FRESH local entries right now
          let freshLocal = [];
          try {
            const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ENTRIES) : null;
            freshLocal = rawLocal ? filterValidEntries(JSON.parse(rawLocal)) : [];
          } catch (e) {
            freshLocal = [];
          }

          const merged = reconcileRemoteWithLocal(remoteCleaned, freshLocal);

          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(merged));
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn('Google Sheets fetch failed, using local cache:', e);
    }
  }

  return localEntries;
}

/**
 * Generate Next Local Work ID
 */
function getNextLocalWorkId(entries) {
  let maxNum = 0;
  entries.forEach(e => {
    if (e.workId && e.workId.startsWith('WRK-')) {
      const num = parseInt(e.workId.replace('WRK-', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `WRK-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Submit New Work Entry
 */
export async function submitWorkEntry(entryData) {
  initLocalStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  const entries = raw ? filterValidEntries(JSON.parse(raw)) : [];

  const timestamp = getNowTimestamp();
  const workId = entryData.workId || getNextLocalWorkId(entries);
  const labourCount = Number(entryData.labourCount) || (entryData.labourNames ? entryData.labourNames.length : 1);
  const rate = Number(entryData.rate) || 0;
  const qty = Number(entryData.qty) || 0;
  const isTon = isTonBasedWork(entryData.work);
  const totalAmount = entryData.totalAmount !== undefined && !isNaN(Number(entryData.totalAmount))
    ? Number(entryData.totalAmount)
    : (isTon ? (qty * rate) : (labourCount * rate));

  const newEntry = {
    ...entryData,
    workId,
    timestamp,
    labourCount,
    rate,
    totalAmount,
    workRemark: entryData.workRemark || '',
    status: 'Pending Verification',
    verificationPlanned: null,
    verificationActual: null,
    verificationDelay: '-',
    approvalPlanned: null,
    approvalActual: null,
    approvalDelay: '-',
    paymentPlanned: null,
    paymentActual: null,
    paymentDelay: '-',
    paymentMethod: '',
    paymentRef: '',
    tallyPlanned: null,
    tallyActual: null,
    tallyDelay: '-',
    tallyVoucher: '',
    tallyLedger: ''
  };

  entries.unshift(newEntry);
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));

  // Sync to Google Sheets in background without blocking UI
  sendToAppsScript('submitLaborPayment', newEntry).catch(err => {
    console.warn('Background sync to Google Sheets failed:', err);
  });

  return newEntry;
}

function getStoredEntries() {
  const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  return raw ? filterValidEntries(JSON.parse(raw)) : [];
}

/**
 * Stage 1 Action: Mark Verified (Sets status to 'Verified')
 */
export async function submitVerification(workId, remarks = '') {
  const entries = getStoredEntries();
  const now = getNowTimestamp();

  const updatedEntries = entries.map(item => {
    if (item.workId === workId) {
      const delayInfo = calculateWorkflowDelay(item.verificationPlanned, now);
      return {
        ...item,
        status: 'Verified (Pending Approval)',
        verificationActual: now,
        verificationDelay: delayInfo.formatted,
        verificationRemarks: remarks,
        approvalPlanned: now
      };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  // Send in background
  sendToAppsScript('verifyWork', { workId, remarks }).catch(err => console.warn('Verification sync failed:', err));

  return updatedEntries.find(i => i.workId === workId);
}

/**
 * Stage 2 Action: Approve Payment (Sets status to 'Approved')
 */
export async function submitApproval(workId) {
  const entries = getStoredEntries();
  const now = getNowTimestamp();

  const updatedEntries = entries.map(item => {
    if (item.workId === workId) {
      const delayInfo = calculateWorkflowDelay(item.approvalPlanned, now);
      return {
        ...item,
        status: 'Approved (Pending Payment)',
        approvalActual: now,
        approvalDelay: delayInfo.formatted,
        paymentPlanned: now
      };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  // Send in background
  sendToAppsScript('approvePayment', { workId }).catch(err => console.warn('Approval sync failed:', err));

  return updatedEntries.find(i => i.workId === workId);
}

/**
 * Stage 3 Action: Disburse Payment (Sets status to 'Paid')
 */
export async function submitPayment(workId, paymentMethod, paymentRef) {
  const entries = getStoredEntries();
  const now = getNowTimestamp();

  const updatedEntries = entries.map(item => {
    if (item.workId === workId) {
      const delayInfo = calculateWorkflowDelay(item.paymentPlanned, now);
      return {
        ...item,
        status: 'Paid (Pending Tally)',
        paymentActual: now,
        paymentDelay: delayInfo.formatted,
        paymentMethod: paymentMethod || 'Bank Transfer (NEFT/RTGS)',
        paymentRef: paymentRef || '',
        tallyPlanned: now
      };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  // Send in background
  sendToAppsScript('recordPayment', { workId, paymentMethod, paymentRef }).catch(err => console.warn('Payment sync failed:', err));

  return updatedEntries.find(i => i.workId === workId);
}

/**
 * Stage 4 Action: Record Tally Voucher (Sets status to 'Tally Complete')
 */
export async function submitTally(workId, tallyVoucher, tallyLedger) {
  const entries = getStoredEntries();
  const now = getNowTimestamp();

  const updatedEntries = entries.map(item => {
    if (item.workId === workId) {
      const delayInfo = calculateWorkflowDelay(item.tallyPlanned, now);
      return {
        ...item,
        status: 'Tally Complete',
        tallyActual: now,
        tallyDelay: delayInfo.formatted,
        tallyVoucher: tallyVoucher || '',
        tallyLedger: tallyLedger || 'Direct Labour Charges'
      };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  // Send in background
  sendToAppsScript('recordTally', { workId, tallyVoucher, tallyLedger }).catch(err => console.warn('Tally sync failed:', err));

  return updatedEntries.find(i => i.workId === workId);
}

/**
 * Update Work Remark for an entry
 */
export async function updateWorkRemark(workId, workRemark) {
  const entries = getStoredEntries();
  const updatedEntries = entries.map(item => {
    if (item.workId === workId) {
      return {
        ...item,
        workRemark: workRemark || ''
      };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  sendToAppsScript('updateWorkRemark', { workId, workRemark }).catch(err => console.warn('Work Remark sync failed:', err));

  return updatedEntries.find(i => i.workId === workId);
}

/**
 * Reset all local storage to initial mock state
 */
export function resetToDemoData() {
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(INITIAL_ENTRIES));
  localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(INITIAL_MASTER_DATA));
  return {
    entries: INITIAL_ENTRIES,
    master: INITIAL_MASTER_DATA
  };
}
