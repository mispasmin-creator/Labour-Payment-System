/**
 * =========================================================================
 * Labour Payment & Workflow Tracking System - Google Apps Script Backend
 * =========================================================================
 * 
 * Header-Name Matched & Fully Resilient Dynamic Version
 * 
 * Exact Entry Sheet Headers:
 * Col A (1)  : Timestamp
 * Col B (2)  : Work ID
 * Col C (3)  : Date
 * Col D (4)  : Firm
 * Col E (5)  : Shift
 * Col F (6)  : Incharge
 * Col G (7)  : Work
 * Col H (8)  : Labour (Count)
 * Col I (9)  : Hours
 * Col J (10) : Qty
 * Col K (11) : Amount per person
 * Col L (12) : Total Amount
 * Col M (13) : Status
 * Col N (14) : Work Remark
 * Col O to Y (15-25): Labour 1, Labour 2, ... Labour 11 (Auto-extends for 12, 13, etc.)
 * 
 * Exact FMS Sheet Headers (Row 6):
 * Col A (1)  : Timestamp
 * Col B (2)  : Work ID
 * Col C (3)  : Date
 * Col D (4)  : Firm
 * Col E (5)  : Shift
 * Col F (6)  : Incharge
 * Col G (7)  : Work
 * Col H (8)  : No of Labour
 * Col I (9)  : Hours
 * Col J (10) : Qty
 * Col K (11) : Amount
 * Col L (12) : Status
 * Col M (13) : Work Remark
 * Col N (14) : Planned Timestamp
 * Col O (15) : Actual Timestamp
 * Col P (16) : Delay
 * Col Q (17) : Planned 2
 * Col R (18) : Actual 2
 * Col S (19) : Delay 2
 * Col T (20) : Planned 3
 * Col U (21) : Actual 3
 * Col V (22) : Delay 3
 * Col W (23) : Planned 4
 * Col X (24) : Actual 4
 * Col Y (25) : Delay 4
 */

const SHEET_NAMES = {
  ENTRY: 'Entry',
  FMS: 'FMS',
  WORKFLOW: 'Workflow',
  MASTER: 'Master'
};

const STANDARD_ENTRY_HEADERS = [
  'Timestamp',
  'Work ID',
  'Date',
  'Firm',
  'Shift',
  'Incharge',
  'Work',
  'Labour (Count)',
  'Hours',
  'Qty',
  'Amount per person',
  'Total Amount',
  'Status',
  'Work Remark',
  'Labour 1',
  'Labour 2',
  'Labour 3',
  'Labour 4',
  'Labour 5',
  'Labour 6',
  'Labour 7',
  'Labour 8',
  'Labour 9',
  'Labour 10',
  'Labour 11'
];

const STANDARD_FMS_HEADERS = [
  'Timestamp',
  'Work ID',
  'Date',
  'Firm',
  'Shift',
  'Incharge',
  'Work',
  'No of Labour',
  'Hours',
  'Qty',
  'Amount',
  'Status',
  'Work Remark',
  'Planned Timestamp',
  'Actual Timestamp',
  'Delay',
  'Planned 2',
  'Actual 2',
  'Delay 2',
  'Planned 3',
  'Actual 3',
  'Delay 3',
  'Planned 4',
  'Actual 4',
  'Delay 4'
];

