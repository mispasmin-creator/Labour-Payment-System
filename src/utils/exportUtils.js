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
 * Trigger print dialog for the full Incharge Wise Labour Report (A4 layout)
 */
export function printInchargeWiseReport({ filters = {}, summary = {}, inchargeSummary = [], labourSummary = [], workTypeSummary = [], detailedRows = [] }) {
  const filterEntries = [
    { label: 'Date Range', val: `${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}` },
    { label: 'Incharge', val: filters.incharge || 'All Incharges' },
    { label: 'Shift', val: filters.shift || 'All Shifts' },
    { label: 'Firm', val: filters.firm || 'All Firms' },
    { label: 'Labour', val: filters.labour || 'All Labourers' },
    { label: 'Work Type', val: filters.workType || 'All Work Types' }
  ];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Incharge Wise Labour Report</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            font-size: 11px;
            line-height: 1.35;
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            margin-top: 2px;
          }
          .badge {
            background: #ecfdf5;
            color: #047857;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 10px;
            border: 1px solid #a7f3d0;
          }
          .filter-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px 12px;
          }
          .filter-item { font-size: 10px; }
          .filter-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 9px; }
          .filter-val { color: #0f172a; font-weight: 700; }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
          }
          .kpi-label { font-size: 9px; font-weight: 700; color: #065f46; text-transform: uppercase; }
          .kpi-val { font-size: 15px; font-weight: 800; color: #047857; margin-top: 2px; }

          .section-title {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            margin: 14px 0 6px 0;
            border-left: 3px solid #059669;
            padding-left: 6px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 9px;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .bold { font-weight: 700; }
          .emerald { color: #047857; font-weight: 700; }
          
          .footer {
            margin-top: 20px;
            padding-top: 14px;
            border-top: 1px dashed #94a3b8;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #475569;
          }
          .sign-box { text-align: center; width: 140px; }
          .sign-line { border-bottom: 1px solid #334155; height: 28px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/logo.png" alt="Logo" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />
            <div>
              <h1 class="title">LABOUR PAYMENT SYSTEM</h1>
              <div class="subtitle">INCHARGE WISE LABOUR REPORT & MIS ANALYTICS</div>
            </div>
          </div>
          <div>
            <span class="badge">Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
          <div class="kpi-card">
            <div class="kpi-label">Total Unique Labourers</div>
            <div class="kpi-val">${summary.uniqueLabourers || 0} Persons</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Working Days</div>
            <div class="kpi-val">${summary.totalDays || 0} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Labour Amount</div>
            <div class="kpi-val">₹${(summary.totalAmount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg Amount / Labour</div>
            <div class="kpi-val">₹${(summary.avgPerLabour || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        ${inchargeSummary.length > 0 ? `
          <div class="section-title">1. Incharge Summary</div>
          <table>
            <thead>
              <tr>
                <th>Incharge</th>
                <th class="num">Labourers</th>
                <th class="num">Total Days</th>
                <th class="num">Total Amount</th>
                <th class="num">Avg / Labour</th>
                <th class="num">Avg / Day</th>
              </tr>
            </thead>
            <tbody>
              ${inchargeSummary.map(inc => `
                <tr>
                  <td class="bold">${inc.incharge}</td>
                  <td class="num">${inc.uniqueLabourers}</td>
                  <td class="num">${inc.totalDays}</td>
                  <td class="num emerald">₹${Number(inc.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(inc.avgPerLabour).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(inc.avgPerDay).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${labourSummary.length > 0 ? `
          <div class="section-title">2. Labour Wise Summary</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Labour Name</th>
                <th class="num">Total Days</th>
                <th class="num">Total Amount</th>
                <th class="num">Avg Amount / Day</th>
                <th class="num">Work Entries</th>
                <th>Work Types</th>
              </tr>
            </thead>
            <tbody>
              ${labourSummary.slice(0, 30).map((l, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${l.labourName}</td>
                  <td class="num">${l.totalDays}</td>
                  <td class="num emerald">₹${Number(l.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(l.avgAmountPerDay).toLocaleString('en-IN')}</td>
                  <td class="num">${l.workEntries}</td>
                  <td>${l.workTypes.join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${workTypeSummary.length > 0 ? `
          <div class="section-title">3. Type of Work Analysis</div>
          <table>
            <thead>
              <tr>
                <th>Work Type</th>
                <th class="num">Labour Count</th>
                <th class="num">Total Days</th>
                <th class="num">Total Amount</th>
                <th class="num">Qty Made</th>
                <th class="num">Avg Qty/Labour</th>
                <th class="num">Avg Amt/Labour</th>
              </tr>
            </thead>
            <tbody>
              ${workTypeSummary.map(w => `
                <tr>
                  <td class="bold">${w.workType}</td>
                  <td class="num">${w.labourCount}</td>
                  <td class="num">${w.totalDays}</td>
                  <td class="num emerald">₹${Number(w.totalAmount).toLocaleString('en-IN')}</td>
                  <td class="num">${w.qtyMade}</td>
                  <td class="num">${w.avgQtyPerLabour}</td>
                  <td class="num">₹${Number(w.avgAmountPerLabour).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${detailedRows.length > 0 ? `
          <div class="section-title">4. Detailed Labour Entries (${detailedRows.length} Records)</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Labour Name</th>
                <th>Incharge</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Work Type</th>
                <th>Remark</th>
                <th class="num">Days</th>
                <th class="num">Amount</th>
                <th class="num">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${detailedRows.slice(0, 50).map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="bold">${r.labourName}</td>
                  <td>${r.incharge}</td>
                  <td>${r.date}</td>
                  <td>${r.shift}</td>
                  <td>${r.work}</td>
                  <td>${r.workRemark || '-'}</td>
                  <td class="num">${r.days}</td>
                  <td class="num emerald">₹${Number(r.amount).toLocaleString('en-IN')}</td>
                  <td class="num">${r.qtyMade || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${detailedRows.length > 50 ? `<div style="font-size: 9px; color: #64748b; font-style: italic; margin-bottom: 10px;">* Showing first 50 detailed records in print view. Full dataset exported via CSV/Excel.</div>` : ''}
        ` : ''}

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
