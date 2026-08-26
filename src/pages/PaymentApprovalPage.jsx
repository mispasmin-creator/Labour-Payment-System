import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Search,
  CheckCheck,
  IndianRupee,
  Users,
  Clock,
  Briefcase,
  History,
  ListFilter,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkDetailModal } from './WorkDetailModal';

export function PaymentApprovalPage() {
  const { entries, approveEntry, approveBatch, syncing } = useApp();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [timelineWorkId, setTimelineWorkId] = useState(null);

  // Pending vs History
  const pendingApproval = entries.filter(
    e => e.status === 'Verified (Pending Approval)' || (e.verificationActual && !e.approvalActual && !e.paymentActual && !e.tallyActual)
  );
  const historyApproval = entries.filter(
    e => ['Approved (Pending Payment)', 'Approved', 'Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.approvalActual)
  );

  const currentList = activeTab === 'pending' ? pendingApproval : historyApproval;

  const filteredEntries = currentList.filter(item => {
    const matchesSearch =
      item.workId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.workRemark && item.workRemark.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesIncharge = !inchargeFilter || item.incharge === inchargeFilter;
    const matchesFirm = !firmFilter || item.firmName === firmFilter;
    return matchesSearch && matchesIncharge && matchesFirm;
  });

  const uniqueIncharges = Array.from(new Set(entries.map(e => e.incharge).filter(Boolean)));
  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  const totalAmountToApprove = pendingApproval.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const totalHistoryApproved = historyApproval.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.workId));
    }
  };

  const toggleSelectOne = workId => {
    if (selectedIds.includes(workId)) {
      setSelectedIds(selectedIds.filter(id => id !== workId));
    } else {
      setSelectedIds([...selectedIds, workId]);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    await approveBatch(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Payment Approval Center
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Pending Approval
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4F46E5' }}>
              ₹{totalAmountToApprove.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({pendingApproval.length})</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Approved History
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              ₹{totalHistoryApproved.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({historyApproval.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
        <button
          onClick={() => {
            setActiveTab('pending');
            setSelectedIds([]);
          }}
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <ListFilter size={15} />
          <span>Pending Approval Queue ({pendingApproval.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setSelectedIds([]);
          }}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <History size={15} />
          <span>Approval History ({historyApproval.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'pending' ? "Search pending approvals by Work ID, Supervisor, Firm..." : "Search approval history..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
            style={{ width: 'auto', minWidth: 160 }}
            value={inchargeFilter}
            onChange={e => setInchargeFilter(e.target.value)}
          >
            <option value="">All Supervisors</option>
            {uniqueIncharges.map(inc => (
              <option key={inc} value={inc}>{inc}</option>
            ))}
          </select>

          {activeTab === 'pending' && selectedIds.length > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={selectedIds.length === 0}
              className="btn btn-indigo"
            >
              <CheckCheck size={16} />
              <span>Approve Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* List / Table */}
      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 className="empty-state-title">
            {activeTab === 'pending' ? 'No Entries Pending Payment Approval' : 'No Approval History Yet'}
          </h3>
          <p className="empty-state-desc">
            {activeTab === 'pending'
              ? 'All verified entries have been approved and moved to Stage 3.'
              : 'Approved work orders will appear here with full timestamps and approval audit trail.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {activeTab === 'pending' && (
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th>Work ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Supervisor</th>
                <th>Work Activity</th>
                <th>Work Remark</th>
                <th>Headcount</th>
                <th>Total Amount</th>
                {activeTab === 'history' && <th>Current Status</th>}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry.workId}>
                  {activeTab === 'pending' && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.workId)}
                        onChange={() => toggleSelectOne(entry.workId)}
                      />
                    </td>
                  )}
                  <td>
                    <span className="work-id-badge">{entry.workId}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.shift || '-'}</span>
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
                    <div style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.work}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: 160,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: entry.workRemark ? '#334155' : '#94A3B8',
                        fontStyle: entry.workRemark ? 'normal' : 'italic'
                      }}
                      title={entry.workRemark || 'No remark'}
                    >
                      {entry.workRemark || '-'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#059669" />
                      <span style={{ fontWeight: 700 }}>{entry.labourCount}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                      ₹{Number(entry.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  {activeTab === 'history' && (
                    <td>
                      <StatusBadge status={entry.status} />
                    </td>
                  )}
                  <td>
                    {activeTab === 'pending' ? (
                      <button
                        onClick={() => approveEntry(entry.workId)}
                        className="btn btn-indigo btn-sm"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setTimelineWorkId(entry.workId)}
                        className="btn btn-outline-green btn-sm"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {timelineWorkId && (
        <WorkDetailModal
          workId={timelineWorkId}
          onClose={() => setTimelineWorkId(null)}
          showLabourNames={false}
        />
      )}
    </div>
  );
}
