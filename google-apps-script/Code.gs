  /**
  * =========================================================================
  * Labour Payment & Workflow Tracking System - Google Apps Script Backend
  * =========================================================================
  * 
  * Header-Name Matched & Fully Resilient Dynamic Version
  * Supports "Login Page" Sheet for User Authentication & Role Permissions
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
  * 
  * Exact Login Page Sheet Headers:
  * Col A: Username
  * Col B: Password
  * Col C: Name
  * Col D: Administrate
  * Col E: Store Issue
  * Col F: Issue Data View
  * Col G: Inventory
  * Col H: Create Indent
  * Col I: Create PO
  * Col J: Indent Approval View
  * Col K: Indent Approval Action
  * Col L: Update Vendor View
  * Col M: Update Vendor Action
  * Col N: Three Party Approval View
  */

  const SHEET_NAMES = {
    ENTRY: 'Entry',
    FMS: 'FMS',
    WORKFLOW: 'Workflow',
    MASTER: 'Master',
    LOGIN: 'Login Page'
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

  const STANDARD_LOGIN_HEADERS = [
    'Username',
    'Password',
    'Name',
    'Administrate',
    'Dashboard Overview',
    'New Work Entry (Form)',
    'All Work Orders Master Grid',
    'Work Verification',
    'Payment Approval',
    'Payment Disbursal',
    'Tally Entry',
    'Reports & Export'
  ];

  const DEFAULT_LOGIN_USERS = [
    {
      id: 'usr_admin',
      username: 'admin',
      password: 'admin123',
      name: 'Admin',
      role: 'admin',
      status: 'active',
      assignedFirms: ['*'],
      permissions: ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally', 'reports', 'admin']
    },
    {
      id: 'usr_bhupendra',
      username: 'DME',
      password: 'user123',
      name: 'Bhupendra',
      role: 'user',
      status: 'active',
      assignedFirms: ['*'],
      permissions: ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally']
    }
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

        case 'getUsers':
        case 'getLoginUsers':
          result = { users: getUsersData(ss) };
          break;

        case 'getEntries':
          result = { entries: getEntriesData(ss) };
          break;

        case 'getAllData':
          result = {
            master: getMasterData(ss),
            entries: getEntriesData(ss),
            users: getUsersData(ss),
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

        case 'updateUsers':
        case 'saveUsers': {
          const payloadData = e.parameter.data ? JSON.parse(e.parameter.data) : {};
          result = handleUpdateUsers(ss, payloadData);
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

        case 'updateUsers':
        case 'saveUsers':
          response = handleUpdateUsers(ss, data);
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
  * Ensure Login Page Sheet exists and has standard headers
  */
  function ensureLoginPageHeader(loginSheet) {
    if (!loginSheet) return;
    if (loginSheet.getLastRow() < 1) {
      loginSheet.getRange(1, 1, 1, STANDARD_LOGIN_HEADERS.length).setValues([STANDARD_LOGIN_HEADERS]);
      loginSheet.getRange(1, 1, 1, STANDARD_LOGIN_HEADERS.length).setFontWeight('bold').setBackground('#E6F4EA');

      const sampleRows = [
        ['admin', 'admin123', 'Admin', true, true, true, true, true, true, true, true, true],
        ['DME', 'user123', 'Bhupendra', false, true, true, true, true, true, true, true, false]
      ];
      loginSheet.getRange(2, 1, sampleRows.length, STANDARD_LOGIN_HEADERS.length).setValues(sampleRows);
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
  * Fast in-memory Column Finder (0ms, 0 RPC calls)
  */
  function findColInHeaders(headersRow, possibleNames, defaultColIndex1Based) {
    if (!headersRow || headersRow.length === 0) return (defaultColIndex1Based || 1) - 1;

    // 1st Pass: EXACT MATCH (Highest Priority)
    for (let c = 0; c < headersRow.length; c++) {
      const val = String(headersRow[c] || '').toLowerCase().trim();
      if (!val) continue;
      for (let n = 0; n < possibleNames.length; n++) {
        const target = possibleNames[n].toLowerCase().trim();
        if (val === target) {
          return c; // 0-indexed
        }
      }
    }

    // 2nd Pass: SAFE PARTIAL MATCH
    for (let c = 0; c < headersRow.length; c++) {
      const val = String(headersRow[c] || '').toLowerCase().trim();
      if (!val) continue;
      for (let n = 0; n < possibleNames.length; n++) {
        const target = possibleNames[n].toLowerCase().trim();
        if (target === 'work' || target === 'activity' || target === 'work type') {
          if (val.includes('id') || val.includes('remark') || val.includes('date') || val.includes('count')) continue;
        }
        if (target === 'work id' || target === 'workid') {
          if (val.includes('remark')) continue;
        }
        if (val.includes(target)) {
          return c; // 0-indexed
        }
      }
    }

    return (defaultColIndex1Based || 1) - 1;
  }

  /**
  * Format delay values from Google Sheets formulas cleanly
  */
  function formatSheetDelay(val) {
    if (val === null || val === undefined || val === '') return '-';
    if (typeof val === 'number') {
      if (val === 0) return '0 hrs';
      if (Math.abs(val) >= 1) return (val > 0 ? '+' : '') + val.toFixed(1) + ' days';
      return (val > 0 ? '+' : '') + (val * 24).toFixed(1) + ' hrs';
    }
    return String(val).trim();
  }

  /**
  * Dynamic Column Finder with exact priority and conflict safeguards
  */
  function findColIndex(sheet, possibleNames, defaultIndex) {
    if (!sheet || sheet.getLastColumn() < 1) return defaultIndex;
    const lastCol = sheet.getLastColumn();
    const headerRow = getHeaderRowIndex(sheet);

    if (sheet.getLastRow() >= headerRow) {
      const rowHeaders = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
      
      // 1st Pass: EXACT MATCH (Highest Priority)
      for (let c = 0; c < rowHeaders.length; c++) {
        const val = String(rowHeaders[c] || '').toLowerCase().trim();
        if (!val) continue;
        for (let n = 0; n < possibleNames.length; n++) {
          const target = possibleNames[n].toLowerCase().trim();
          if (val === target) {
            return c + 1; // 1-indexed
          }
        }
      }

      // 2nd Pass: SAFE PARTIAL MATCH
      for (let c = 0; c < rowHeaders.length; c++) {
        const val = String(rowHeaders[c] || '').toLowerCase().trim();
        if (!val) continue;
        for (let n = 0; n < possibleNames.length; n++) {
          const target = possibleNames[n].toLowerCase().trim();
          // Guard against 'work' matching 'work id' or 'work remark' or 'work date'
          if (target === 'work' || target === 'activity' || target === 'work type') {
            if (val.includes('id') || val.includes('remark') || val.includes('date') || val.includes('count')) continue;
          }
          if (target === 'work id' || target === 'workid') {
            if (val.includes('remark')) continue;
          }
          if (val.includes(target)) {
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
    const qty = Number(data.qty) || 0;
    const isTon = ['loading', 'loading jumbo', 'unloading', 'unloading jumbo', 'production'].some(function(t) {
      var w = String(data.work || '').toLowerCase().trim();
      return w === t || (t.indexOf(' ') !== -1 && w.indexOf(t) !== -1) || w.indexOf(t) === 0;
    });
    const totalAmount = data.totalAmount !== undefined && !isNaN(Number(data.totalAmount)) && Number(data.totalAmount) > 0
      ? Number(data.totalAmount)
      : (isTon ? (qty * rate) : (labourCount * rate));
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

      // Col N (Planned Timestamp) and beyond are formula / workflow action columns.
      // We only write entry data columns (Columns A to M) so user formulas in Col N or subsequent columns are never touched or overwritten.
      let maxEntryCol = 13; // Default Columns A to M (13 columns)
      for (let c = 0; c < fmsHeaders.length; c++) {
        const h = String(fmsHeaders[c] || '').toLowerCase().trim();
        if (h.includes('planned timestamp') || h === 'planned 1') {
          maxEntryCol = c; // Stop right before Planned Timestamp (Col N)
          break;
        }
      }

      const fmsRow = new Array(maxEntryCol).fill('');
      for (let c = 0; c < maxEntryCol; c++) {
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
  * Fetch Users from "Login Page" Sheet
  */
  function getUsersData(ss) {
    let loginSheet = ss.getSheetByName(SHEET_NAMES.LOGIN) ||
                    ss.getSheetByName('Login Page') ||
                    ss.getSheetByName('Login') ||
                    ss.getSheetByName('Users') ||
                    ss.getSheetByName('User');

    if (!loginSheet) {
      loginSheet = ss.insertSheet('Login Page');
      ensureLoginPageHeader(loginSheet);
    }

    if (loginSheet.getLastRow() < 1) {
      ensureLoginPageHeader(loginSheet);
    }

    const values = loginSheet.getDataRange().getValues();
    if (values.length < 2) {
      return DEFAULT_LOGIN_USERS;
    }

    let headerRow = 0;
    let usernameCol = 0, passwordCol = 1, nameCol = 2;

    for (let r = 0; r < Math.min(values.length, 5); r++) {
      const row = values[r].map(v => String(v || '').toLowerCase().trim());
      if (row.includes('username') || row.includes('user') || (row.includes('password') && row.includes('name'))) {
        headerRow = r;
        for (let c = 0; c < row.length; c++) {
          const h = row[c];
          if (h === 'username' || h === 'user name' || h === 'user') usernameCol = c;
          else if (h === 'password' || h === 'pass') passwordCol = c;
          else if (h === 'name' || h === 'full name' || h === 'display name') nameCol = c;
        }
        break;
      }
    }

    const headerKeys = values[headerRow].map(v => String(v || '').toLowerCase().trim());
    const users = [];

    for (let i = headerRow + 1; i < values.length; i++) {
      const row = values[i];
      const username = String(row[usernameCol] || '').trim();
      if (!username) continue;

      const password = String(row[passwordCol] || '').trim();
      const name = String(row[nameCol] || username).trim();

      const permissions = ['dashboard'];
      let isAdmin = false;
      let hasDashboard = true;
      let hasNewEntry = false;
      let hasTracker = false;
      let hasVerification = false;
      let hasApproval = false;
      let hasApprovalView = false;
      let hasPayment = false;
      let hasPaymentView = false;
      let hasTally = false;
      let hasTallyView = false;
      let hasReports = false;

      for (let c = 0; c < headerKeys.length; c++) {
        const h = headerKeys[c];
        const val = row[c];
        const valStr = String(val || '').toLowerCase().trim();
        const isTrue = val === true || valStr === 'true' || val === 1 || valStr === 'yes' || valStr === 'full' || valStr === 'view';
        const isViewOnly = valStr === 'view';

        if (isTrue) {
          if (h.includes('administrate') || h.includes('admin') || h === 'all') {
            isAdmin = true;
          }
          if (h.includes('dashboard')) {
            hasDashboard = true;
          }
          if (h.includes('new work entry') || h.includes('new entry') || h.includes('create indent') || h.includes('entry form') || h === 'entry') {
            hasNewEntry = true;
          }
          if (h.includes('master grid') || h.includes('work orders') || h.includes('tracker') || h.includes('store issue') || h.includes('inventory')) {
            hasTracker = true;
          }
          if (h.includes('work verification') || h.includes('verification') || h.includes('verify')) {
            hasVerification = true;
          }
          if (h.includes('payment approval') || h.includes('indent approval') || h.includes('approval')) {
            if (isViewOnly || h.includes('view')) hasApprovalView = true;
            else hasApproval = true;
          }
          if (h.includes('payment disbursal') || h.includes('create po') || h.includes('disbursal') || h.includes('payment')) {
            if (isViewOnly || h.includes('view') || h.includes('three party')) hasPaymentView = true;
            else hasPayment = true;
          }
          if (h.includes('tally entry') || h.includes('tally') || h.includes('update vendor') || h.includes('accounts')) {
            if (isViewOnly || h.includes('view')) hasTallyView = true;
            else hasTally = true;
          }
          if (h.includes('reports') || h.includes('export')) {
            hasReports = true;
          }
        }
      }

      if (isAdmin || username.toLowerCase() === 'admin') {
        users.push({
          id: 'usr_' + (i - headerRow),
          username: username,
          password: password,
          name: name,
          role: 'admin',
          status: 'active',
          assignedFirms: ['*'],
          permissions: ['dashboard', 'new_entry', 'tracker', 'verification', 'approval', 'payment', 'tally', 'reports', 'admin']
        });
      } else {
        if (hasNewEntry) permissions.push('new_entry');
        if (hasTracker || (!hasNewEntry && !hasApproval && !hasPayment && !hasTally)) permissions.push('tracker');
        if (hasVerification) permissions.push('verification');

        if (hasApproval) permissions.push('approval');
        else if (hasApprovalView) permissions.push('approval:view');

        if (hasPayment) permissions.push('payment');
        else if (hasPaymentView) permissions.push('payment:view');

        if (hasTally) permissions.push('tally');
        else if (hasTallyView) permissions.push('tally:view');

        if (hasReports || hasTracker || hasApprovalView || hasPaymentView || hasTallyView) {
          permissions.push('reports');
        }

        users.push({
          id: 'usr_' + (i - headerRow),
          username: username,
          password: password,
          name: name,
          role: 'user',
          status: 'active',
          assignedFirms: ['*'],
          permissions: Array.from(new Set(permissions))
        });
      }
    }

    return users.length > 0 ? users : DEFAULT_LOGIN_USERS;
  }

  /**
  * Update Users into "Login Page" Sheet
  */
  function handleUpdateUsers(ss, data) {
    let loginSheet = ss.getSheetByName(SHEET_NAMES.LOGIN) ||
                    ss.getSheetByName('Login Page') ||
                    ss.getSheetByName('Login') ||
                    ss.getSheetByName('Users');

    if (!loginSheet) {
      loginSheet = ss.insertSheet('Login Page');
    }

    const usersList = Array.isArray(data) ? data : (data.users || []);
    if (usersList.length === 0) return { status: 'error', message: 'No users provided' };

    loginSheet.clearContents();
    loginSheet.appendRow(STANDARD_LOGIN_HEADERS);
    loginSheet.getRange(1, 1, 1, STANDARD_LOGIN_HEADERS.length).setFontWeight('bold').setBackground('#E6F4EA');

    const rows = usersList.map(u => {
      const isAdmin = u.role === 'admin' || (Array.isArray(u.permissions) && u.permissions.includes('admin'));
      const perms = Array.isArray(u.permissions) ? u.permissions : [];

      const hasFull = mod => isAdmin || perms.includes(mod) || perms.includes(`${mod}:full`);
      const hasView = mod => isAdmin || hasFull(mod) || perms.includes(`${mod}:view`);

      return [
        u.username || '',
        u.password || '',
        u.name || u.displayName || u.username || '',
        isAdmin,
        isAdmin || hasView('dashboard'),
        isAdmin || hasFull('new_entry'),
        isAdmin || hasView('tracker'),
        isAdmin || hasFull('verification') || hasView('verification'),
        isAdmin || hasFull('approval') || hasView('approval'),
        isAdmin || hasFull('payment') || hasView('payment'),
        isAdmin || hasFull('tally') || hasView('tally'),
        isAdmin || hasView('reports')
      ];
    });

    if (rows.length > 0) {
      loginSheet.getRange(2, 1, rows.length, STANDARD_LOGIN_HEADERS.length).setValues(rows);
    }
    SpreadsheetApp.flush();

    return { status: 'success', message: 'Users updated in Login Page sheet' };
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
      { name: 'Loading Jumbo', defaultRate: 480 },
      { name: 'Unloading', defaultRate: 450 },
      { name: 'Unloading Jumbo', defaultRate: 450 },
      { name: 'Daily Wags', defaultRate: 400 },
      { name: 'Grinding', defaultRate: 500 },
      { name: 'Housekeeping', defaultRate: 380 },
      { name: 'Mechanical', defaultRate: 550 },
      { name: 'Crusing', defaultRate: 460 }
    ];
    const defaultFirms = ['PMMPL', 'RKL', 'Purab', 'Refrasynth', 'Refratech'];

    if (!masterSheet || masterSheet.getLastRow() < 1) {
      return { incharges: [], labourers: [], shifts: defaultShifts, workTypes: defaultWorkTypes, firmNames: defaultFirms, users: getUsersData(ss) };
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

    // Column B (index 1) is strictly the Labour Names column in the Master sheet
    const targetLabourCol = 1;
    const targetInchargeCol = (inchargeCol !== undefined && inchargeCol >= 0) ? inchargeCol : 0;

    const seenLabourers = {};
    const seenIncharges = {};

    for (let i = startRow; i < values.length; i++) {
      const row = values[i];

      // Incharges (Col A - index 0)
      if (row[targetInchargeCol] && String(row[targetInchargeCol]).trim()) {
        const inc = String(row[targetInchargeCol]).trim();
        const incLower = inc.toLowerCase();
        if (!incLower.includes('incharge') && !seenIncharges[incLower]) {
          seenIncharges[incLower] = true;
          incharges.push(inc);
        }
      }

      // Labourers - strictly fetched from Master Sheet Column B
      const labourCell = row[targetLabourCol];
      if (labourCell && String(labourCell).trim()) {
        const cellStr = String(labourCell).trim();
        // Split if multiple names are comma-separated or newline-separated in one cell
        const parts = cellStr.split(/[,|\n\r/]+/);
        for (let p = 0; p < parts.length; p++) {
          const lab = parts[p].trim().replace(/\s+/g, ' ');
          if (!lab || lab.length < 2) continue;
          const labLower = lab.toLowerCase();
          if (
            labLower !== 'labour' &&
            labLower !== 'labours' &&
            labLower !== 'labourer' &&
            labLower !== 'labourers' &&
            labLower !== 'labour names' &&
            labLower !== 'labour name' &&
            labLower !== 'name' &&
            labLower !== 'names' &&
            !seenLabourers[labLower]
          ) {
            seenLabourers[labLower] = true;
            labourers.push(lab);
          }
        }
      }

      if (row[shiftCol] && String(row[shiftCol]).trim()) {
        const sh = String(row[shiftCol]).trim();
        if (!shifts.includes(sh)) shifts.push(sh);
      }

      if (row[workCol] && String(row[workCol]).trim()) {
        const wName = String(row[workCol]).trim();
        if (!wName.toLowerCase().startsWith('shift') && !workTypes.some(w => w.name.toLowerCase() === wName.toLowerCase())) {
          workTypes.push({
            name: wName,
            defaultRate: Number(row[rateCol]) || 450
          });
        }
      }

      if (row[firmCol] && String(row[firmCol]).trim()) {
        const fName = String(row[firmCol]).trim();
        if (!firmNames.includes(fName)) firmNames.push(fName);
      }
    }

    labourers.sort(function(a, b) { return a.localeCompare(b); });
    incharges.sort(function(a, b) { return a.localeCompare(b); });

    return {
      incharges: incharges.length > 0 ? incharges : [],
      labourers: labourers.length > 0 ? labourers : [],
      shifts: shifts.length > 0 ? shifts : defaultShifts,
      workTypes: workTypes.length > 0 ? workTypes : defaultWorkTypes,
      firmNames: firmNames.length > 0 ? firmNames : defaultFirms,
      users: getUsersData(ss)
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
      const entryHeaders = entryData[entryHeaderRow - 1] || [];

      // Zero-overhead in-memory column resolution
      const firmCol = findColInHeaders(entryHeaders, ['firm', 'firm name', 'company'], 4);
      const shiftCol = findColInHeaders(entryHeaders, ['shift'], 5);
      const inchargeCol = findColInHeaders(entryHeaders, ['incharge', 'supervisor'], 6);
      const workCol = findColInHeaders(entryHeaders, ['work', 'activity', 'work type'], 7);
      const countCol = findColInHeaders(entryHeaders, ['labour (count)', 'labour count', 'count'], 8);
      const hoursCol = findColInHeaders(entryHeaders, ['hours'], 9);
      const qtyCol = findColInHeaders(entryHeaders, ['qty', 'quantity'], 10);
      const rateCol = findColInHeaders(entryHeaders, ['amount per person', 'rate'], 11);
      const totalCol = findColInHeaders(entryHeaders, ['total amount', 'amount', 'total'], 12);
      const statusCol = findColInHeaders(entryHeaders, ['status'], 13);
      const remarkCol = findColInHeaders(entryHeaders, ['work remark', 'remark', 'remarks'], 14);

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

        const work = String(row[workCol] || '').trim();
        const labourCount = Number(row[countCol]) || (labourNames.length > 0 ? labourNames.length : 1);
        const hours = Number(row[hoursCol]) || 0;
        const qty = Number(row[qtyCol]) || 0;
        const rate = Number(row[rateCol]) || 0;
        const isTon = ['loading', 'loading jumbo', 'unloading', 'unloading jumbo', 'production'].some(function(t) {
          var w = work.toLowerCase().trim();
          return w === t || (t.indexOf(' ') !== -1 && w.indexOf(t) !== -1) || w.indexOf(t) === 0;
        });
        
        let totalAmount = 0;
        if (isTon && qty > 0 && rate > 0) {
          totalAmount = qty * rate;
        } else if (!isTon && labourCount > 0 && rate > 0) {
          totalAmount = labourCount * rate;
        } else {
          totalAmount = Number(row[totalCol]) || (isTon ? qty * rate : labourCount * rate);
        }

        const entryObj = {
          timestamp: row[0],
          workId: workId,
          date: row[2],
          firmName: String(row[firmCol] || 'PMMPL').trim(),
          shift: String(row[shiftCol] || 'Shift 1').trim(),
          incharge: String(row[inchargeCol] || '').trim(),
          work: work,
          labourCount: labourCount,
          hours: hours,
          qty: qty,
          rate: rate,
          totalAmount: totalAmount,
          status: String(row[statusCol] || 'Pending Verification').trim(),
          workRemark: String(row[remarkCol] || '').trim(),
          labourNames: labourNames,
          verificationPlanned: null,
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
      const fmsHeaders = fmsData[fmsHeaderRow - 1] || [];

      // Zero-overhead in-memory column resolution
      const p1Col = findColInHeaders(fmsHeaders, ['planned timestamp', 'planned 1', 'planned date', 'planned date 1', 'planned', 'verification planned', 'plan date'], 14);
      const a1Col = findColInHeaders(fmsHeaders, ['actual timestamp', 'actual 1'], 15);
      const d1Col = findColInHeaders(fmsHeaders, ['delay', 'delay 1'], 16);

      const p2Col = findColInHeaders(fmsHeaders, ['planned 2'], 17);
      const a2Col = findColInHeaders(fmsHeaders, ['actual 2'], 18);
      const d2Col = findColInHeaders(fmsHeaders, ['delay 2'], 19);

      const p3Col = findColInHeaders(fmsHeaders, ['planned 3', 'planned date 3', 'payment planned', 'planned payment', 'payment plan', 'plan date 3'], 20);
      const a3Col = findColInHeaders(fmsHeaders, ['actual 3'], 21);
      const d3Col = findColInHeaders(fmsHeaders, ['delay 3'], 22);

      const p4Col = findColInHeaders(fmsHeaders, ['planned 4'], 23);
      const a4Col = findColInHeaders(fmsHeaders, ['actual 4'], 24);
      const d4Col = findColInHeaders(fmsHeaders, ['delay 4'], 25);

      const fmsRemarkCol = findColInHeaders(fmsHeaders, ['work remark', 'remark', 'remarks'], 13);

      for (let i = fmsHeaderRow; i < fmsData.length; i++) {
        const row = fmsData[i];
        if (!isValidWorkRow(row)) continue;

        const workId = String(row[1] || row[0] || '').trim();
        const existing = workMap[workId];
        if (existing) {
          existing.verificationPlanned = row[p1Col] ? (row[p1Col] instanceof Date ? row[p1Col].toISOString() : String(row[p1Col]).trim()) : null;
          existing.verificationActual = row[a1Col] ? (row[a1Col] instanceof Date ? row[a1Col].toISOString() : String(row[a1Col]).trim()) : null;
          existing.verificationDelay = formatSheetDelay(row[d1Col]);
          existing.approvalPlanned = row[p2Col] ? (row[p2Col] instanceof Date ? row[p2Col].toISOString() : String(row[p2Col]).trim()) : null;
          existing.approvalActual = row[a2Col] ? (row[a2Col] instanceof Date ? row[a2Col].toISOString() : String(row[a2Col]).trim()) : null;
          existing.approvalDelay = formatSheetDelay(row[d2Col]);
          existing.paymentPlanned = row[p3Col] ? (row[p3Col] instanceof Date ? row[p3Col].toISOString() : String(row[p3Col]).trim()) : null;
          existing.paymentActual = row[a3Col] ? (row[a3Col] instanceof Date ? row[a3Col].toISOString() : String(row[a3Col]).trim()) : null;
          existing.paymentDelay = formatSheetDelay(row[d3Col]);
          existing.tallyPlanned = row[p4Col] ? (row[p4Col] instanceof Date ? row[p4Col].toISOString() : String(row[p4Col]).trim()) : null;
          existing.tallyActual = row[a4Col] ? (row[a4Col] instanceof Date ? row[a4Col].toISOString() : String(row[a4Col]).trim()) : null;
          existing.tallyDelay = formatSheetDelay(row[d4Col]);
          if (!existing.workRemark && row[fmsRemarkCol]) {
            existing.workRemark = String(row[fmsRemarkCol]).trim();
          }

          // Dynamic milestone-based status synchronization:
          // If an actual timestamp was removed or cleared in the sheet, dynamically align status!
          if (existing.tallyActual) {
            existing.status = 'Tally Complete';
          } else if (existing.paymentActual) {
            existing.status = 'Paid (Pending Tally)';
          } else if (existing.approvalActual) {
            existing.status = 'Approved (Pending Payment)';
          } else if (existing.verificationActual) {
            existing.status = 'Verified (Pending Approval)';
          } else {
            existing.status = 'Pending Verification';
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

    const loginSheet = ss.getSheetByName(SHEET_NAMES.LOGIN) ||
                      ss.getSheetByName('Login Page') ||
                      ss.getSheetByName('Login') ||
                      ss.getSheetByName('Users') ||
                      ss.insertSheet('Login Page');
    ensureLoginPageHeader(loginSheet);
  }
