import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Search,
  BookOpen,
  Receipt,
  FileSpreadsheet,
  Users,
  CheckCheck,
  History,
  ListFilter,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { WorkDetailModal } from './WorkDetailModal';

export function TallyPage() {
  const { entries, tallyEntry, syncing } = useApp();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);

  // Pending vs History
  const pendingTally = entries.filter(
    e => e.status === 'Paid (Pending Tally)' || (e.paymentActual && !e.tallyActual)
  );
  const historyTally = entries.filter(
    e => e.status === 'Tally Complete' || Boolean(e.tallyActual)
  );

  const currentList = activeTab === 'pending' ? pendingTally : historyTally;

  const filteredEntries = currentList.filter(item => {
    const matchesSearch =
      item.workId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.paymentRef && item.paymentRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tallyVoucher && item.tallyVoucher.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesIncharge = !inchargeFilter || item.incharge === inchargeFilter;
    const matchesFirm = !firmFilter || item.firmName === firmFilter;
    return matchesSearch && matchesIncharge && matchesFirm;
  });

  const uniqueIncharges = Array.from(new Set(entries.map(e => e.incharge).filter(Boolean)));
  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  const totalAmountPendingTally = pendingTally.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const totalHistoryTallied = historyTally.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const handleOpenTallyModal = entry => {
    setSelectedEntry(entry);
  };

  const handleConfirmTally = async e => {
    e.preventDefault();
    if (!selectedEntry) return;

    const voucherNo = selectedEntry.tallyVoucher || `TL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await tallyEntry(selectedEntry.workId, voucherNo, 'Direct Labour Charges - Operations');
    setSelectedEntry(null);
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Tally Entry
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Pending Tally
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706' }}>
              ₹{totalAmountPendingTally.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({pendingTally.length})</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Tallied History
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              ₹{totalHistoryTallied.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({historyTally.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('pending')}
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <ListFilter size={15} />
          <span>Pending Tally Posting Queue ({pendingTally.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <History size={15} />
          <span>Tally Completed History ({historyTally.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'pending' ? "Search paid orders by Work ID, Supervisor, Firm..." : "Search tally history, voucher number, Firm..."}
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
        </div>
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <FileCheck2 size={32} />
          </div>
          <h3 className="empty-state-title">
            {activeTab === 'pending' ? 'No Entries Pending Tally Voucher' : 'No Tally History Yet'}
          </h3>
          <p className="empty-state-desc">
            {activeTab === 'pending'
              ? 'All paid work orders have been tallied and accounting is 100% complete!'
              : 'Tallied vouchers will appear here.'}
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
                <th>Supervisor</th>
                <th>Work Activity</th>
                <th>Headcount</th>
                <th>Amount</th>
                {activeTab === 'history' && <th>Status</th>}
                <th>Action</th>
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
                    <div style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.work}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{entry.labourCount}</span> persons
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
                        onClick={() => handleOpenTallyModal(entry)}
                        className="btn btn-success btn-sm"
                      >
                        <BookOpen size={14} />
                        <span>Submit Tally</span>
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

      {/* Record Tally Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={`Tally Entry: ${selectedEntry?.workId}`}
        maxWidth="540px"
      >
        {selectedEntry && (
          <form onSubmit={handleConfirmTally}>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px', border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Work ID:</span>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedEntry.workId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Date:</span>
                  <div style={{ fontWeight: 600 }}>{formatDate(selectedEntry.date)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Shift / Firm:</span>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.shift || '-'} • {selectedEntry.firmName || '-'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Supervisor:</span>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.incharge}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Activity & Headcount:</span>
                  <div style={{ fontWeight: 600, color: '#1E293B' }}>{selectedEntry.work} ({selectedEntry.labourCount} persons)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success"
              >
                <CheckCheck size={16} />
                <span>Confirm & Mark Tally Complete</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

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
