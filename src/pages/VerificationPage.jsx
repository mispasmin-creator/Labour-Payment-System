import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  Eye,
  History,
  ListFilter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { WorkDetailModal } from './WorkDetailModal';

export function VerificationPage() {
  const { entries, masterData, verifyEntry, syncing } = useApp();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [remarks, setRemarks] = useState('');

  const getModalLabourers = entry => {
    if (!entry) return [];
    let list = [];
    if (Array.isArray(entry.labourNames) && entry.labourNames.length > 0) {
      list = entry.labourNames.filter(Boolean);
    } else if (typeof entry.labourNames === 'string' && entry.labourNames.trim()) {
      list = entry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    }

    if (list.length === 0) {
      Object.keys(entry).forEach(k => {
        const lower = k.toLowerCase();
        if (lower.startsWith('labour') && lower !== 'labourcount' && lower !== 'labournames') {
          if (entry[k] && typeof entry[k] === 'string' && entry[k].trim()) {
            list.push(entry[k].trim());
          }
        }
      });
    }

    const count = Number(entry.labourCount) || (list.length > 0 ? list.length : 1);
    if (list.length === 0 && count > 0) {
      const masterList = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
        ? masterData.labourers
        : [
            'Dinesh Das Vaishnav',
            'Durgesh Kumar',
            'Dhanesh Nishad',
            'Mahendra Nishad',
            'Omprakash Nishad',
            'Ranglal Nishad',
            'Bhuneshwar Nishad',
            'Baliram Nishad',
            'Girdhar Kumar Nishad',
            'Hitesh Kumar Nishad'
          ];
      list = masterList.slice(0, count);
    }
    return list;
  };

  // Pending vs History
  const pendingEntries = entries.filter(
    e => e.status === 'Pending Verification' || (!e.verificationActual && !e.approvalActual && !e.paymentActual && !e.tallyActual)
  );
  const historyEntries = entries.filter(
    e => ['Verified (Pending Approval)', 'Approved (Pending Payment)', 'Approved', 'Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.verificationActual)
  );

  const currentList = activeTab === 'pending' ? pendingEntries : historyEntries;

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

  const handleOpenVerifyModal = entry => {
    setSelectedEntry(entry);
    setRemarks('');
  };

  const handleConfirmVerify = async () => {
    if (!selectedEntry) return;
    await verifyEntry(selectedEntry.workId, remarks);
    setSelectedEntry(null);
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Work Verification Center
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Pending
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706' }}>
              {pendingEntries.length}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Verified History
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              {historyEntries.length}
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
          <span>Pending Verification Queue ({pendingEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <History size={15} />
          <span>Verification History ({historyEntries.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'pending' ? "Search pending entries by Work ID, Supervisor, Firm..." : "Search verification history..."}
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

      {/* Table / Queue */}
      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShieldCheck size={32} />
          </div>
          <h3 className="empty-state-title">
            {activeTab === 'pending' ? 'No Entries Pending Verification' : 'No Verification History Yet'}
          </h3>
          <p className="empty-state-desc">
            {activeTab === 'pending'
              ? 'All work entries have been verified and advanced to Stage 2.'
              : 'Completed verification records will appear here with full timestamps and audit trail.'}
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
                <th>Work Activity</th>
                <th>Labourers</th>
                <th>Amount</th>
                {activeTab === 'history' && <th>Current Status</th>}
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
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
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
                        onClick={() => handleOpenVerifyModal(entry)}
                        className="btn btn-primary btn-sm"
                      >
                        <ShieldCheck size={14} />
                        <span>Verify Work</span>
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

      {/* Verification Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={`Verify Work Entry: ${selectedEntry?.workId}`}
        maxWidth="620px"
      >
        {selectedEntry && (
          <div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px', border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Supervisor:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>{selectedEntry.incharge}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Firm Name:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>{selectedEntry.firmName || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Date:</span>{' '}
                  <strong>{formatDate(selectedEntry.date)} ({selectedEntry.shift})</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Work Type:</span>{' '}
                  <strong>{selectedEntry.work}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Labour Count:</span>{' '}
                  <strong>{selectedEntry.labourCount} persons (₹{selectedEntry.rate}/person)</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Hours & Qty:</span>{' '}
                  <strong>{selectedEntry.hours} hrs / {selectedEntry.qty} units</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Total Payable:</span>{' '}
                  <strong style={{ color: '#059669', fontSize: '1.05rem' }}>
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Labourers list */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>
                  Assigned Labourers ({getModalLabourers(selectedEntry).length} Persons)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {getModalLabourers(selectedEntry).map((name, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#059669', color: '#FFFFFF', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {i + 1}
                      </span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Verifier Remarks (Optional)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="e.g. Work inspected on site, labour headcount verified."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                className="btn btn-primary"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Mark Verified</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Details Modal */}
      {timelineWorkId && (
        <WorkDetailModal
          workId={timelineWorkId}
          onClose={() => setTimelineWorkId(null)}
          showLabourNames={true}
        />
      )}
    </div>
  );
}
