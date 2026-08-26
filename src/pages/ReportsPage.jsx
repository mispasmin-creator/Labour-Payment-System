import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  IndianRupee,
  Users,
  Clock,
  Layers,
  FileCheck2,
  Table
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  exportToCSV,
  formatEntriesForExport,
  formatFMSForExport,
  formatWorkflowForExport
} from '../utils/exportUtils';

export function ReportsPage() {
  const { entries, masterData } = useApp();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  // Filter entries
  const filtered = entries.filter(e => {
    if (inchargeFilter && e.incharge !== inchargeFilter) return false;
    if (firmFilter && e.firmName !== firmFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  const totalFilteredAmount = filtered.reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);
  const totalFilteredLabourers = filtered.reduce((s, e) => s + (Number(e.labourCount) || 0), 0);
  const completedCount = filtered.filter(e => e.status === 'Tally Complete').length;

  const handleExportEntrySheet = () => {
    const formatted = formatEntriesForExport(filtered);
    exportToCSV('Entry_Sheet_Export', formatted);
  };

  const handleExportFMSSheet = () => {
    const formatted = formatFMSForExport(filtered);
    exportToCSV('FMS_Sheet_Export', formatted);
  };

  const handleExportWorkflowSheet = () => {
    const formatted = formatWorkflowForExport(filtered);
    exportToCSV('Workflow_4Stage_Sheet_Export', formatted);
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Reports & Data Export Center
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExportEntrySheet} className="btn btn-outline-green btn-sm">
            <Download size={14} />
            <span>Entry Sheet CSV</span>
          </button>
          <button onClick={handleExportFMSSheet} className="btn btn-outline-green btn-sm">
            <Download size={14} />
            <span>FMS Sheet CSV</span>
          </button>
          <button onClick={handleExportWorkflowSheet} className="btn btn-primary btn-sm">
            <Download size={14} />
            <span>Workflow Sheet CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="card" style={{ marginBottom: 24, padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Date From</label>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Date To</label>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Firm Name</label>
            <select
              className="form-select"
              value={firmFilter}
              onChange={e => setFirmFilter(e.target.value)}
            >
              <option value="">All Firms</option>
              {uniqueFirms.map(firm => (
                <option key={firm} value={firm}>{firm}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Supervisor / Incharge</label>
            <select
              className="form-select"
              value={inchargeFilter}
              onChange={e => setInchargeFilter(e.target.value)}
            >
              <option value="">All Supervisors</option>
              {(masterData.incharges || []).map(inc => (
                <option key={inc} value={inc}>{inc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Status / Stage</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              <option value="Pending Verification">1. Pending Verification</option>
              <option value="Verified (Pending Approval)">2. Verified (Pending Approval)</option>
              <option value="Approved (Pending Payment)">3. Approved (Pending Payment)</option>
              <option value="Paid (Pending Tally)">4. Paid (Pending Tally)</option>
              <option value="Tally Complete">5. Tally Complete</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFirmFilter(''); setInchargeFilter(''); setStatusFilter(''); }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon for filtered results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Work Entries</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{filtered.length}</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Amount</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>
            ₹{totalFilteredAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Labourers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: 2 }}>
            {totalFilteredLabourers} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>persons</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completed Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', marginTop: 2 }}>
            {completedCount} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>completed</span>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Work ID</th>
              <th>Date</th>
              <th>Shift</th>
              <th>Firm</th>
              <th>Incharge</th>
              <th>Work Type</th>
              <th>Count</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Payment Ref</th>
              <th>Tally Voucher</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.workId}>
                <td>
                  <span className="work-id-badge">{item.workId}</span>
                </td>
                <td>{formatDate(item.date)}</td>
                <td>{item.shift || '-'}</td>
                <td>
                  <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '0.78rem' }}>
                    {item.firmName || '-'}
                  </span>
                </td>
                <td>{item.incharge}</td>
                <td>{item.work}</td>
                <td>{item.labourCount}</td>
                <td>₹{Number(item.totalAmount).toLocaleString('en-IN')}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.paymentRef || '-'}</td>
                <td>{item.tallyVoucher || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
