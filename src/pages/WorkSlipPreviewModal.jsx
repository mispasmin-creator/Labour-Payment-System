import React, { useState } from 'react';
import { Printer, X, Eye, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { isTonBasedWork } from '../utils/workTypes';
import { formatWorkDate, printWorkSlip } from '../utils/exportUtils';

export default function WorkSlipPreviewModal({ isOpen, onClose, entry }) {
  const [orientation, setOrientation] = useState('portrait');

  if (!isOpen || !entry) return null;

  const count = Number(entry.labourCount) || 1;
  const total = Number(entry.totalAmount) || 0;
  const perPerson = count > 0 ? total / count : 0;

  const isVerified =
    Boolean(
      entry.verificationActual &&
        entry.verificationActual !== '-' &&
        entry.verificationActual !== 'Pending'
    ) ||
    ['Verified', 'Payment Approved', 'Approved', 'Paid', 'Tally Done', 'Completed'].includes(
      entry.status
    );

  const isApproved =
    Boolean(
      entry.approvalActual &&
        entry.approvalActual !== '-' &&
        entry.approvalActual !== 'Pending'
    ) ||
    ['Payment Approved', 'Approved', 'Paid', 'Tally Done', 'Completed'].includes(
      entry.status
    );

  const isPaid =
    Boolean(
      entry.paymentActual &&
        entry.paymentActual !== '-' &&
        entry.paymentActual !== 'Pending'
    ) ||
    ['Paid', 'Tally Done', 'Completed'].includes(entry.status);

  const isLandscape = orientation === 'landscape';

  const handlePrint = () => {
    printWorkSlip(entry, orientation);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Work Order Slip — Live Print Preview"
      maxWidth={isLandscape ? '960px' : '780px'}
    >
      <div>
        {/* Preview Control Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            padding: '10px 14px',
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
              Orientation:
            </span>
            <div style={{ display: 'flex', background: '#E2E8F0', padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isLandscape ? '#FFFFFF' : 'transparent',
                  color: !isLandscape ? '#059669' : '#64748B',
                  boxShadow: !isLandscape ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📄 Portrait (Vertical)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: isLandscape ? '#FFFFFF' : 'transparent',
                  color: isLandscape ? '#059669' : '#64748B',
                  boxShadow: isLandscape ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📑 Landscape (Horizontal)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '7px 16px' }}
            >
              <Printer size={15} />
              <span>Print Work Slip</span>
            </button>
          </div>
        </div>

        {/* Paper Container (Simulates A4 Sheet) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            padding: isLandscape ? '16px 22px' : '18px 20px',
            color: '#1E293B',
            fontFamily: 'Segoe UI, Arial, sans-serif'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #059669',
              paddingBottom: 10,
              marginBottom: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{
                  width: 38,
                  height: 38,
                  objectFit: 'contain',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  padding: 2
                }}
              />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.01em' }}>
                  Labour Payment System - Work Order Slip
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Labour Payment & Verification Summary
                </div>
              </div>
            </div>
            <div>
              <span
                style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: '1px solid #A7F3D0'
                }}
              >
                {entry.status}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 12
            }}
          >
            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Work ID</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{entry.workId}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Work Date</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{formatWorkDate(entry.date)}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Shift Timing</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{entry.shift || '-'}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Firm Name</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{entry.firmName || '-'}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Supervisor / Incharge</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{entry.incharge}</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Work Description</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                {entry.work} ({isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'})
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Hours & Quantity</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                {entry.hours || 0} hrs • {entry.qty || 0} {isTonBasedWork(entry.work) ? 'MT' : 'units'}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Rate</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                ₹{entry.rate} {isTonBasedWork(entry.work) ? '/ Ton' : '/ person'}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Deployed Labourers</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{entry.labourCount} Persons</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Per Person Share</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669' }}>
                ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', background: '#ECFDF5', padding: '8px 12px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: 2 }}>Total Payable Amount</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                ₹{total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Work Remark */}
          <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 10 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Work Remark / Notes</div>
            <div style={{ fontSize: '0.8rem', color: entry.workRemark ? '#0F172A' : '#94A3B8', fontWeight: entry.workRemark ? 500 : 400 }}>
              {entry.workRemark || 'No remark entered'}
            </div>
          </div>

          {/* Deployed Labourers List */}
          <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 12 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
              Deployed Labourers ({entry.labourNames ? entry.labourNames.length : entry.labourCount})
            </div>
            <div>
              {(entry.labourNames && entry.labourNames.length > 0
                ? entry.labourNames
                : Array.from({ length: entry.labourCount }, (_, i) => `Labourer ${i + 1}`)
              ).map((name, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    padding: '2px 7px',
                    borderRadius: 4,
                    margin: '2px 4px 2px 0',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {i + 1}. {name}
                </span>
              ))}
            </div>
          </div>

          {/* Workflow Status Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '12px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#F8FAFC',
                borderRadius: 6,
                border: '1px solid #E2E8F0'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Verification</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 4,
                  color: isVerified ? '#047857' : '#B91C1C',
                  background: isVerified ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${isVerified ? '#A7F3D0' : '#FECACA'}`
                }}
              >
                {isVerified ? 'Yes' : 'No'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#F8FAFC',
                borderRadius: 6,
                border: '1px solid #E2E8F0'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Payment Approval</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 4,
                  color: isApproved ? '#047857' : '#B91C1C',
                  background: isApproved ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${isApproved ? '#A7F3D0' : '#FECACA'}`
                }}
              >
                {isApproved ? 'Yes' : 'No'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#F8FAFC',
                borderRadius: 6,
                border: '1px solid #E2E8F0'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Payment Disbursal</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 4,
                  color: isPaid ? '#047857' : '#B91C1C',
                  background: isPaid ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${isPaid ? '#A7F3D0' : '#FECACA'}`
                }}
              >
                {isPaid ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px dashed #CBD5E1'
            }}
          >
            <div style={{ textAlign: 'center', width: 140, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <div style={{ borderBottom: '1px solid #334155', height: 26, marginBottom: 4 }} />
              <div>Incharge / Supervisor</div>
            </div>
            <div style={{ textAlign: 'center', width: 140, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <div style={{ borderBottom: '1px solid #334155', height: 26, marginBottom: 4 }} />
              <div>Site Verifier</div>
            </div>
            <div style={{ textAlign: 'center', width: 140, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <div style={{ borderBottom: '1px solid #334155', height: 26, marginBottom: 4 }} />
              <div>Accounts Approver</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
