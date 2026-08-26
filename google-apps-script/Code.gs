/**
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

/**
 * Format timestamp as "8/26/2026 0:31:13" (M/d/yyyy H:mm:ss)
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
 * Handle HTTP GET Requests (Fetch data)
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
        result = { message: 'Sheets ready', status: 'success' };
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
  const data = sheet.getRange(1, 1, numRows, Math.min(sheet.getLastColumn() || 1, 20)).getValues();
  for (let r = 0; r < data.length; r++) {
    const rowStr = data[r].map(v => String(v || '').toLowerCase().trim()).join(' ');
    if (rowStr.includes('work id') || rowStr.includes('workid') || rowStr.includes('timestamp') || (rowStr.includes('date') && rowStr.includes('shift'))) {
      return r + 1; // 1-indexed
    }
  }
  return 1;
}

/**
 * Dynamic Column Finder:
 * Checks detected header row first (and scans rows 1 to 10 as fallback)
 */
function findColIndex(sheet, possibleNames, defaultIndex) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return defaultIndex;

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

  // Fallback: check rows 1 to 10
  const numRowsToCheck = Math.min(sheet.getLastRow(), 10);
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

/**
 * Dynamic Column Logic for Entry sheet:
 * Automatically ensures headers 'Labour 1', 'Labour 2', 'Labour 3', etc. exist on header row
 */
function ensureLabourColumns(entrySheet, requiredLabourCount) {
  if (!entrySheet || requiredLabourCount < 1) return;
  const headerRow = getHeaderRowIndex(entrySheet);

  for (let i = 1; i <= requiredLabourCount; i++) {
    const targetCol = 12 + i; // Col 13 (M) is Labour 1, Col 14 (N) is Labour 2...
    const cell = entrySheet.getRange(headerRow, targetCol);
    const val = String(cell.getValue() || '').trim();
    if (!val || !val.toLowerCase().startsWith('labour')) {
      cell.setValue(`Labour ${i}`);
      cell.setFontWeight('bold');
      cell.setBackground('#A4C2F4');
    }
  }
  SpreadsheetApp.flush();
}

/**
 * Find actual first empty row after header row (scans Column B / Work ID)
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
 * Write row to first available empty row
 */
function writeRowToFirstEmpty(sheet, rowArray, startDataRow) {
  const targetRow = getFirstEmptyDataRow(sheet, startDataRow);
  const numCols = rowArray.length;
  sheet.getRange(targetRow, 1, 1, numCols).setValues([rowArray]);
  return targetRow;
}

/**
 * Generate sequential unique Work ID (reads all data rows)
 */