/**
 * Format timestamp as "9/9/2026 15:30:00"
 */
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
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Handle HTTP GET Requests (Fetch data & GET fallbacks)
 */
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

      case 'init':
        ensureAllSheetsAndHeaders(ss);
        result = { message: 'Sheets auto-configured and ready', status: 'success' };
        break;

      case 'submitLaborPayment':
      case 'createEntry': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleCreateEntry(ss, payloadData);
        break;
      }

      case 'verifyWork': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleVerifyWork(ss, payloadData);
        break;
      }

      case 'approvePayment': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleApprovePayment(ss, payloadData);
        break;
      }

      case 'recordPayment': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleRecordPayment(ss, payloadData);
        break;
      }

      case 'recordTally': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleRecordTally(ss, payloadData);
        break;
      }

      case 'updateMasterData': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleUpdateMasterData(ss, payloadData);
        break;
      }

      case 'updateWorkRemark': {
        const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
        result = handleUpdateWorkRemark(ss, payloadData);
        break;
      }

      default:
        result = { error: 'Unknown GET action: ' + action, status: 'error' };
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

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = {};
      }
    }

    const action = payload.action || (e && e.parameter && e.parameter.action);
    const data = payload.data || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let response = {};

    switch (action) {
      case 'submitLaborPayment':
      case 'createEntry':
        response = handleCreateEntry(ss, data);
        break;

      case 'verifyWork':
        response = handleVerifyWork(ss, data);
        break;

      case 'approvePayment':
        response = handleApprovePayment(ss, data);
        break;

      case 'recordPayment':
        response = handleRecordPayment(ss, data);
        break;

      case 'recordTally':
        response = handleRecordTally(ss, data);
        break;

      case 'updateMasterData':
        response = handleUpdateMasterData(ss, data);
        break;

      case 'updateWorkRemark':
        response = handleUpdateWorkRemark(ss, data);
        break;

      case 'init':
        ensureAllSheetsAndHeaders(ss);
        response = { message: 'Sheets auto-configured and ready', status: 'success' };
        break;

      default:
        response = { error: 'Unknown POST action: ' + action, status: 'error' };
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

/**
 * Auto-detect Header Row (Checks Rows 1 to 10 for keywords)
 */
function getHeaderRowIndex(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return 1;
  const numRows = Math.min(sheet.getLastRow(), 10);
  const data = sheet.getRange(1, 1, numRows, Math.min(sheet.getLastColumn() || 1, 30)).getValues();
  for (let r = 0; r < data.length; r++) {
    const rowStr = data[r].map(v => String(v || '').toLowerCase().trim()).join(' ');
    if (rowStr.includes('work id') || rowStr.includes('workid') || (rowStr.includes('timestamp') && (rowStr.includes('date') || rowStr.includes('shift') || rowStr.includes('status')))) {
      return r + 1; // 1-indexed
    }
  }
  return 1;
}

/**
 * Ensure Entry Sheet has the EXACT 25 Headers on Row 1 (Auto-Fixing)
 */
function ensureEntryHeader(entrySheet) {
  if (!entrySheet) return;
  const headerRow = getHeaderRowIndex(entrySheet);

  if (entrySheet.getLastRow() < 1) {
    entrySheet.getRange(1, 1, 1, STANDARD_ENTRY_HEADERS.length).setValues([STANDARD_ENTRY_HEADERS]);
    entrySheet.getRange(1, 1, 1, STANDARD_ENTRY_HEADERS.length).setFontWeight('bold').setBackground('#D9EAD3');
    SpreadsheetApp.flush();
    return;
  }

  const existingHeaders = entrySheet.getRange(headerRow, 1, 1, Math.max(entrySheet.getLastColumn(), STANDARD_ENTRY_HEADERS.length)).getValues()[0];
  const colD = String(existingHeaders[3] || '').toLowerCase().trim();

  // If Column D is not 'firm', overwrite/fix header row seamlessly
  if (!colD.includes('firm')) {
    entrySheet.getRange(headerRow, 1, 1, STANDARD_ENTRY_HEADERS.length).setValues([STANDARD_ENTRY_HEADERS]);
    entrySheet.getRange(headerRow, 1, 1, STANDARD_ENTRY_HEADERS.length).setFontWeight('bold').setBackground('#D9EAD3');
    SpreadsheetApp.flush();
  }
}

/**
 * Auto-extend Labour Columns if entry has 12, 13 or more labourers
 */
function ensureLabourColumns(entrySheet, requiredLabourCount) {
  if (!entrySheet || requiredLabourCount < 1) return;
  const headerRow = getHeaderRowIndex(entrySheet);

  let updated = false;
  for (let i = 1; i <= requiredLabourCount; i++) {
    const targetCol = 14 + i; // Col 15 (O) = Labour 1 ... Col 25 (Y) = Labour 11, Col 26 (Z) = Labour 12...
    const cell = entrySheet.getRange(headerRow, targetCol);
    const val = String(cell.getValue() || '').trim();
    if (!val || !val.toLowerCase().startsWith('labour')) {
      cell.setValue(`Labour ${i}`);
      cell.setFontWeight('bold');
      cell.setBackground('#D9EAD3');
      updated = true;
    }
  }
  if (updated) {
    SpreadsheetApp.flush();
  }
}

/**
 * Dynamic Column Finder with fallbacks
 */
function findColIndex(sheet, possibleNames, defaultIndex) {
  if (!sheet || sheet.getLastColumn() < 1) return defaultIndex;
  const lastCol = sheet.getLastColumn();
  const headerRow = getHeaderRowIndex(sheet);

  if (sheet.getLastRow() >= headerRow) {
    const rowHeaders = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    for (let c = 0; c < rowHeaders.length; c++) {
      const val = String(rowHeaders[c] || '').toLowerCase().trim();
      for (let n = 0; n < possibleNames.length; n++) {
        const target = possibleNames[n].toLowerCase().trim();
        if (val === target || (target.length > 3 && val.includes(target))) {
          return c + 1; // 1-indexed
        }
      }
    }
  }
  return defaultIndex;
}

/**
 * Find first available empty row in a sheet by scanning Work ID / Col B
 */
function getFirstEmptyDataRow(sheet, startDataRow) {
  if (!sheet) return startDataRow || 2;
  const startRow = startDataRow || 2;
  const maxRows = sheet.getMaxRows();
  if (maxRows < startRow) return startRow;

  const numRowsToRead = maxRows - startRow + 1;
  const colBValues = sheet.getRange(startRow, 2, numRowsToRead, 1).getValues();

  for (let i = 0; i < colBValues.length; i++) {
    const val = colBValues[i][0];
    if (val === '' || val === null || val === undefined || String(val).trim() === '') {
      return startRow + i; // 1-indexed row
    }
  }

  return maxRows + 1;
}

/**
 * Generate sequential unique Work ID (e.g. WRK-0001, WRK-0002)
 */
function generateNextWorkId(ss) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const sheetsToCheck = [entrySheet, fmsSheet].filter(Boolean);

  let maxNum = 0;
  sheetsToCheck.forEach(sheet => {
    if (sheet.getLastRow() >= 1) {
      const headerRow = getHeaderRowIndex(sheet);
      const startRow = headerRow + 1;
      const maxRows = sheet.getMaxRows();
      if (maxRows >= startRow) {
        const workIds = sheet.getRange(startRow, 2, maxRows - startRow + 1, 1).getValues();
        for (let i = 0; i < workIds.length; i++) {
          const id = String(workIds[i][0] || '').trim();
          if (id.startsWith('WRK-')) {
            const num = parseInt(id.replace('WRK-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
    }
  });

  return 'WRK-' + String(maxNum + 1).padStart(4, '0');
}

/**
 * Check if a row is a valid data row
 */
function isValidWorkRow(row) {
  if (!row || row.length === 0) return false;
  const workId = String(row[1] || row[0] || '').trim().toLowerCase();
  if (!workId) return false;

  const invalidKeywords = [
    'what', 'who', 'when', 'where', 'why', 'how',
    'work id', 'workid', 'timestamp', 'date', 'shift',
    'incharge', 'work', 'status', 'total', 'grand total',
    'planned', 'actual', 'delay'
  ];

  return !invalidKeywords.includes(workId);
}

/**
 * Create New Work Entry:
 * EXACT Header Name Mapping into Entry sheet and FMS sheet
 */
function handleCreateEntry(ss, data) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY) || ss.insertSheet(SHEET_NAMES.ENTRY);
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);

  const timestamp = getFormattedSheetTimestamp();
  const workId = data.workId || generateNextWorkId(ss);

  // Extract all valid labour names
  let labourNames = [];
  if (Array.isArray(data.labourNames)) {
    labourNames = data.labourNames.map(n => String(n || '').trim()).filter(Boolean);
  }

  const labourCount = labourNames.length > 0 ? labourNames.length : (Number(data.labourCount) || 1);
  const rate = Number(data.rate) || 0;
  const totalAmount = Number(data.totalAmount) || (labourCount * rate);
  const status = 'Pending Verification';
  const workRemark = data.workRemark ? String(data.workRemark).trim() : '';
  const firmName = data.firmName ? String(data.firmName).trim() : (data.firm ? String(data.firm).trim() : 'PMMPL');

  // 1. Write to Entry sheet by EXACT HEADER NAME matching
  if (entrySheet) {
    ensureEntryHeader(entrySheet);
    const maxSlots = Math.max(labourNames.length, 11);
    ensureLabourColumns(entrySheet, maxSlots);

    const entryHeaderRow = getHeaderRowIndex(entrySheet);
    const entryStartDataRow = entryHeaderRow + 1;
    const lastCol = Math.max(entrySheet.getLastColumn(), 14 + maxSlots);
    const currentHeaders = entrySheet.getRange(entryHeaderRow, 1, 1, lastCol).getValues()[0];

    // Build row based on EXACT COLUMN HEADERS found in Entry Sheet
    const entryRow = new Array(currentHeaders.length).fill('');

    for (let c = 0; c < currentHeaders.length; c++) {
      const h = String(currentHeaders[c] || '').toLowerCase().trim();
      if (!h) continue;

      if (h === 'timestamp') {
        entryRow[c] = timestamp;
      } else if (h === 'work id' || h === 'workid') {
        entryRow[c] = workId;
      } else if (h === 'date') {
        entryRow[c] = data.date || '';
      } else if (h === 'firm' || h === 'firm name' || h === 'company') {
        entryRow[c] = firmName;
      } else if (h === 'shift') {
        entryRow[c] = data.shift || '';
      } else if (h === 'incharge' || h === 'supervisor') {
        entryRow[c] = data.incharge || '';
      } else if (h === 'work' || h === 'work type' || h === 'activity') {
        entryRow[c] = data.work || '';
      } else if (h.includes('labour (count)') || h.includes('labour count') || h.includes('no of labour')) {
        entryRow[c] = labourCount;
      } else if (h === 'hours') {
        entryRow[c] = Number(data.hours) || 0;
      } else if (h === 'qty' || h === 'quantity') {
        entryRow[c] = Number(data.qty) || 0;
      } else if (h.includes('amount per person') || h === 'rate') {
        entryRow[c] = rate;
      } else if (h === 'total amount' || h === 'amount' || h === 'total') {
        entryRow[c] = totalAmount;
      } else if (h === 'status' || h === 'current status') {
        entryRow[c] = status;
      } else if (h.includes('work remark') || h.includes('remark') || h.includes('remarks') || h.includes('notes')) {
        entryRow[c] = workRemark;
      } else if (h.startsWith('labour') && !h.includes('count')) {
        const labourIdx = parseInt(h.replace('labour', '').trim(), 10);
        if (!isNaN(labourIdx) && labourIdx >= 1 && labourIdx <= labourNames.length) {
          entryRow[c] = labourNames[labourIdx - 1];
        } else {
          entryRow[c] = '';
        }
      }
    }

    const targetRow = getFirstEmptyDataRow(entrySheet, entryStartDataRow);
    entrySheet.getRange(targetRow, 1, 1, entryRow.length).setValues([entryRow]);
    SpreadsheetApp.flush();
  }

  // 2. Write to FMS sheet (if exists) by EXACT Header Name matching
  if (fmsSheet) {
    const fmsHeaderRow = getHeaderRowIndex(fmsSheet);
    const fmsStartDataRow = fmsHeaderRow + 1;
    const lastCol = Math.max(fmsSheet.getLastColumn(), 25);
    const fmsHeaders = fmsSheet.getRange(fmsHeaderRow, 1, 1, lastCol).getValues()[0];

    const fmsRow = new Array(fmsHeaders.length).fill('');
    for (let c = 0; c < fmsHeaders.length; c++) {
      const h = String(fmsHeaders[c] || '').toLowerCase().trim();
      if (!h) continue;

      if (h === 'timestamp') fmsRow[c] = timestamp;
      else if (h === 'work id' || h === 'workid') fmsRow[c] = workId;
      else if (h === 'date') fmsRow[c] = data.date || '';
      else if (h === 'firm' || h === 'firm name' || h === 'company') fmsRow[c] = firmName;
      else if (h === 'shift') fmsRow[c] = data.shift || '';
      else if (h === 'incharge' || h === 'supervisor') fmsRow[c] = data.incharge || '';
      else if (h === 'work' || h === 'activity' || h === 'work type') fmsRow[c] = data.work || '';
      else if (h.includes('no of labour') || h.includes('labour count') || h.includes('labour')) fmsRow[c] = labourCount;
      else if (h === 'hours') fmsRow[c] = Number(data.hours) || 0;
      else if (h === 'qty' || h === 'quantity') fmsRow[c] = Number(data.qty) || 0;
      else if (h === 'amount' || h === 'total amount' || h === 'total') fmsRow[c] = totalAmount;
      else if (h === 'status' || h === 'current status') fmsRow[c] = status;
      else if (h.includes('work remark') || h.includes('remark') || h.includes('remarks')) fmsRow[c] = workRemark;
      else if (h.includes('planned timestamp') || h === 'planned 1') fmsRow[c] = timestamp;
    }

    const targetFmsRow = getFirstEmptyDataRow(fmsSheet, fmsStartDataRow);
    fmsSheet.getRange(targetFmsRow, 1, 1, fmsRow.length).setValues([fmsRow]);
    SpreadsheetApp.flush();
  }

  return {
    status: 'success',
    workId: workId,
    timestamp: timestamp,
    firmName: firmName,
    labourCount: labourCount,
    labourNames: labourNames,
    workRemark: workRemark,
    message: 'Entry created successfully'
  };
}

/**
 * Update Status column in Entry sheet
 */
function updateEntryStatus(ss, workId, status) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  if (!entrySheet || entrySheet.getLastRow() < 1) return;
  const headerRow = getHeaderRowIndex(entrySheet);
  const dataRange = entrySheet.getDataRange().getValues();
  const statusCol = findColIndex(entrySheet, ['status', 'current status'], 13);
  for (let i = headerRow; i < dataRange.length; i++) {
    if (String(dataRange[i][1]).trim() === workId) {
      entrySheet.getRange(i + 1, statusCol).setValue(status);
      break;
    }
  }
}

/**
 * Stage 1: Verification Action
 */
function handleVerifyWork(ss, data) {
  const { workId, remarks } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Verified (Pending Approval)';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual timestamp', 'actual 1', 'verification actual'], 15);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 12);
    const headerRow = getHeaderRowIndex(fmsSheet);
    const dataRange = fmsSheet.getDataRange().getValues();

    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || dataRange[i][0]).trim() === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) {
          fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        }
        break;
      }
    }
  }

  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate, nextStatus: nextStatus };
}

