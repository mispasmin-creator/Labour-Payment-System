/**
 * API Service Layer for Labour Payment & Workflow Tracking System
 * Handles communication with Google Apps Script Web App with offline LocalStorage fallback.
 */

import { INITIAL_ENTRIES, INITIAL_MASTER_DATA } from '../utils/mockData';
import { calculateWorkflowDelay, getNowTimestamp } from '../utils/dateUtils';

const STORAGE_KEYS = {
  SCRIPT_URL: 'labour_sys_script_url',
  ENTRIES: 'labour_sys_entries',
  MASTER: 'labour_sys_master',
  ROLE: 'labour_sys_current_role'
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

  return true;
}

export function cleanTimestamp(val) {
  if (!val || val === 'null' || val === 'undefined' || val === '-') return null;
  return String(val).trim();
}

export function normalizeStatus(status, entry = {}) {
  const s = String(status || '').toLowerCase().trim();
  const vActual = cleanTimestamp(entry.verificationActual);
  const aActual = cleanTimestamp(entry.approvalActual);
  const pActual = cleanTimestamp(entry.paymentActual);
  const tActual = cleanTimestamp(entry.tallyActual);

  if (s.includes('tally') || tActual) return 'Tally Complete';
  if (s === 'paid' || s.includes('pending tally') || pActual) return 'Paid (Pending Tally)';
  if (s === 'approved' || s.includes('pending payment') || aActual) return 'Approved (Pending Payment)';
  if (s === 'verified' || s.includes('pending approval') || vActual) return 'Verified (Pending Approval)';
  return 'Pending Verification';
}

export function filterValidEntries(list) {
  if (!Array.isArray(list)) return [];
  const defaultFirms = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];
  return list.filter(isValidEntry).map((e, idx) => {
    let firmName = String(e.firmName || e.firm || '').trim();
    if (!firmName || firmName === '-' || firmName.toLowerCase().startsWith('firm ')) {
      firmName = defaultFirms[idx % defaultFirms.length];
    }
    return {
      ...e,
      firmName,
      verificationActual: cleanTimestamp(e.verificationActual),
      approvalActual: cleanTimestamp(e.approvalActual),
      paymentActual: cleanTimestamp(e.paymentActual),
      tallyActual: cleanTimestamp(e.tallyActual),
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
 * Fetch Full Master Data from Google Sheets
 */
export async function fetchMasterData() {
  const url = getScriptUrl();

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const response = await fetch(`${url}${sep}action=getMasterData`);
      if (response.ok) {
        const json = await response.json();
        if (json && (json.incharges || json.labourers)) {
          // Sanitize workTypes so Shift 1..4 is not mistaken for work type
          const validWorkTypes = (json.workTypes || []).filter(
            w => !(typeof w === 'string' ? w : w.name).toLowerCase().startsWith('shift')
          );

          const sanitized = {
            incharges: json.incharges && json.incharges.length > 0 ? json.incharges : INITIAL_MASTER_DATA.incharges,
            labourers: json.labourers && json.labourers.length > 0 ? json.labourers : INITIAL_MASTER_DATA.labourers,
            shifts: (json.shifts && json.shifts.length > 0) ? json.shifts : INITIAL_MASTER_DATA.shifts,
            workTypes: validWorkTypes.length > 0 ? validWorkTypes : INITIAL_MASTER_DATA.workTypes,
            firmNames: (json.firmNames && json.firmNames.length > 0) ? json.firmNames : INITIAL_MASTER_DATA.firmNames
          };

          localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(sanitized));
          return sanitized;
        }
      }
    } catch (e) {
      console.warn('Google Sheets API unavailable, using local cache:', e);
    }
  }

  // Fallback to local storage
  initLocalStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.MASTER);
  const parsed = raw ? JSON.parse(raw) : INITIAL_MASTER_DATA;
  return {
    incharges: parsed.incharges && parsed.incharges.length > 0 ? parsed.incharges : INITIAL_MASTER_DATA.incharges,
    labourers: parsed.labourers && parsed.labourers.length > 0 ? parsed.labourers : INITIAL_MASTER_DATA.labourers,
    shifts: parsed.shifts && parsed.shifts.length > 0 ? parsed.shifts : INITIAL_MASTER_DATA.shifts,
    workTypes: (parsed.workTypes && parsed.workTypes.filter(w => !(typeof w === 'string' ? w : w.name).toLowerCase().startsWith('shift')).length > 0)
      ? parsed.workTypes.filter(w => !(typeof w === 'string' ? w : w.name).toLowerCase().startsWith('shift'))
      : INITIAL_MASTER_DATA.workTypes,
    firmNames: parsed.firmNames && parsed.firmNames.length > 0 ? parsed.firmNames : INITIAL_MASTER_DATA.firmNames
  };
}

/**
 * Robust Sync Helper with POST for Google Apps Script Web App
 */
export async function sendToAppsScript(action, data) {
  const url = getScriptUrl();
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, data })
    });
    return res.ok;
  } catch (postErr) {
    console.warn('Google Sheets POST sync error:', postErr);
    return false;
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
 * Fetch All Entries with 4-Stage Workflow state & smart reconciliation
 */
export async function fetchEntries() {
  const url = getScriptUrl();

  const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ENTRIES) : null;
  const localEntries = rawLocal ? filterValidEntries(JSON.parse(rawLocal)) : [];

  if (url) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const response = await fetch(`${url}${sep}action=getEntries`, { redirect: 'follow' });
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

          const STAGE_RANKS = {
            'Pending Verification': 1,
            'Verified (Pending Approval)': 2,
            'Approved (Pending Payment)': 3,
            'Paid (Pending Tally)': 4,
            'Tally Complete': 5
          };

          // Reconcile ONLY entries that actively exist in Google Sheet
          const merged = remoteCleaned.map(remote => {
            const local = localEntries.find(l => l.workId === remote.workId);
            if (!local) return remote;

            const rRank = STAGE_RANKS[remote.status] || 1;
            const lRank = STAGE_RANKS[local.status] || 1;

            if (lRank > rRank) {
              return {
                ...remote,
                status: local.status,
                verificationActual: local.verificationActual || remote.verificationActual,
                approvalActual: local.approvalActual || remote.approvalActual,
                paymentActual: local.paymentActual || remote.paymentActual,
                tallyActual: local.tallyActual || remote.tallyActual,
                paymentMethod: local.paymentMethod || remote.paymentMethod,
                paymentRef: local.paymentRef || remote.paymentRef,
                tallyVoucher: local.tallyVoucher || remote.tallyVoucher,
                tallyLedger: local.tallyLedger || remote.tallyLedger,
                labourNames: (local.labourNames && local.labourNames.length > 0) ? local.labourNames : (remote.labourNames || []),
                firmName: local.firmName || remote.firmName || ''
              };
            }

            return {
              ...remote,
              labourNames: (remote.labourNames && remote.labourNames.length > 0) ? remote.labourNames : (local.labourNames || []),
              firmName: remote.firmName || local.firmName || ''
            };
          });

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
  const totalAmount = labourCount * rate;

  const newEntry = {
    ...entryData,
    workId,
    timestamp,
    labourCount,
    rate,
    totalAmount,
    status: 'Pending Verification',
    verificationPlanned: timestamp,
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

  const url = getScriptUrl();
  await sendToAppsScript('submitLaborPayment', newEntry);
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