function generateNextWorkId(ss) {
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const sheetToCheck = fmsSheet || entrySheet;

  if (!sheetToCheck || sheetToCheck.getLastRow() < 1) {
    return 'WRK-0001';
  }

  const headerRow = getHeaderRowIndex(sheetToCheck);
  const startRow = headerRow + 1;
  const maxRows = sheetToCheck.getMaxRows();
  if (maxRows < startRow) return 'WRK-0001';

  const workIds = sheetToCheck.getRange(startRow, 2, maxRows - startRow + 1, 1).getValues();
  let maxNum = 0;

  for (let i = 0; i < workIds.length; i++) {
    const id = String(workIds[i][0] || '').trim();
    if (id.startsWith('WRK-')) {
      const num = parseInt(id.replace('WRK-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return 'WRK-' + String(maxNum + 1).padStart(4, '0');
}

/**
 * Check if a row is a valid data row (ignoring What, Who, When, headers)
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

  if (invalidKeywords.includes(workId)) return false;

  const planDate = String(row[11] || '').trim().toLowerCase();
  if (invalidKeywords.includes(planDate)) return false;

  return true;
}

/**
 * Create New Work Entry:
 * Writes directly to the first empty row (Row 7 for FMS, Row 2 for Entry)
 */
function handleCreateEntry(ss, data) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);

  const timestamp = getFormattedSheetTimestamp();
  const workId = data.workId || generateNextWorkId(ss);

  // Extract all valid non-empty labour names
  let labourNames = [];
  if (Array.isArray(data.labourNames)) {
    labourNames = data.labourNames.map(n => String(n || '').trim()).filter(Boolean);
  }

  const labourCount = labourNames.length > 0 ? labourNames.length : (Number(data.labourCount) || 1);
  const rate = Number(data.rate) || 0;
  const totalAmount = Number(data.totalAmount) || (labourCount * rate);
  const status = 'Pending Verification';

  // 1. Write to Entry sheet (first empty row after header)
  if (entrySheet) {
    ensureLabourColumns(entrySheet, labourNames.length);
    const entryHeaderRow = getHeaderRowIndex(entrySheet);
    const entryStartDataRow = entryHeaderRow + 1;

    const entryRow = [
      timestamp,
      workId,
      data.date || '',
      data.shift || '',
      data.incharge || '',
      data.work || '',
      labourCount,
      Number(data.hours) || 0,
      Number(data.qty) || 0,
      rate,
      totalAmount,
      status
    ];
    for (let i = 0; i < labourNames.length; i++) {
      entryRow.push(labourNames[i]);
    }
    writeRowToFirstEmpty(entrySheet, entryRow, entryStartDataRow);
  }

  // 2. Write to FMS sheet (first empty row after header, e.g. Row 7)
  if (fmsSheet) {
    const fmsHeaderRow = getHeaderRowIndex(fmsSheet);
    const fmsStartDataRow = fmsHeaderRow + 1;

    const fmsRow = [
      timestamp,                    // Col A (1): Timestamp
      workId,                       // Col B (2): Work ID
      data.date || '',              // Col C (3): Date
      data.shift || '',             // Col D (4): Shift
      data.incharge || '',          // Col E (5): Incharge
      data.work || '',              // Col F (6): Work
      labourCount,                  // Col G (7): No of Labour
      Number(data.hours) || 0,      // Col H (8): Hours
      Number(data.qty) || 0,        // Col I (9): Qty
      totalAmount,                  // Col J (10): Amount
      status,                       // Col K (11): Status -> 'Pending Verification'
      timestamp,                    // Col L (12): Planned Timestamp
      '',                           // Col M (13): Actual Timestamp
      '',                           // Col N (14): Delay
      '',                           // Col O (15): Planned 2
      '',                           // Col P (16): Actual 2
      '',                           // Col Q (17): Delay 2
      '',                           // Col R (18): Planned 3
      '',                           // Col S (19): Actual 3
      '',                           // Col T (20): Delay 3
      '',                           // Col U (21): Planned 4
      '',                           // Col V (22): Actual 4
      ''                            // Col W (23): Delay 4
    ];
    writeRowToFirstEmpty(fmsSheet, fmsRow, fmsStartDataRow);
  }

  return {
    status: 'success',
    workId: workId,
    timestamp: timestamp,
    labourCount: labourCount,
    labourNames: labourNames,
    message: 'Entry created successfully'
  };
}

/**
 * Stage 1: Verification Action
 * Writes to Actual Timestamp & Status -> 'Verified'
 */
function handleVerifyWork(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Verified';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual timestamp', 'actual 1', 'verification actual'], 13);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
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

  return { status: 'success', workId: workId, actualDate: actualDate };
}

/**
 * Stage 2: Payment Approval Action
 * Writes to Actual 2 & Status -> 'Approved'
 */
function handleApprovePayment(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Approved';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 2', 'actual approval', 'payment approval actual'], 16);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
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

  return { status: 'success', workId: workId, actualDate: actualDate };
}

/**
 * Stage 3: Payment Disbursal Action
 * Writes to Actual 3 & Status -> 'Paid'
 */
function handleRecordPayment(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Paid';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 3', 'actual payment', 'payment actual'], 19);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
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

  return { status: 'success', workId: workId, actualDate: actualDate };
}

/**
 * Stage 4: Tally Entry Action
 * Writes to Actual 4 & Status -> 'Tally Complete'
 */
function handleRecordTally(ss, data) {
  const { workId } = data;
  const actualDate = getFormattedSheetTimestamp();
  const nextStatus = 'Tally Complete';

  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  if (fmsSheet && fmsSheet.getLastRow() >= 1) {
    const actualCol = findColIndex(fmsSheet, ['actual 4', 'actual tally', 'tally actual'], 22);
    const statusCol = findColIndex(fmsSheet, ['status', 'current status'], 11);
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

  return { status: 'success', workId: workId, actualDate: actualDate };
}

/**
 * Update Status column in Entry sheet
 */
function updateEntryStatus(ss, workId, status) {
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);
  if (!entrySheet || entrySheet.getLastRow() < 1) return;
  const headerRow = getHeaderRowIndex(entrySheet);
  const dataRange = entrySheet.getDataRange().getValues();
  const statusCol = findColIndex(entrySheet, ['status', 'current status'], 12);
  for (let i = headerRow; i < dataRange.length; i++) {
    if (String(dataRange[i][1]).trim() === workId) {
      entrySheet.getRange(i + 1, statusCol).setValue(status);
      break;
    }
  }
}