/**
 * Stage 2: Payment Approval Action
 */
function handleApprovePayment(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Approved (Pending Payment)';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 2', 'actual approval', 'payment approval actual'], 18);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 12);
    const headerRow = getHeaderRowIndex(fmsSheet);
    const dataRange = fmsSheet.getDataRange().getValues();

    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || dataRange[i][0]).trim() === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) {
          fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        }
        break;
      }
    }
  }

  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate, nextStatus: nextStatus };
}

/**
 * Stage 3: Payment Disbursal Action
 */
function handleRecordPayment(ss, data) {
  const { workId, paymentMethod, paymentRef } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Paid (Pending Tally)';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 3', 'actual payment', 'payment actual'], 21);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 12);
    const headerRow = getHeaderRowIndex(fmsSheet);
    const dataRange = fmsSheet.getDataRange().getValues();

    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || dataRange[i][0]).trim() === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) {
          fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        }
        break;
      }
    }
  }

  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate, nextStatus: nextStatus };
}

/**
 * Stage 4: Tally Entry Action
 */
function handleRecordTally(ss, data) {
  const { workId, tallyVoucher, tallyLedger } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Tally Complete';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 4', 'actual tally', 'tally actual'], 24);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 12);
    const headerRow = getHeaderRowIndex(fmsSheet);
    const dataRange = fmsSheet.getDataRange().getValues();

    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || dataRange[i][0]).trim() === workId) {
        const rowIndex = i + 1;
        fmsSheet.getRange(rowIndex, actualCol).setValue(actualDate);
        if (statusCol > 0) {
          fmsSheet.getRange(rowIndex, statusCol).setValue(nextStatus);
        }
        break;
      }
    }
  }

  updateEntryStatus(ss, workId, nextStatus);
  return { status: 'success', workId: workId, actualDate: actualDate, nextStatus: nextStatus };
}

