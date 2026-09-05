/**
 * Data Export Utilities (CSV, Excel-ready tables, Work Slip generation)
 */

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
      'Amount per person': e.rate,
      'Total Amount': e.totalAmount,
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
 * Trigger print dialog for a Work Slip
 */
export function printWorkSlip(entry) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Work Slip - ${entry.workId}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 24px; font-weight: bold; color: #059669; }
          .badge { background: #ecfdf5; color: #065f46; padding: 6px 12px; border-radius: 9999px; font-weight: 600; border: 1px solid #a7f3d0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .card { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 16px; font-weight: 700; color: #0f172a; }
          .labour-list { margin: 20px 0; }
          .labour-chip { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #064e3b; padding: 6px 12px; border-radius: 6px; margin: 4px; font-weight: 500; }
          .timeline { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .timeline-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .timeline-table th, .timeline-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
          .timeline-table th { background: #f1f5f9; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
          .sign-box { text-align: center; width: 180px; }
          .sign-line { border-bottom: 1px solid #334155; height: 40px; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Labour Payment System - Work Order Slip</div>
            <div style="font-size: 13px; color: #64748b;">Labour Payment & Workflow Tracking System</div>
          </div>
          <div>
            <span class="badge">${entry.status}</span>
          </div>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Work ID</div><div class="val">${entry.workId}</div></div>
          <div class="card"><div class="label">Work Date</div><div class="val">${entry.date}</div></div>
          <div class="card"><div class="label">Shift Timing</div><div class="val">${entry.shift}</div></div>
          <div class="card"><div class="label">Supervisor / Incharge</div><div class="val">${entry.incharge}</div></div>
          <div class="card"><div class="label">Work Description</div><div class="val">${entry.work}</div></div>
          <div class="card"><div class="label">Work Remark</div><div class="val">${entry.workRemark || '-'}</div></div>
          <div class="card"><div class="label">Labour Count × Rate</div><div class="val">${entry.labourCount} persons × ₹${entry.rate}/person</div></div>
          <div class="card" style="grid-column: span 2;"><div class="label">Total Amount Payable</div><div class="val" style="color: #059669; font-size: 20px;">₹${Number(entry.totalAmount).toLocaleString('en-IN')}</div></div>
        </div>

        <div class="labour-list">
          <div class="label" style="margin-bottom: 8px;">Deployed Labourers (${entry.labourNames ? entry.labourNames.length : 0})</div>
          <div>
            ${(entry.labourNames || []).map((name, i) => `<span class="labour-chip">${i + 1}. ${name}</span>`).join('')}
          </div>
        </div>

        <div class="timeline">
          <div class="label">4-Stage Workflow Audit Trail</div>
          <table class="timeline-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Planned Date</th>
                <th>Actual Date</th>
                <th>Delay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1. Verification</td>
                <td>${entry.verificationPlanned || '-'}</td>
                <td>${entry.verificationActual || 'Pending'}</td>
                <td>${entry.verificationDelay || '-'}</td>
              </tr>
              <tr>
                <td>2. Payment Approval</td>
                <td>${entry.approvalPlanned || '-'}</td>
                <td>${entry.approvalActual || 'Pending'}</td>
                <td>${entry.approvalDelay || '-'}</td>
              </tr>
              <tr>
                <td>3. Payment Disbursal</td>
                <td>${entry.paymentPlanned || '-'}</td>
                <td>${entry.paymentActual || 'Pending'} (${entry.paymentRef || 'N/A'})</td>
                <td>${entry.paymentDelay || '-'}</td>
              </tr>
              <tr>
                <td>4. Tally Accounting</td>
                <td>${entry.tallyPlanned || '-'}</td>
                <td>${entry.tallyActual || 'Pending'} (${entry.tallyVoucher || 'N/A'})</td>
                <td>${entry.tallyDelay || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div class="sign-box"><div class="sign-line"></div><div>Incharge Signature</div></div>
          <div class="sign-box"><div class="sign-line"></div><div>Verifier Signature</div></div>
          <div class="sign-box"><div class="sign-line"></div><div>Accounts Approver</div></div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
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
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

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
          <div>
            <h1 class="title">LABOUR PAYMENT SYSTEM</h1>
            <div class="subtitle">INCHARGE WISE LABOUR REPORT & MIS ANALYTICS</div>
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

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
