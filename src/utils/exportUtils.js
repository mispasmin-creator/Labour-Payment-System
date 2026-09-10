import { isTonBasedWork } from './workTypes';

/**
 * Export data to CSV and trigger browser download
 */
export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;

  const separator = ',';
  const keys = Object.keys(rows[0]);

  const csvContent =
    keys.map(k => `"${k.replace(/"/g, '""')}"`).join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            if (Array.isArray(cell)) {
              cell = cell.join('; ');
            }
            cell = String(cell).replace(/"/g, '""');
            return `"${cell}"`;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format entries for Entry Sheet CSV export (including dynamic Labour columns)
 */
export function formatEntriesForExport(entries) {
  // Find max labour count to determine header
  let maxLabour = 0;
  entries.forEach(e => {
    if (e.labourNames && e.labourNames.length > maxLabour) {
      maxLabour = e.labourNames.length;
    }
  });

  return entries.map(e => {
    const count = Number(e.labourCount) || 1;
    const total = Number(e.totalAmount) || 0;
    const perPerson = count > 0 ? (total / count) : 0;

    const base = {
      Timestamp: e.timestamp,
      'Work ID': e.workId,
      Date: e.date,
      Shift: e.shift,
      Firm: e.firmName || '-',
      Incharge: e.incharge,
      Work: e.work,
      'Work Remark': e.workRemark || '',
      'Labour (Count)': e.labourCount,
      Hours: e.hours,
      Qty: e.qty,
      'Per Person Amount': Number(perPerson.toFixed(2)),
      'Total Amount': total,
      Status: e.status
    };

    // Add Labour 1...N
    for (let i = 1; i <= Math.max(maxLabour, 4); i++) {
      base[`Labour ${i}`] = (e.labourNames && e.labourNames[i - 1]) || '';
    }

    return base;
  });
}

/**
 * Format entries for FMS Sheet CSV export
 */
export function formatFMSForExport(entries) {
  return entries.map(e => ({
    Timestamp: e.timestamp,
    'Work ID': e.workId,
    Date: e.date,
    Shift: e.shift,
    Firm: e.firmName || '-',
    Incharge: e.incharge,
    Work: e.work,
    'Work Remark': e.workRemark || '',
    'No of Labour': e.labourCount,
    Hours: e.hours,
    Qty: e.qty,
    Amount: e.totalAmount,
    Status: e.status
  }));
}

/**
 * Format entries for Workflow Sheet CSV export
 */
export function formatWorkflowForExport(entries) {
  return entries.map(e => ({
    'Work ID': e.workId,
    'Verification Planned': e.verificationPlanned || '',
    'Verification Actual': e.verificationActual || '',
    'Verification Delay': e.verificationDelay || '',
    'Approval Planned': e.approvalPlanned || '',
    'Approval Actual': e.approvalActual || '',
    'Approval Delay': e.approvalDelay || '',
    'Payment Planned': e.paymentPlanned || '',
    'Payment Actual': e.paymentActual || '',
    'Payment Delay': e.paymentDelay || '',
    'Payment Ref / UTR': e.paymentRef || '',
    'Tally Planned': e.tallyPlanned || '',
    'Tally Actual': e.tallyActual || '',
    'Tally Delay': e.tallyDelay || '',
    'Tally Voucher': e.tallyVoucher || '',
    'Current Status': e.status
  }));
}

/**
 * Format ISO datetime string to MM/DD/YYYY HH:MM:SS
 */
export function formatDateTime(val) {
  if (!val || val === '-' || val === 'Pending') return val || '-';
  const str = String(val).trim();
  const match = str.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z?)(.*)$/);
  
  if (match) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) {
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const DD = String(d.getDate()).padStart(2, '0');
      const YYYY = d.getFullYear();
      const HH = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const suffix = match[2] ? ` ${match[2].trim()}` : '';
      return `${MM}/${DD}/${YYYY} ${HH}:${mm}:${ss}${suffix}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime()) && str.includes('-') && str.length > 10) {
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const YYYY = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${MM}/${DD}/${YYYY} ${HH}:${mm}:${ss}`;
  }

  return str;
}