/**
 * Fetch Full Master Data
 */
function getMasterData(ss) {
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
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
  const defaultFirms = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];

  if (!masterSheet || masterSheet.getLastRow() < 1) {
    return { incharges: [], labourers: [], shifts: defaultShifts, workTypes: defaultWorkTypes, firmNames: defaultFirms };
  }

  const values = masterSheet.getDataRange().getValues();
  const incharges = [];
  const labourers = [];
  const shifts = [];
  const workTypes = [];
  const firmNames = [];

  let startRow = 0;
  let inchargeCol = 0, labourCol = 1, shiftCol = 2, workCol = 3, firmCol = 4, rateCol = 5;

  for (let r = 0; r < Math.min(values.length, 6); r++) {
    const rowStr = values[r].join(' ').toLowerCase();
    if (rowStr.includes('incharge') || rowStr.includes('labour') || rowStr.includes('shift') || rowStr.includes('work') || rowStr.includes('firm')) {
      startRow = r + 1;
      for (let c = 0; c < values[r].length; c++) {
        const header = String(values[r][c] || '').toLowerCase().trim();
        if (header.includes('incharge')) inchargeCol = c;
        else if (header.includes('labour')) labourCol = c;
        else if (header.includes('shift')) shiftCol = c;
        else if (header.includes('work') || header.includes('type') || header.includes('activity')) workCol = c;
        else if (header.includes('firm') || header.includes('company')) firmCol = c;
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
      workTypes.push({
        name: String(row[workCol]).trim(),
        defaultRate: Number(row[rateCol]) || 450
      });
    }
    if (row[firmCol] && String(row[firmCol]).trim()) {
      firmNames.push(String(row[firmCol]).trim());
    }
  }

  return {
    incharges,
    labourers,
    shifts: shifts.length > 0 ? shifts : defaultShifts,
    workTypes: workTypes.length > 0 ? workTypes : defaultWorkTypes,
    firmNames: firmNames.length > 0 ? firmNames : defaultFirms
  };
}

