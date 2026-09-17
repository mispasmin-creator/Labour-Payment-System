import React, { useState } from 'react';
import {
  Printer,
  Calendar,
  Clock,
  User,
  Briefcase,
  IndianRupee,
  Users,
  Building2,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { printWorkSlip } from '../utils/exportUtils';
import { isTonBasedWork } from '../utils/workTypes';
import WorkSlipPreviewModal from './WorkSlipPreviewModal';

export function WorkDetailModal({ workId, onClose, showLabourNames = true }) {
  const { entries, masterData } = useApp();
  const [showPreview, setShowPreview] = useState(false);
  const entry = entries.find(e => e.workId === workId);

  if (!entry) return null;

  // Verification Status Check
  const isVerified =
    Boolean(
      entry.verificationActual &&
        entry.verificationActual !== '-' &&
        entry.verificationActual !== 'Pending'
    ) ||
    ['Verified', 'Payment Approved', 'Approved', 'Paid', 'Tally Done', 'Completed'].includes(
      entry.status
    );

  // Extract all labour names safely
  let labourersList = [];
  if (Array.isArray(entry.labourNames) && entry.labourNames.length > 0) {
    labourersList = entry.labourNames.filter(Boolean);
  } else if (typeof entry.labourNames === 'string' && entry.labourNames.trim()) {
    labourersList = entry.labourNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  }

  // If empty, check dynamic labour properties (labour1, Labour 1, etc.)
  if (labourersList.length === 0) {
    Object.keys(entry).forEach(k => {
      const lower = k.toLowerCase();
      if (lower.startsWith('labour') && lower !== 'labourcount' && lower !== 'labournames') {
        if (entry[k] && typeof entry[k] === 'string' && entry[k].trim()) {
          labourersList.push(entry[k].trim());
        }
      }
    });
  }

  // Fallback to master names if count exists
  const targetCount = Number(entry.labourCount) || (labourersList.length > 0 ? labourersList.length : 1);
  if (labourersList.length === 0 && targetCount > 0) {
    const masterList = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
      ? masterData.labourers
      : ['Dinesh Das Vaishnav', 'Durgesh Kumar', 'Dhanesh Nishad', 'Mahendra Nishad'];
    labourersList = masterList.slice(0, targetCount);
  }

  const labourCount = labourersList.length > 0 ? labourersList.length : targetCount;

  return (
    <>
      <Modal isOpen={Boolean(workId)} onClose={onClose} title={`Work Order Details: ${entry.workId}`} maxWidth="820px">
        <div>
          {/* Top Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="work-id-badge" style={{ fontSize: '1.1rem', padding: '6px 14px' }}>
                {entry.workId}
              </span>
              <StatusBadge status={entry.status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPreview(true)}
                className="btn btn-teal btn-sm"
                title="Preview printable slip"
                style={{ fontWeight: 700 }}
              >
                <Eye size={15} />
                <span>Preview Slip</span>
              </button>
              <button
                onClick={() => printWorkSlip(entry)}
                className="btn btn-outline-green btn-sm"
                title="Print Work Slip (select Portrait / Landscape in print dialog)"
                style={{ fontWeight: 700 }}
              >
                <Printer size={15} />
                <span>Print Work Slip</span>
              </button>
            </div>
          </div>

        {/* Verification Status Card */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            background: isVerified ? '#ECFDF5' : '#FFFBEB',
            border: `1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'}`,
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Workflow Stage</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginTop: 2 }}>Verification</div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: isVerified ? '#047857' : '#B45309', background: isVerified ? '#D1FAE5' : '#FEF3C7', padding: '5px 12px', borderRadius: 6, border: `1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'}` }}>
              {isVerified ? <CheckCircle2 size={15} /> : <Clock size={15} />}
              <span>{isVerified ? 'Verified' : 'Pending Verification'}</span>
            </div>
          </div>
        </div>

        {/* Work Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
              Shift & Date
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              {formatDate(entry.date)}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
              {entry.shift || '-'}
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
              Firm Name
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              {entry.firmName || '-'}
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
              Supervisor / Incharge
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              {entry.incharge}
            </div>
          </div>

          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
              Work Activity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                {entry.work}
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isTonBasedWork(entry.work) ? '#059669' : '#2563EB',
                background: isTonBasedWork(entry.work) ? '#ECFDF5' : '#EFF6FF',
                padding: '1px 6px',
                borderRadius: 4,
                border: `1px solid ${isTonBasedWork(entry.work) ? '#A7F3D0' : '#BFDBFE'}`
              }}>
                {isTonBasedWork(entry.work) ? '⚖️ Per Ton' : '👤 Per Person'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>
              {entry.hours} hrs • {entry.qty} {isTonBasedWork(entry.work) ? 'Tons' : 'units'}
            </div>
          </div>

          <div className="card" style={{ padding: '14px', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: 4 }}>
              Per Person Share
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#059669' }}>
              ₹{((Number(entry.totalAmount) || 0) / (labourCount || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="card" style={{ padding: '14px', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: 4 }}>
              Total Payable Amount
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#047857' }}>
              ₹{Number(entry.totalAmount).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Work Remark Display */}
        <div className="card" style={{ marginBottom: 16, padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
            Work Remark / Description
          </div>
          <div style={{ fontSize: '0.92rem', color: entry.workRemark ? '#1E293B' : '#94A3B8', fontStyle: entry.workRemark ? 'normal' : 'italic' }}>
            {entry.workRemark || 'No remark provided for this work order.'}
          </div>
        </div>

        {/* Assigned Labourers List (Only shown in Verification step) */}
        {showLabourNames && (
          <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0F172A' }}>
                <Users size={18} color="#059669" />
                <span>Assigned Labourers ({labourCount} {labourCount === 1 ? 'Person' : 'Persons'})</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {labourersList.map((name, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1E293B' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Live Print Preview Modal */}
      {showPreview && (
        <WorkSlipPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          entry={entry}
        />
      )}
    </>
  );
}
