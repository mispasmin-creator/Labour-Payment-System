import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  IndianRupee,
  Layers,
  Sparkles,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import {
  exportToCSV,
  formatEntriesForExport,
  formatFMSForExport
} from '../utils/exportUtils';
import { isTonBasedWork } from '../utils/workTypes';

export function ReportsPage() {
  const navigate = useNavigate();
  const { entries, masterData, refreshData, syncing } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  // Filtered entries
  const filtered = entries.filter(item => {
    if (dateFrom && new Date(item.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(item.date) > new Date(dateTo)) return false;
    if (firmFilter && item.firmName !== firmFilter) return false;
    if (inchargeFilter && item.incharge !== inchargeFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  const totalFilteredAmount = filtered.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalFilteredLabourers = filtered.reduce((sum, item) => sum + (Number(item.labourCount) || 0), 0);
  const completedCount = filtered.filter(item => item.status === 'Tally Complete').length;

  const handleExportEntrySheet = () => {
    const formatted = formatEntriesForExport(filtered);
    exportToCSV('Entry_Sheet_Export', formatted);
  };

  const handleExportFMSSheet = () => {
    const formatted = formatFMSForExport(filtered);
    exportToCSV('FMS_Sheet_Export', formatted);
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/reports/incharge-wise')}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              fontWeight: 800
            }}
            title="Open Dedicated Incharge Wise Labour MIS Analytics & Report"
          >
            <Users size={16} />
            <span>👥 Incharge Wise Report</span>
          </button>

          <button
            onClick={refreshData}
            disabled={syncing}
            className="btn btn-outline-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Sync Data"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button onClick={handleExportEntrySheet} className="btn btn-outline-green btn-sm">
            <Download size={14} />
            <span>Entry Sheet CSV</span>
          </button>
          <button onClick={handleExportFMSSheet} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>FMS Sheet CSV</span>
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
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified (Pending Approval)">Verified (Pending Approval)</option>
              <option value="Approved (Pending Payment)">Approved (Pending Payment)</option>
              <option value="Paid (Pending Tally)">Paid (Pending Tally)</option>
              <option value="Tally Complete">Tally Complete</option>
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
              <th>Work Hours</th>
              <th>Qty / Output</th>
              <th>Labourers</th>
              <th>Per Person Amount</th>
              <th>Total Amount</th>
              <th>Work Remark</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const count = Number(item.labourCount) || 1;
                const total = Number(item.totalAmount) || 0;
                const perPerson = count > 0 ? (total / count) : 0;
                return (
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
                    <td>
                      <div style={{ maxWidth: 200 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                          {item.work}
                        </div>
                        <div style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: isTonBasedWork(item.work) ? '#059669' : '#2563EB',
                          marginTop: 2
                        }}>
                          {isTonBasedWork(item.work) ? '⚖️ Per Ton' : '👤 Per Person'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                        {item.hours ? `${item.hours} hrs` : '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                        {item.qty !== undefined && item.qty !== '' ? `${item.qty} ${isTonBasedWork(item.work) ? 'MT' : 'units'}` : '-'}
                      </div>
                    </td>
                    <td>{item.labourCount}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#059669' }}>
                        ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>
                        ₹{total.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          maxWidth: 160,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: item.workRemark ? '#334155' : '#94A3B8',
                          fontStyle: item.workRemark ? 'normal' : 'italic'
                        }}
                        title={item.workRemark || 'No remark'}
                      >
                        {item.workRemark || '-'}
                      </div>
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                );
              }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