/**
 * Fetch Entries Data
 */
function getEntriesData(ss) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (!entrySheet && !fmsSheet) return [];

  const entries = [];
  const workMap = {};

  if (entrySheet && entrySheet.getLastRow() >= 1) {
    const entryData = entrySheet.getDataRange().getValues();
    const entryHeaderRow = getHeaderRowIndex(entrySheet);

    const firmCol = findColIndex(entrySheet, ['firm', 'firm name', 'company'], 4) - 1;
    const shiftCol = findColIndex(entrySheet, ['shift'], 5) - 1;
    const inchargeCol = findColIndex(entrySheet, ['incharge', 'supervisor'], 6) - 1;
    const workCol = findColIndex(entrySheet, ['work', 'activity', 'work type'], 7) - 1;
    const countCol = findColIndex(entrySheet, ['labour (count)', 'labour count', 'count'], 8) - 1;
    const hoursCol = findColIndex(entrySheet, ['hours'], 9) - 1;
    const qtyCol = findColIndex(entrySheet, ['qty', 'quantity'], 10) - 1;
    const rateCol = findColIndex(entrySheet, ['amount per person', 'rate'], 11) - 1;
    const totalCol = findColIndex(entrySheet, ['total amount', 'amount', 'total'], 12) - 1;
    const statusCol = findColIndex(entrySheet, ['status'], 13) - 1;
    const remarkCol = findColIndex(entrySheet, ['work remark', 'remark', 'remarks'], 14) - 1;

    for (let i = entryHeaderRow; i < entryData.length; i++) {
      const row = entryData[i];
      if (!isValidWorkRow(row)) continue;

      const workId = String(row[1] || row[0] || '').trim();
      if (!workId) continue;

      const labourNames = [];
      for (let c = 14; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val && !val.toLowerCase().startsWith('labour') && c !== remarkCol) {
          labourNames.push(val);
        }
      }

      const labourCount = Number(row[countCol]) || (labourNames.length > 0 ? labourNames.length : 1);
      const rate = Number(row[rateCol]) || 0;
      const totalAmount = Number(row[totalCol]) || (labourCount * rate);

      const entryObj = {
        timestamp: row[0],
        workId: workId,
        date: row[2],
        firmName: String(row[firmCol] || 'PMMPL').trim(),
        shift: String(row[shiftCol] || 'Shift 1').trim(),
        incharge: String(row[inchargeCol] || '').trim(),
        work: String(row[workCol] || '').trim(),
        labourCount: labourCount,
        hours: Number(row[hoursCol]) || 0,
        qty: Number(row[qtyCol]) || 0,
        rate: rate,
        totalAmount: totalAmount,
        status: String(row[statusCol] || 'Pending Verification').trim(),
        workRemark: String(row[remarkCol] || '').trim(),
        labourNames: labourNames,
        verificationPlanned: row[0],
        verificationActual: null,
        verificationDelay: '-',
        approvalPlanned: null,
        approvalActual: null,
        approvalDelay: '-',
        paymentPlanned: null,
        paymentActual: null,
        paymentDelay: '-',
        tallyPlanned: null,
        tallyActual: null,
        tallyDelay: '-'
      };

      entries.push(entryObj);
      workMap[workId] = entryObj;
    }
  }

  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const fmsData = fmsSheet.getDataRange().getValues();
    const fmsHeaderRow = getHeaderRowIndex(fmsSheet);

    const p1Col = findColIndex(fmsSheet, ['planned timestamp', 'planned 1'], 14) - 1;
    const a1Col = findColIndex(fmsSheet, ['actual timestamp', 'actual 1'], 15) - 1;
    const d1Col = findColIndex(fmsSheet, ['delay', 'delay 1'], 16) - 1;

    const p2Col = findColIndex(fmsSheet, ['planned 2'], 17) - 1;
    const a2Col = findColIndex(fmsSheet, ['actual 2'], 18) - 1;
    const d2Col = findColIndex(fmsSheet, ['delay 2'], 19) - 1;

    const p3Col = findColIndex(fmsSheet, ['planned 3'], 20) - 1;
    const a3Col = findColIndex(fmsSheet, ['actual 3'], 21) - 1;
    const d3Col = findColIndex(fmsSheet, ['delay 3'], 22) - 1;

    const p4Col = findColIndex(fmsSheet, ['planned 4'], 23) - 1;
    const a4Col = findColIndex(fmsSheet, ['actual 4'], 24) - 1;
    const d4Col = findColIndex(fmsSheet, ['delay 4'], 25) - 1;

    const fmsRemarkCol = findColIndex(fmsSheet, ['work remark', 'remark', 'remarks'], 13) - 1;

    for (let i = fmsHeaderRow; i < fmsData.length; i++) {
      const row = fmsData[i];
      if (!isValidWorkRow(row)) continue;

      const workId = String(row[1] || row[0] || '').trim();
      const existing = workMap[workId];
      if (existing) {
        existing.verificationPlanned = row[p1Col] || existing.timestamp;
        existing.verificationActual = row[a1Col] || null;
        existing.verificationDelay = row[d1Col] || '-';
        existing.approvalPlanned = row[p2Col] || null;
        existing.approvalActual = row[a2Col] || null;
        existing.approvalDelay = row[d2Col] || '-';
        existing.paymentPlanned = row[p3Col] || null;
        existing.paymentActual = row[a3Col] || null;
        existing.paymentDelay = row[d3Col] || '-';
        existing.tallyPlanned = row[p4Col] || null;
        existing.tallyActual = row[a4Col] || null;
        existing.tallyDelay = row[d4Col] || '-';
        if (!existing.workRemark && row[fmsRemarkCol]) {
          existing.workRemark = String(row[fmsRemarkCol]).trim();
        }
      }
    }
  }

  return entries;
}

