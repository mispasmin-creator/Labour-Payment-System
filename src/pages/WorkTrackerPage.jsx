import React, { useState } from 'react';
import {
  TableProperties,
  Search,
  Download,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { WorkDetailModal } from './WorkDetailModal';
import { exportToCSV, formatEntriesForExport } from '../utils/exportUtils';

export function WorkTrackerPage() {
  const { entries } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  // Filter
  const filteredEntries = entries.filter(item => {
    const matchesSearch =
      item.workId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.paymentRef && item.paymentRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tallyVoucher && item.tallyVoucher.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesIncharge = !inchargeFilter || item.incharge === inchargeFilter;
    const matchesFirm = !firmFilter || item.firmName === firmFilter;

    return matchesSearch && matchesStatus && matchesIncharge && matchesFirm;
  });

  const uniqueIncharges = Array.from(new Set(entries.map(e => e.incharge).filter(Boolean)));
  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  const handleExportCSV = () => {
    const formatted = formatEntriesForExport(filteredEntries);
    exportToCSV('Labour_Work_Entries_All', formatted);
  };

  return (
    <div>
      {/* Title Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            All Work Orders Master Grid
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download size={15} />
            <span>Export Filtered ({filteredEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by Work ID, Supervisor, Firm, Work, Voucher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 150 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending Verification">1. Pending Verification</option>
            <option value="Verified (Pending Approval)">2. Verified (Pending Approval)</option>
            <option value="Approved (Pending Payment)">3. Approved (Pending Payment)</option>
            <option value="Paid (Pending Tally)">4. Paid (Pending Tally)</option>
            <option value="Tally Complete">5. Tally Complete</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={firmFilter}
            onChange={e => setFirmFilter(e.target.value)}
          >
            <option value="">All Firms</option>
            {uniqueFirms.map(firm => (
              <option key={firm} value={firm}>{firm}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 150 }}
            value={inchargeFilter}
            onChange={e => setInchargeFilter(e.target.value)}
          >
            <option value="">All Supervisors</option>
            {uniqueIncharges.map(inc => (
              <option key={inc} value={inc}>{inc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <TableProperties size={32} />
          </div>
          <h3 className="empty-state-title">No Work Orders Found</h3>
          <p className="empty-state-desc">
            No entries match your search criteria. Try clearing the filters.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Incharge</th>
                <th>Work Description</th>
                <th>Headcount</th>
                <th>Amount</th>
                <th>Current Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry.workId}>
                  <td>
                    <span className="work-id-badge">{entry.workId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {entry.shift || '-'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '0.78rem' }}>
                      {entry.firmName || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{entry.incharge}</div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.work}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{entry.labourCount}</span> persons
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      ₹{Number(entry.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedWorkId(entry.workId)}
                      className="btn btn-outline-green btn-sm"
                      title="View Work Order Details & Labourers"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWorkId && (
        <WorkDetailModal
          workId={selectedWorkId}
          onClose={() => setSelectedWorkId(null)}
          showLabourNames={true}
        />
      )}
    </div>
  );
}