/**
 * Fetch Full Master Data
 * Column A: Incharges
 * Column B: Labourers
 * Column C: Shifts
 * Column D: Work Types
 * Column E: Default Rates
 */
function getMasterData(ss) {
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!masterSheet || masterSheet.getLastRow() < 1) {
    return { incharges: [], labourers: [], shifts: [], workTypes: [] };
  }

  const values = masterSheet.getDataRange().getValues();
  const incharges = [];
  const labourers = [];
  const shifts = [];
  const workTypes = [];
  const firmNames = [];

  let startRow = 0;
  let inchargeCol = 0; // Col A
  let labourCol = 1;   // Col B
  let shiftCol = 2;    // Col C (index 2)
  let workCol = 3;     // Col D (index 3)
  let firmCol = 4;     // Col E (index 4)
  let rateCol = 5;     // Col F (index 5)

  // Detect header row if present
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
    // Col C for Shift
    if (row[shiftCol] && String(row[shiftCol]).trim()) shifts.push(String(row[shiftCol]).trim());
    
    // Col D for Work types
    if (row[workCol] && String(row[workCol]).trim()) {
      workTypes.push({
        name: String(row[workCol]).trim(),
        defaultRate: Number(row[rateCol]) || 450
      });
    }

    // Col E for Firm Names
    if (row[firmCol] && String(row[firmCol]).trim()) {
      firmNames.push(String(row[firmCol]).trim());
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
  const defaultFirms = ['Firm 1', 'Firm 2', 'Firm 3'];

  return {
    incharges,
    labourers,
    shifts: shifts.length > 0 ? shifts : defaultShifts,
    workTypes: workTypes.length > 0 ? workTypes : defaultWorkTypes,
    firmNames: firmNames.length > 0 ? firmNames : defaultFirms
  };
}

/**
 * Fetch Entries from FMS sheet:
 * Headers on Row 6, Data fetched starting from Row 7
 * Status in Column K (11)
 * Planned Timestamp in Column L (12)
 * Actual Timestamp in Column M (13)
 * Delay in Column N (14)
 */
function getEntriesData(ss) {
  const fmsSheet = ss.getSheetByName(SHEET_NAMES.FMS);
  const entrySheet = ss.getSheetByName(SHEET_NAMES.ENTRY);

  const mainSheet = fmsSheet || entrySheet;
  if (!mainSheet || mainSheet.getLastRow() < 1) return [];

  // Extract dynamic labour names from Entry sheet
  const labourMap = {};
  if (entrySheet && entrySheet.getLastRow() >= 1) {
    const entryHeaderRow = getHeaderRowIndex(entrySheet);
    const entryData = entrySheet.getDataRange().getValues();
    for (let i = entryHeaderRow; i < entryData.length; i++) {
      const row = entryData[i];
      const wId = String(row[1] || '').trim();
      if (!wId || !isValidWorkRow(row)) continue;
      const names = [];
      for (let c = 12; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val && !val.toLowerCase().startsWith('labour')) {
          names.push(val);
        }
      }
      labourMap[wId] = names;
    }
  }

  const fmsData = mainSheet.getDataRange().getValues();
  const fmsHeaderRow = getHeaderRowIndex(mainSheet);
  
  // Find column indexes dynamically (1-indexed converted to 0-indexed)
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
  // Loop starting from row after detected header row
  for (let i = fmsHeaderRow; i < fmsData.length; i++) {
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

    const firmCol = findColIndex(mainSheet, ['firm', 'firm name', 'company'], 0) - 1;
    const firmName = (firmCol >= 0 && row[firmCol]) ? String(row[firmCol]).trim() : '';

    entries.push({
      timestamp: row[0],
      workId: workId,
      date: row[2],
      shift: row[3],
      firmName: firmName,
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

/**
 * Update Master Sheet rows
 * Col A: Incharge Names
 * Col B: Labour Names
 * Col C: Shifts
 * Col D: Work Types
 * Col E: Default Rates
 */
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

  return { status: 'success', message: 'Master data updated' };
}