/**
 * Update Work Remark in Google Sheets (Entry and FMS sheets)
 */
function handleUpdateWorkRemark(ss, data) {
  const { workId, workRemark } = data;
  if (!workId) return { status: 'error', message: 'Work ID required' };

  // 1. Update Entry sheet
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  if (entrySheet && entrySheet.getLastRow() >= 1) {
    const remarkCol = findColIndex(entrySheet, ['work remark', 'remark', 'remarks'], 14);
    const headerRow = getHeaderRowIndex(entrySheet);
    const dataRange = entrySheet.getDataRange().getValues();
    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || '').trim() === workId) {
        entrySheet.getRange(i + 1, remarkCol).setValue(workRemark || '');
        break;
      }
    }
  }

  // 2. Update FMS sheet
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const fmsRemarkCol = findColIndex(fmsSheet, ['work remark', 'remark', 'remarks'], 13);
    const headerRow = getHeaderRowIndex(fmsSheet);
    const dataRange = fmsSheet.getDataRange().getValues();
    for (let i = headerRow; i < dataRange.length; i++) {
      if (String(dataRange[i][1] || dataRange[i][0] || '').trim() === workId) {
        fmsSheet.getRange(i + 1, fmsRemarkCol).setValue(workRemark || '');
        break;
      }
    }
  }

  return { status: 'success', workId: workId, workRemark: workRemark || '' };
}

