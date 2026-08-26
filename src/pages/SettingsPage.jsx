import React, { useState } from 'react';
import {
  Settings,
  Database,
  Link2,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Code2,
  Table,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { testGoogleSheetsConnection } from '../services/api';

const GS_CODE = `/**
 * =========================================================================
 * Labour Payment & Workflow Tracking System - Google Apps Script Backend
 * =========================================================================
 * 
 * Header & Data Rows Configuration:
 * - Row 6: Header Row
 * - Row 7 onwards: Data Rows
 * 
 * Column Mapping (Row 6 Headers):
 * - Col A to J (1-10) : Timestamp, Work ID, Date, Shift, Incharge, Work, No of Labour, Hours, Qty, Amount
 * - Col K (11)        : Status ('Pending Verification', 'Verified', 'Approved', 'Paid', 'Tally Complete')
 * - Col L (12)        : Planned Timestamp (Stage 1 Planned)
 * - Col M (13)        : Actual Timestamp (Stage 1 Actual)
 * - Col N (14)        : Delay (Stage 1 Delay)
 * - Col O (15)        : Planned 2
 * - Col P (16)        : Actual 2
 * - Col Q (17)        : Delay 2
 * - Col R (18)        : Planned 3
 * - Col S (19)        : Actual 3
 * - Col T (20)        : Delay 3
 * - Col U (21)        : Planned 4
 * - Col V (22)        : Actual 4
 * - Col W (23)        : Delay 4
 */

const SHEET_NAMES = {
  ENTRY: 'Entry',
  FMS: 'FMS',
  WORKFLOW: 'Workflow',
  MASTER: 'Master'
};

const HEADER_ROW = 6;
const DATA_START_ROW = 7;

function getFormattedSheetTimestamp(date) {
  const d = date ? new Date(date) : new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  try {
    return Utilities.formatDate(d, tz, 'M/d/yyyy H:mm:ss');
  } catch (e) {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let result = {};
    switch (action) {
      case 'getMasterData':
      case 'getDropdownData':
        result = getMasterData(ss);
        break;
      case 'getEntries':
        result = { entries: getEntriesData(ss) };
        break;
      case 'getAllData':
        result = {
          master: getMasterData(ss),
          entries: getEntriesData(ss),
          status: 'success'
        };
        break;
      default:
        result = { message: 'Ready', status: 'success' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const action = payload.action || (e && e.parameter && e.parameter.action);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let response = {};
    switch (action) {
      case 'submitLaborPayment':
      case 'createEntry':
        response = handleCreateEntry(ss, payload.data);
        break;
      case 'verifyWork':
        response = handleVerifyWork(ss, payload.data);
        break;
      case 'approvePayment':
        response = handleApprovePayment(ss, payload.data);
        break;
      case 'recordPayment':
        response = handleRecordPayment(ss, payload.data);
        break;
      case 'recordTally':
        response = handleRecordTally(ss, payload.data);
        break;
      case 'updateMasterData':
        response = handleUpdateMasterData(ss, payload.data);
        break;
      default:
        response = { error: 'Unknown action: ' + action, status: 'error' };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findColIndex(sheet, possibleNames, defaultIndex) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return defaultIndex;

  if (sheet.getLastRow() >= HEADER_ROW) {
    const row6Headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
    for (let c = 0; c < row6Headers.length; c++) {
      const val = String(row6Headers[c] || '').toLowerCase().trim();
      for (let n = 0; n < possibleNames.length; n++) {
        const target = possibleNames[n].toLowerCase().trim();
        if (val === target || (target.length > 3 && val.includes(target))) {
          return c + 1;
        }
      }
    }
  }

  const numRowsToCheck = Math.min(sheet.getLastRow(), HEADER_ROW);
  if (numRowsToCheck >= 1) {
    const headerRows = sheet.getRange(1, 1, numRowsToCheck, lastCol).getValues();
    for (let r = 0; r < headerRows.length; r++) {
      for (let c = 0; c < headerRows[r].length; c++) {
        const val = String(headerRows[r][c] || '').toLowerCase().trim();
        for (let n = 0; n < possibleNames.length; n++) {
          const target = possibleNames[n].toLowerCase().trim();
          if (val === target || (target.length > 3 && val.includes(target))) {
            return c + 1;
          }
        }
      }
    }
  }

  return defaultIndex;
}

function ensureLabourColumns(entrySheet, requiredLabourCount) {
  const lastCol = entrySheet.getLastColumn();
  if (lastCol < 1 || entrySheet.getLastRow() < HEADER_ROW) return requiredLabourCount;

  const headerValues = entrySheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
  let existingLabourColCount = 0;
  for (let i = 0; i < headerValues.length; i++) {
    if (String(headerValues[i]).toLowerCase().startsWith('labour ')) {
      existingLabourColCount++;
    }
  }
  if (requiredLabourCount > existingLabourColCount) {
    const diff = requiredLabourCount - existingLabourColCount;
    for (let i = 1; i <= diff; i++) {
      const newIndex = existingLabourColCount + i;
      const colToInsert = lastCol + i;
      entrySheet.getRange(HEADER_ROW, colToInsert).setValue('Labour ' + newIndex);
      entrySheet.getRange(HEADER_ROW, colToInsert).setBackground('#059669').setFontColor('#FFFFFF').setFontWeight('bold');
    }
    SpreadsheetApp.flush();
    return requiredLabourCount;
  }
  return existingLabourColCount;
}

function generateNextWorkId(ss) {
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const sheetToCheck = fmsSheet || entrySheet;

  if (!sheetToCheck || sheetToCheck.getLastRow() < DATA_START_ROW) return 'WRK-0001';

  const lastRow = sheetToCheck.getLastRow();
  const numDataRows = lastRow - (DATA_START_ROW - 1);
  if (numDataRows <= 0) return 'WRK-0001';

  const workIds = sheetToCheck.getRange(DATA_START_ROW, 2, numDataRows, 1).getValues();
  let maxNum = 0;
  for (let i = 0; i < workIds.length; i++) {
    const id = String(workIds[i][0] || '').trim();
    if (id.startsWith('WRK-')) {
      const num = parseInt(id.replace('WRK-', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return 'WRK-' + String(maxNum + 1).padStart(4, '0');
}

function isValidWorkRow(row) {
  if (!row || row.length === 0) return false;
  const workId = String(row[1] || row[0] || '').trim().toLowerCase();
  if (!workId) return false;
  const invalidKeywords = ['what', 'who', 'when', 'where', 'why', 'how', 'work id', 'workid', 'timestamp', 'date', 'shift', 'incharge', 'work', 'status', 'total', 'grand total', 'planned', 'actual', 'delay'];
  if (invalidKeywords.includes(workId)) return false;
  const planDate = String(row[11] || '').trim().toLowerCase();
  if (invalidKeywords.includes(planDate)) return false;
  return true;
}

function handleCreateEntry(ss, data) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const timestamp = getFormattedSheetTimestamp();
  const workId = data.workId || generateNextWorkId(ss);
  const labourCount = Number(data.labourCount) || 0;
  const rate = Number(data.rate) || 0;
  const totalAmount = labourCount * rate;
  const status = 'Pending Verification';
  const labourNames = data.labourNames || [];

  if (entrySheet) {
    ensureLabourColumns(entrySheet, labourNames.length);
    const entryRow = [timestamp, workId, data.date || '', data.shift || '', data.incharge || '', data.work || '', labourCount, Number(data.hours) || 0, Number(data.qty) || 0, rate, totalAmount, status];
    for (let i = 0; i < labourNames.length; i++) entryRow.push(labourNames[i]);
    entrySheet.appendRow(entryRow);
  }

  if (fmsSheet) {
    const fmsRow = [
      timestamp, workId, data.date || '', data.shift || '', data.incharge || '', data.work || '',
      labourCount, Number(data.hours) || 0, Number(data.qty) || 0, totalAmount,
      status, timestamp, '', '', '', '', '', '', '', '', '', '', ''
    ];
    fmsSheet.appendRow(fmsRow);
  }

  return { status: 'success', workId: workId, timestamp: timestamp };
}

function handleVerifyWork(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Verified';
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= DATA_START_ROW) {
    const actualCol = findColIndex(fmsSheet, ['actual timestamp', 'actual 1', 'verification actual'], 13);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
    const dataRange = fmsSheet.getDataRange().getValues();
    for (let i = DATA_START_ROW - 1; i < dataRange.length; i++) {
      if (dataRange[i][1] === workId || dataRange[i][0] === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        break;
      }
    }
  }
  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate };
}

function handleApprovePayment(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Approved';
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= DATA_START_ROW) {
    const actualCol = findColIndex(fmsSheet, ['actual 2', 'actual approval', 'payment approval actual'], 16);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
    const dataRange = fmsSheet.getDataRange().getValues();
    for (let i = DATA_START_ROW - 1; i < dataRange.length; i++) {
      if (dataRange[i][1] === workId || dataRange[i][0] === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        break;
      }
    }
  }
  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate };
}

function handleRecordPayment(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Paid';
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= DATA_START_ROW) {
    const actualCol = findColIndex(fmsSheet, ['actual 3', 'actual payment', 'payment actual'], 19);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
    const dataRange = fmsSheet.getDataRange().getValues();
    for (let i = DATA_START_ROW - 1; i < dataRange.length; i++) {
      if (dataRange[i][1] === workId || dataRange[i][0] === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        break;
      }
    }
  }
  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate };
}

function handleRecordTally(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Tally Complete';
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= DATA_START_ROW) {
    const actualCol = findColIndex(fmsSheet, ['actual 4', 'actual tally', 'tally actual'], 22);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
    const dataRange = fmsSheet.getDataRange().getValues();
    for (let i = DATA_START_ROW - 1; i < dataRange.length; i++) {
      if (dataRange[i][1] === workId || dataRange[i][0] === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        break;
      }
    }
  }
  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate };
}

function updateEntryStatus(ss, workId, status) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  if (!entrySheet || entrySheet.getLastRow() < DATA_START_ROW) return;
  const dataRange = entrySheet.getDataRange().getValues();
  for (let i = DATA_START_ROW - 1; i < dataRange.length; i++) {
    if (dataRange[i][1] === workId) {
      entrySheet.getRange(i + 1, 12).setValue(status);
      break;
    }
  }
}

function getMasterData(ss) {
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!masterSheet || masterSheet.getLastRow() < 1) return { incharges: [], labourers: [], shifts: [], workTypes: [] };
  const values = masterSheet.getDataRange().getValues();
  const incharges = [];
  const labourers = [];
  const shifts = [];
  const workTypes = [];
  let startRow = 0;
  let inchargeCol = 0, labourCol = 1, shiftCol = 2, workCol = 3, rateCol = 4;
  for (let r = 0; r < Math.min(values.length, 6); r++) {
    const rowStr = values[r].join(' ').toLowerCase();
    if (rowStr.includes('incharge') || rowStr.includes('labour') || rowStr.includes('shift') || rowStr.includes('work')) {
      startRow = r + 1;
      for (let c = 0; c < values[r].length; c++) {
        const header = String(values[r][c] || '').toLowerCase().trim();
        if (header.includes('incharge')) inchargeCol = c;
        else if (header.includes('labour')) labourCol = c;
        else if (header.includes('shift')) shiftCol = c;
        else if (header.includes('work') || header.includes('type') || header.includes('activity')) workCol = c;
        else if (header.includes('rate') || header.includes('amount')) rateCol = c;
      }
      break;
    }
  }
  for (let i = startRow; i < values.length; i++) {
    const row = values[i];
    if (row[inchargeCol] && String(row[inchargeCol]).trim()) incharges.push(String(row[inchargeCol]).trim());
    if (row[labourCol] && String(row[labourCol]).trim()) labourers.push(String(row[labourCol]).trim());
    if (row[shiftCol] && String(row[shiftCol]).trim()) shifts.push(String(row[shiftCol]).trim());
    if (row[workCol] && String(row[workCol]).trim()) {
      workTypes.push({ name: String(row[workCol]).trim(), defaultRate: Number(row[rateCol]) || 450 });
    }
  }
  const defaultShifts = ['Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'];
  const defaultWorkTypes = [
    { name: 'Production', defaultRate: 450 },
    { name: 'Loading', defaultRate: 480 },
    { name: 'Daily Wags', defaultRate: 400 },
    { name: 'Grinding', defaultRate: 500 },
    { name: 'Housekeeping', defaultRate: 380 },
    { name: 'Mechanical', defaultRate: 550 },
    { name: 'Crusing', defaultRate: 460 },
    { name: 'Unloading', defaultRate: 450 }
  ];
  return {
    incharges,
    labourers,
    shifts: shifts.length > 0 ? shifts : defaultShifts,
    workTypes: workTypes.length > 0 ? workTypes : defaultWorkTypes
  };
}

function getEntriesData(ss) {
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const mainSheet = fmsSheet || entrySheet;
  if (!mainSheet || mainSheet.getLastRow() < DATA_START_ROW) return [];

  const labourMap = {};
  if (entrySheet && entrySheet.getLastRow() >= DATA_START_ROW) {
    const entryData = entrySheet.getDataRange().getValues();
    for (let i = DATA_START_ROW - 1; i < entryData.length; i++) {
      const row = entryData[i];
      const wId = row[1];
      if (!wId || !isValidWorkRow(row)) continue;
      const names = [];
      for (let c = 12; c < row.length; c++) {
        if (row[c] && String(row[c]).trim()) names.push(String(row[c]).trim());
      }
      labourMap[wId] = names;
    }
  }

  const fmsData = mainSheet.getDataRange().getValues();
  const statusCol = findColIndex(mainSheet, ['status', 'current status'], 11) - 1;
  const p1Col = findColIndex(mainSheet, ['planned timestamp', 'planned 1'], 12) - 1;
  const a1Col = findColIndex(mainSheet, ['actual timestamp', 'actual 1'], 13) - 1;
  const d1Col = findColIndex(mainSheet, ['delay', 'delay 1'], 14) - 1;
  const p2Col = findColIndex(mainSheet, ['planned 2'], 15) - 1;
  const a2Col = findColIndex(mainSheet, ['actual 2'], 16) - 1;
  const d2Col = findColIndex(mainSheet, ['delay 2'], 17) - 1;
  const p3Col = findColIndex(mainSheet, ['planned 3'], 18) - 1;
  const a3Col = findColIndex(mainSheet, ['actual 3'], 19) - 1;
  const d3Col = findColIndex(mainSheet, ['delay 3'], 20) - 1;
  const p4Col = findColIndex(mainSheet, ['planned 4'], 21) - 1;
  const a4Col = findColIndex(mainSheet, ['actual 4'], 22) - 1;
  const d4Col = findColIndex(mainSheet, ['delay 4'], 23) - 1;

  const entries = [];
  for (let i = DATA_START_ROW - 1; i < fmsData.length; i++) {
    const row = fmsData[i];
    if (!isValidWorkRow(row)) continue;

    const workId = row[1] || row[0];

    const verificationPlanned = row[p1Col] || row[0];
    const verificationActual = row[a1Col] || null;
    const verificationDelay = row[d1Col] || '-';
    const approvalPlanned = row[p2Col] || verificationActual;
    const approvalActual = row[a2Col] || null;
    const approvalDelay = row[d2Col] || '-';
    const paymentPlanned = row[p3Col] || approvalActual;
    const paymentActual = row[a3Col] || null;
    const paymentDelay = row[d3Col] || '-';
    const tallyPlanned = row[p4Col] || paymentActual;
    const tallyActual = row[a4Col] || null;
    const tallyDelay = row[d4Col] || '-';

    let currentStatus = (row[statusCol] && String(row[statusCol]).trim()) || '';
    if (!currentStatus) {
      if (tallyActual) currentStatus = 'Tally Complete';
      else if (paymentActual) currentStatus = 'Paid';
      else if (approvalActual) currentStatus = 'Approved';
      else if (verificationActual) currentStatus = 'Verified';
      else currentStatus = 'Pending Verification';
    }

    entries.push({
      timestamp: row[0],
      workId: workId,
      date: row[2],
      shift: row[3],
      incharge: row[4],
      work: row[5],
      labourCount: Number(row[6]) || 0,
      hours: Number(row[7]) || 0,
      qty: Number(row[8]) || 0,
      totalAmount: Number(row[9]) || 0,
      rate: Number(row[6]) ? (Number(row[9]) / Number(row[6])) : 0,
      status: currentStatus,
      labourNames: labourMap[workId] || [],
      verificationPlanned: verificationPlanned,
      verificationActual: verificationActual,
      verificationDelay: verificationDelay,
      approvalPlanned: approvalPlanned,
      approvalActual: approvalActual,
      approvalDelay: approvalDelay,
      paymentPlanned: paymentPlanned,
      paymentActual: paymentActual,
      paymentDelay: paymentDelay,
      tallyPlanned: tallyPlanned,
      tallyActual: tallyActual,
      tallyDelay: tallyDelay
    });
  }
  return entries;
}

function handleUpdateMasterData(ss, data) {
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!masterSheet) return { status: 'error', message: 'Master sheet not found' };
  masterSheet.clearContents();
  masterSheet.appendRow(['Incharge Names', 'Labour Names', 'Shifts', 'Work Types', 'Default Rates']);
  const { incharges = [], labourers = [], shifts = [], workTypes = [] } = data;
  const maxLen = Math.max(incharges.length, labourers.length, shifts.length, workTypes.length);
  for (let i = 0; i < maxLen; i++) {
    masterSheet.appendRow([
      incharges[i] || '',
      labourers[i] || '',
      shifts[i] || '',
      workTypes[i] ? (typeof workTypes[i] === 'string' ? workTypes[i] : workTypes[i].name) : '',
      workTypes[i] ? (typeof workTypes[i] === 'object' ? workTypes[i].defaultRate : '') : ''
    ]);
  }
  return { status: 'success' };
}`;

export function SettingsPage() {
  const { scriptUrl, updateScriptUrl, resetDemo, showToast } = useApp();
  const [inputUrl, setInputUrl] = useState(scriptUrl);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = e => {
    e.preventDefault();
    updateScriptUrl(inputUrl);
  };

  const handleTestConnection = async () => {
    if (!inputUrl) {
      showToast('Please enter a Web App URL first', 'error');
      return;
    }
    setTesting(true);
    try {
      await testGoogleSheetsConnection(inputUrl);
      showToast('Successfully connected to Google Apps Script Web App!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GS_CODE);
    setCopied(true);
    showToast('Code.gs copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
          Google Sheets Integration & Deployment
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
          Connect your Google Sheet backend via Apps Script Web App or test in local mock storage mode.
        </p>
      </div>

      {/* Connection Config Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon">
              <Link2 size={18} />
            </div>
            <span>Google Apps Script Web App Endpoint</span>
          </div>

          <div className={`sync-indicator ${scriptUrl ? 'connected' : 'demo'}`}>
            <span className="sync-dot"></span>
            <span>{scriptUrl ? 'Live Google Sheets Connected' : 'Local Storage Mode (Offline Active)'}</span>
          </div>
        </div>

        <form onSubmit={handleSaveUrl}>
          <div className="form-group">
            <label className="form-label">
              Apps Script Executable URL (Ending in <code>/exec</code>)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="url"
                className="form-input"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Save URL
              </button>
            </div>
            <div className="form-helper">
              Leave blank to run in instant demo mode with preloaded sample data.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !inputUrl}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'Testing Endpoint...' : 'Test Connection'}</span>
            </button>

            {scriptUrl && (
              <button
                type="button"
                onClick={() => { setInputUrl(''); updateScriptUrl(''); }}
                className="btn btn-outline-green btn-sm"
              >
                Disconnect & Use Local Mode
              </button>
            )}

            <button
              type="button"
              onClick={resetDemo}
              className="btn btn-secondary btn-sm"
            >
              Reset Sample Demo Data
            </button>
          </div>
        </form>
      </div>

      {/* Deployment Instructions & Code.gs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Code2 size={18} />
            </div>
            <span>Google Apps Script Backend Code (`Code.gs`)</span>
          </div>

          <button onClick={handleCopyCode} className="btn btn-primary btn-sm">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Copied!' : 'Copy Code.gs'}</span>
          </button>
        </div>

        {/* 4 Step Setup Guide */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 8, fontSize: '0.95rem' }}>
            4-Step Google Sheets Setup Guide:
          </div>
          <ol style={{ fontSize: '0.85rem', color: '#1E293B', paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Create a new blank sheet in <strong>Google Sheets</strong>.</li>
            <li>Go to <strong>Extensions &gt; Apps Script</strong> and replace the code with the script below.</li>
            <li>Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong>.</li>
            <li>Configure: <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong> &gt; Click <strong>Deploy</strong>.</li>
            <li>Copy the Web App URL and paste it into the input above! The script will automatically create the <strong>Entry</strong>, <strong>FMS</strong>, <strong>Workflow</strong>, and <strong>Master</strong> sheets.</li>
          </ol>
        </div>

        {/* Code Preview */}
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#0F172A',
            color: '#E2E8F0',
            padding: '20px',
            borderRadius: 10,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            maxHeight: 380,
            overflowY: 'auto',
            lineHeight: 1.5
          }}>
            <code>{GS_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
