import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Users,
  Briefcase,
  History,
  ListFilter,
  Eye,
  Receipt,
  Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkDetailModal } from './WorkDetailModal';
import { Modal } from '../components/common/Modal';

export function PaymentPage() {
  const { entries, payEntry, syncing } = useApp();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);

  // Pending vs History
  const pendingPayment = entries.filter(
    e => e.status === 'Approved (Pending Payment)' || (e.approvalActual && !e.paymentActual && !e.tallyActual)
  );
  const historyPayment = entries.filter(
    e => ['Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.paymentActual)
  );

  const currentList = activeTab === 'pending' ? pendingPayment : historyPayment;

  const filteredEntries = currentList.filter(item => {
    const matchesSearch =
      item.workId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesIncharge = !inchargeFilter || item.incharge === inchargeFilter;
    const matchesFirm = !firmFilter || item.firmName === firmFilter;
    return matchesSearch && matchesIncharge && matchesFirm;
  });

  const uniqueIncharges = Array.from(new Set(entries.map(e => e.incharge).filter(Boolean)));
  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  const totalAmountToDisburse = pendingPayment.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const totalHistoryDisbursed = historyPayment.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const handleOpenPayModal = entry => {
    setSelectedEntry(entry);
  };

  const handleConfirmPayment = async e => {
    e.preventDefault();
    if (!selectedEntry) return;

    await payEntry(selectedEntry.workId, 'Direct Payment', '');
    setSelectedEntry(null);
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Payment Disbursal
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Pending Disbursal
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0D9488' }}>
              ₹{totalAmountToDisburse.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({pendingPayment.length})</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Disbursed History
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              ₹{totalHistoryDisbursed.toLocaleString('en-IN')} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({historyPayment.length})</span>
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
          <span>Pending Disbursal Queue ({pendingPayment.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <History size={15} />
          <span>Disbursal History ({historyPayment.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'pending' ? "Search pending payment orders by Work ID, Supervisor, Firm..." : "Search payment history, Supervisor, Firm..."}
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
          <div className="empty-state-icon" style={{ background: '#CCFBF1', color: '#0D9488' }}>
            <CreditCard size={32} />
          </div>
          <h3 className="empty-state-title">
            {activeTab === 'pending' ? 'No Entries Pending Payment' : 'No Payment History Yet'}
          </h3>
          <p className="empty-state-desc">
            {activeTab === 'pending'
              ? 'All approved entries have been paid and queued for Stage 4 (Tally Entry).'
              : 'Paid records will appear here.'}
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
                <th>Amount Payable</th>
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
                    <div style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.work}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#059669" />
                      <span style={{ fontWeight: 700 }}>{entry.labourCount}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#0D9488', fontSize: '1.05rem' }}>
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
                        onClick={() => handleOpenPayModal(entry)}
                        className="btn btn-teal btn-sm"
                      >
                        <Receipt size={14} />
                        <span>Record Payment</span>
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

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={`Confirm Payment for ${selectedEntry?.workId}`}
        maxWidth="540px"
      >
        {selectedEntry && (
          <form onSubmit={handleConfirmPayment}>
            <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '16px', border: '1px solid #BBF7D0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>Total Amount Disbursing</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857' }}>
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#334155' }}>
                  <div><strong>{selectedEntry.labourCount}</strong> Labourers</div>
                  <div>Supervisor: <strong>{selectedEntry.incharge}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '14px', border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Date:</span>{' '}
                  <strong>{formatDate(selectedEntry.date)} ({selectedEntry.shift})</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Firm Name:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>{selectedEntry.firmName || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Work Activity:</span>{' '}
                  <strong>{selectedEntry.work}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Rate:</span>{' '}
                  <strong>₹{selectedEntry.rate} / person</strong>
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
                className="btn btn-teal"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Mark as Paid</span>
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