/**
 * Format Date to MM/DD/YYYY
 */
export function formatWorkDate(val) {
  if (!val || val === '-') return '-';
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const YYYY = d.getFullYear();
    return `${MM}/${DD}/${YYYY}`;
  }
  return str;
}

/**
 * Print HTML content safely via a hidden iframe to prevent opening empty browser tabs
 * and prevent UI freezing in React.
 */
export function printHtmlDocument(html) {
  try {
    const existing = document.getElementById('app-print-frame');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'app-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print execution error:', err);
      }
    }, 300);
  } catch (err) {
    console.error('Iframe print setup error:', err);
  }
}

/**
 * Trigger print dialog for a Work Slip (Single-Page Fit)
 */
export function printWorkSlip(entry) {
  const count = Number(entry.labourCount) || 1;
  const total = Number(entry.totalAmount) || 0;
  const perPerson = count > 0 ? (total / count) : 0;

  const isVerified = Boolean(
    entry.verificationActual &&
    entry.verificationActual !== '-' &&
    entry.verificationActual !== 'Pending'
  ) || ['Verified', 'Payment Approved', 'Approved', 'Paid', 'Tally Done', 'Completed'].includes(entry.status);

  const isApproved = Boolean(
    entry.approvalActual &&
    entry.approvalActual !== '-' &&
    entry.approvalActual !== 'Pending'
  ) || ['Payment Approved', 'Approved', 'Paid', 'Tally Done', 'Completed'].includes(entry.status);

  const isPaid = Boolean(
    entry.paymentActual &&
    entry.paymentActual !== '-' &&
    entry.paymentActual !== 'Pending'
  ) || ['Paid', 'Tally Done', 'Completed'].includes(entry.status);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Work Slip - ${entry.workId}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm 10mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            font-size: 11px;
            line-height: 1.35;
            padding: 6px 10px;
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          .header { border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
          .logo-title { font-size: 18px; font-weight: 800; color: #059669; letter-spacing: -0.01em; }
          .logo-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
          .badge { background: #ecfdf5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; border: 1px solid #a7f3d0; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
          .card { background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
          .val { font-size: 12px; font-weight: 700; color: #0f172a; }
          .labour-box { margin: 10px 0; padding: 8px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
          .labour-chip { display: inline-block; background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; padding: 2px 7px; border-radius: 4px; margin: 2px 4px 2px 0; font-size: 10.5px; font-weight: 600; }
          
          .approval-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
          .approval-card { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
          .approval-title { font-size: 11px; font-weight: 700; color: #334155; }
          .approval-status { font-size: 11.5px; font-weight: 800; padding: 2px 9px; border-radius: 4px; }
          .approval-status.yes { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
          .approval-status.no { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }

          .footer { margin-top: 22px; display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px dashed #cbd5e1; }
          .sign-box { text-align: center; width: 150px; font-size: 10px; font-weight: 600; color: #475569; }
          .sign-line { border-bottom: 1px solid #334155; height: 28px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/logo.png" alt="Logo" style="width: 36px; height: 36px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; padding: 2px;" />
            <div>
              <div class="logo-title">Labour Payment System - Work Order Slip</div>
              <div class="logo-sub">Labour Payment & Verification Summary</div>
            </div>
          </div>
          <div>
            <span class="badge">${entry.status}</span>
          </div>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Work ID</div><div class="val">${entry.workId}</div></div>
          <div class="card"><div class="label">Work Date</div><div class="val">${formatWorkDate(entry.date)}</div></div>
          <div class="card"><div class="label">Shift Timing</div><div class="val">${entry.shift || '-'}</div></div>
          <div class="card"><div class="label">Firm Name</div><div class="val">${entry.firmName || '-'}</div></div>

          <div class="card"><div class="label">Supervisor / Incharge</div><div class="val">${entry.incharge}</div></div>
          <div class="card"><div class="label">Work Description</div><div class="val">${entry.work} (${isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'})</div></div>
          <div class="card"><div class="label">Hours & Quantity</div><div class="val">${entry.hours || 0} hrs • ${entry.qty || 0} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}</div></div>
          <div class="card"><div class="label">Rate</div><div class="val">₹${entry.rate} ${isTonBasedWork(entry.work) ? '/ Ton' : '/ person'}</div></div>

          <div class="card"><div class="label">Deployed Labourers</div><div class="val">${entry.labourCount} Persons</div></div>
          <div class="card"><div class="label">Per Person Share</div><div class="val" style="color: #059669;">₹${perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
          <div class="card" style="grid-column: span 2; background: #ecfdf5; border-color: #a7f3d0;">
            <div class="label" style="color: #065f46;">Total Payable Amount</div>
            <div class="val" style="color: #047857; font-size: 15px;">₹${total.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 10px;">
          <div class="label">Work Remark / Notes</div>
          <div class="val" style="font-weight: 500; font-size: 11px; color: ${entry.workRemark ? '#0f172a' : '#94a3b8'};">
            ${entry.workRemark || 'No remark entered'}
          </div>
        </div>

        <div class="labour-box">
          <div class="label" style="margin-bottom: 5px;">Deployed Labourers (${entry.labourNames ? entry.labourNames.length : entry.labourCount})</div>
          <div>
            ${(entry.labourNames && entry.labourNames.length > 0 ? entry.labourNames : Array.from({ length: entry.labourCount }, (_, i) => `Labourer ${i + 1}`)).map((name, i) => `<span class="labour-chip">${i + 1}. ${name}</span>`).join('')}
          </div>
        </div>

        <div class="approval-grid">
          <div class="approval-card">
            <span class="approval-title">Verification</span>
            <span class="approval-status ${isVerified ? 'yes' : 'no'}">${isVerified ? 'Yes' : 'No'}</span>
          </div>
          <div class="approval-card">
            <span class="approval-title">Payment Approval</span>
            <span class="approval-status ${isApproved ? 'yes' : 'no'}">${isApproved ? 'Yes' : 'No'}</span>
          </div>
          <div class="approval-card">
            <span class="approval-title">Payment Disbursal</span>
            <span class="approval-status ${isPaid ? 'yes' : 'no'}">${isPaid ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div class="footer">
          <div class="sign-box"><div class="sign-line"></div><div>Incharge / Supervisor</div></div>
          <div class="sign-box"><div class="sign-line"></div><div>Site Verifier</div></div>
          <div class="sign-box"><div class="sign-line"></div><div>Accounts Approver</div></div>
        </div>
      </body>
    </html>
  `;

  printHtmlDocument(html);
}

/**
 * Format Incharge Wise Detailed Labour records for CSV export
 */
export function formatInchargeWiseForExport(records) {
  return records.map((r, idx) => ({
    'Sr No': idx + 1,
    'Labour Name': r.labourName,
    'Incharge': r.incharge,
    'Firm': r.firmName || '-',
    'Date': r.date,
    'Shift': r.shift || '-',
    'Work Type': r.work,
    'Work Remark': r.workRemark || '',
    'Days': r.days,
    'Rate (₹)': r.rate,
    'Amount (₹)': r.amount,
    'Qty Made': r.qtyMade || 0,
    'Status': r.status,
    'Work ID': r.workId
  }));
}

/**
 * Trigger print dialog for the Executive Labour MIS Report Sheet (A4 layout)
 */
export function printInchargeWiseReport({
  filters = {},
  summary = {},
  inchargeSummary = [],
  labourSummary = [],
  workTypeSummary = [],
  dateWiseSummary = [],
  detailedRows = []
}) {
  const mode = filters.reportMode || 'incharge';

  const modeTitles = {
    incharge: 'INCHARGE / SUPERVISOR DEPLOYMENT SUMMARY',
    labour: filters.labour ? `LABOUR ATTENDANCE & PAYOUT LEDGER (${filters.labour})` : 'LABOUR WISE ATTENDANCE & PAYOUT SUMMARY',
    workType: 'WORK ACTIVITY & PRODUCTION OUTPUT LEDGER',
    dateShift: 'DATE & SHIFT DEPLOYMENT MATRIX',
    detailed: 'MASTER DETAILED LABOUR TRANSACTION LEDGER'
  };

  const filterEntries = [
    { label: 'Date Scope', val: filters.dateFrom || filters.dateTo ? `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'}` : 'All Dates' },
    { label: 'Supervisor / Incharge', val: filters.incharge || 'All Incharges' },
    { label: 'Shift', val: filters.shift || 'All Shifts' },
    { label: 'Firm Name', val: filters.firm || 'All Firms' },
    { label: 'Labour Filter', val: filters.labour || 'All Workers' },
    { label: 'Work Activity', val: filters.workType || 'All Activities' }
  ];

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const printTimestamp = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Labour MIS Report Sheet</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            font-size: 10.5px;
            line-height: 1.35;
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 16px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
            letter-spacing: 0.02em;
          }
          .subtitle {
            font-size: 10.5px;
            color: #047857;
            font-weight: 700;
            margin-top: 2px;
            text-transform: uppercase;
          }
          .badge {
            background: #ecfdf5;
            color: #047857;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 9.5px;
            border: 1px solid #a7f3d0;
          }
          .filter-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
            margin-bottom: 10px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px 10px;
          }
          .filter-item { font-size: 9.5px; }
          .filter-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 8.5px; }
          .filter-val { color: #0f172a; font-weight: 700; }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .kpi-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 8px;
            text-align: center;
          }
          .kpi-card.highlight {
            background: #f0fdf4;
            border-color: #86efac;
          }
          .kpi-label { font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase; }
          .kpi-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .kpi-val.green { color: #15803d; }

          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            margin: 12px 0 6px 0;
            border-left: 3px solid #059669;
            padding-left: 6px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 9.5px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4.5px 6px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 8.5px;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          tfoot tr td {
            background: #f1f5f9 !important;
            font-weight: 800;
          }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .bold { font-weight: 700; }
          .emerald { color: #15803d; font-weight: 800; }
          
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px dashed #94a3b8;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #475569;
            page-break-inside: avoid;
          }
          .sign-box { text-align: center; width: 150px; }
          .sign-line { border-bottom: 1px solid #334155; height: 32px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/logo.png" alt="Logo" style="width: 38px; height: 38px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; padding: 2px;" />
            <div>
              <h1 class="title">LABOUR PAYMENT SYSTEM</h1>
              <div class="subtitle">${modeTitles[mode] || 'EXECUTIVE MIS REPORT SHEET'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge">Generated: ${printTimestamp}</span>
          </div>
        </div>

        <div class="filter-box">
          ${filterEntries.map(f => `
            <div class="filter-item">
              <div class="filter-label">${f.label}</div>
              <div class="filter-val">${f.val}</div>
            </div>
          `).join('')}
        </div>

        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <div class="kpi-label">Total Payout Amount</div>
            <div class="kpi-val green">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Labour Headcount</div>
            <div class="kpi-val">${summary.uniqueLabourers || 0} Workers</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cumulative Man-Days</div>
            <div class="kpi-val">${summary.totalDays || 0} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Output Qty</div>
            <div class="kpi-val">${(summary.totalProductionQty || 0).toLocaleString('en-IN')} Units/Tons</div>
          </div>
        </div>

        <!-- Mode Specific Table -->
        ${(mode === 'incharge' || mode === 'all') && inchargeSummary.length > 0 ? `
          <div class="section-title">1. Incharge / Supervisor Deployment Summary</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Incharge / Supervisor</th>
                <th class="num">Labourers</th>
                <th class="num">Man-Days</th>
                <th class="num">Output Qty</th>
                <th class="num">Total Amount (₹)</th>
                <th class="num">Avg / Worker (₹)</th>
                <th class="num">Avg / Day (₹)</th>
                <th class="num">Work Orders</th>
              </tr>
            </thead>
            <tbody>
              ${inchargeSummary.map((inc, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${inc.incharge}</td>
                  <td class="num">${inc.uniqueLabourers}</td>
                  <td class="num">${inc.totalDays}</td>
                  <td class="num">${inc.qtyMade ? inc.qtyMade.toLocaleString('en-IN') : '-'}</td>
                  <td class="num emerald">₹${Number(inc.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(inc.avgPerLabour).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(inc.avgPerDay).toLocaleString('en-IN')}</td>
                  <td class="num">${inc.workEntries}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Grand Total</td>
                <td class="num">${summary.uniqueLabourers || 0}</td>
                <td class="num">${summary.totalDays || 0}</td>
                <td class="num">${(summary.totalProductionQty || 0).toLocaleString('en-IN')}</td>
                <td class="num emerald">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td class="num">₹${(summary.avgPerLabour || 0).toLocaleString('en-IN')}</td>
                <td class="num">₹${(summary.avgPerDay || 0).toLocaleString('en-IN')}</td>
                <td class="num">${summary.totalWorkEntries || 0}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        ${mode === 'labour' && filters.labour ? `
          <div class="section-title">2. Attendance & Payout Ledger: ${filters.labour}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Date</th>
                <th>Incharge</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Work Activity</th>
                <th>Remark</th>
                <th class="num">Days</th>
                <th class="num">Amount (₹)</th>
                <th class="num">Output</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${detailedRows.filter(r => r.labourName === filters.labour).map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${r.date}</td>
                  <td>${r.incharge}</td>
                  <td>${r.shift}</td>
                  <td>${r.firmName}</td>
                  <td>${r.work}</td>
                  <td>${r.workRemark || '-'}</td>
                  <td class="num">${r.days}</td>
                  <td class="num emerald">₹${Number(r.amount).toLocaleString('en-IN')}</td>
                  <td class="num">${r.qtyMade || 0}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${mode === 'labour' && !filters.labour && labourSummary.length > 0 ? `
          <div class="section-title">2. Labour Wise Attendance & Payout Summary</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Labour Worker Name</th>
                <th>Supervisor(s)</th>
                <th>Work Activity Types</th>
                <th class="num">Total Days</th>
                <th class="num">Total Output</th>
                <th class="num">Total Amount (₹)</th>
                <th class="num">Daily Avg (₹)</th>
                <th class="num">Work Orders</th>
              </tr>
            </thead>
            <tbody>
              ${labourSummary.map((l, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${l.labourName}</td>
                  <td>${l.incharges.join(', ')}</td>
                  <td>${l.workTypes.join(', ')}</td>
                  <td class="num">${l.totalDays}</td>
                  <td class="num">${l.totalQty || '-'}</td>
                  <td class="num emerald">₹${Number(l.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(l.avgAmountPerDay).toLocaleString('en-IN')}</td>
                  <td class="num">${l.workEntries}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">Grand Total (${labourSummary.length} Workers)</td>
                <td class="num">${summary.totalDays || 0}</td>
                <td class="num">${(summary.totalProductionQty || 0).toLocaleString('en-IN')}</td>
                <td class="num emerald">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td class="num">₹${(summary.avgPerDay || 0).toLocaleString('en-IN')}</td>
                <td class="num">${detailedRows.length}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        ${mode === 'workType' && workTypeSummary.length > 0 ? `
          <div class="section-title">3. Work Activity & Production Output Ledger</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Work Activity</th>
                <th>Rate Basis</th>
                <th class="num">Labour Headcount</th>
                <th class="num">Total Days</th>
                <th class="num">Output (Tons/Units)</th>
                <th class="num">Total Amount (₹)</th>
                <th class="num">Avg Amount / Worker (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${workTypeSummary.map((w, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${w.workType}</td>
                  <td>${w.isTon ? 'Per Ton' : 'Per Person'}</td>
                  <td class="num">${w.labourCount}</td>
                  <td class="num">${w.totalDays}</td>
                  <td class="num">${w.qtyMade ? w.qtyMade.toLocaleString('en-IN') : '-'}</td>
                  <td class="num emerald">₹${Number(w.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(w.avgAmountPerLabour).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Grand Total</td>
                <td class="num">${summary.uniqueLabourers || 0}</td>
                <td class="num">${summary.totalDays || 0}</td>
                <td class="num">${(summary.totalProductionQty || 0).toLocaleString('en-IN')}</td>
                <td class="num emerald">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td class="num">₹${(summary.avgPerLabour || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        ${mode === 'dateShift' && dateWiseSummary.length > 0 ? `
          <div class="section-title">4. Date & Shift Deployment Matrix</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Date</th>
                <th>Shift</th>
                <th class="num">Labourers</th>
                <th class="num">Man-Days</th>
                <th class="num">Output Qty</th>
                <th class="num">Daily Payout (₹)</th>
                <th class="num">Avg / Worker (₹)</th>
                <th class="num">Work Orders</th>
              </tr>
            </thead>
            <tbody>
              ${dateWiseSummary.map((d, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${d.date}</td>
                  <td>${d.shift}</td>
                  <td class="num">${d.uniqueLabourers}</td>
                  <td class="num">${d.totalDays}</td>
                  <td class="num">${d.qtyMade || '-'}</td>
                  <td class="num emerald">₹${Number(d.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(d.avgPerLabour).toLocaleString('en-IN')}</td>
                  <td class="num">${d.workEntries}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Grand Total</td>
                <td class="num">${summary.uniqueLabourers || 0}</td>
                <td class="num">${summary.totalDays || 0}</td>
                <td class="num">${(summary.totalProductionQty || 0).toLocaleString('en-IN')}</td>
                <td class="num emerald">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td class="num">₹${(summary.avgPerLabour || 0).toLocaleString('en-IN')}</td>
                <td class="num">${summary.totalWorkEntries || 0}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        ${mode === 'detailed' && detailedRows.length > 0 ? `
          <div class="section-title">5. Master Detailed Transaction Ledger (${detailedRows.length} Entries)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Work ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Incharge</th>
                <th>Work Activity</th>
                <th>Labour Name</th>
                <th>Remark</th>
                <th class="num">Days</th>
                <th class="num">Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${detailedRows.slice(0, 100).map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-family: monospace; font-size: 8.5px;">${r.workId}</td>
                  <td>${r.date}</td>
                  <td>${r.shift}</td>
                  <td>${r.firmName}</td>
                  <td>${r.incharge}</td>
                  <td>${r.work}</td>
                  <td class="bold">${r.labourName}</td>
                  <td>${r.workRemark || '-'}</td>
                  <td class="num">${r.days}</td>
                  <td class="num emerald">₹${Number(r.amount).toLocaleString('en-IN')}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="9">Grand Total</td>
                <td class="num">${summary.totalDays || 0}</td>
                <td class="num emerald">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          ${detailedRows.length > 100 ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic; margin-bottom: 8px;">* Printing first 100 line items. Complete un-truncated ledger is downloadable via Export Excel button.</div>` : ''}
        ` : ''}

        <div class="footer">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div>Supervisor / Incharge</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div>Site Verifier</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div>Accounts Approver</div>
          </div>
        </div>
      </body>
    </html>
  `;

  printHtmlDocument(html);
}