/**
 * Update Master Sheet
 */
function handleUpdateMasterData(ss, data) {
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER) || ss.insertSheet(SHEET_NAMES.MASTER);
  masterSheet.clearContents();
  masterSheet.appendRow(['Incharge Names', 'Labour Names', 'Shifts', 'Work Types', 'Firm Names', 'Default Rates']);

  const { incharges = [], labourers = [], shifts = [], workTypes = [], firmNames = [] } = data;
  const maxLen = Math.max(incharges.length, labourers.length, shifts.length, workTypes.length, firmNames.length);

  for (let i = 0; i < maxLen; i++) {
    masterSheet.appendRow([
      incharges[i] || '',
      labourers[i] || '',
      shifts[i] || '',
      workTypes[i] ? (typeof workTypes[i] === 'string' ? workTypes[i] : workTypes[i].name) : '',
      firmNames[i] || '',
      workTypes[i] ? (typeof workTypes[i] === 'object' ? workTypes[i].defaultRate : '') : ''
    ]);
  }

  return { status: 'success', message: 'Master data updated' };
}

/**
 * Auto-create and format all necessary sheets on init
 */
function ensureAllSheetsAndHeaders(ss) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY) || ss.insertSheet(SHEET_NAMES.ENTRY);
  ensureEntryHeader(entrySheet);
}
