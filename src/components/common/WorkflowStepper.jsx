import React from 'react';
import { Check, Clock, AlertTriangle, ShieldCheck, CheckCircle2, CreditCard, FileCheck2 } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';
import { DelayBadge } from './DelayBadge';

export function WorkflowStepper({ entry }) {
  if (!entry) return null;

  const stages = [
    {
      num: 1,
      title: 'Verification',
      icon: ShieldCheck,
      planned: entry.verificationPlanned,
      actual: entry.verificationActual,
      delay: entry.verificationDelay,
      details: entry.verificationRemarks ? `Remarks: ${entry.verificationRemarks}` : null,
      isCompleted: Boolean(entry.verificationActual),
      isActive: entry.status === 'Pending Verification'
    },
    {
      num: 2,
      title: 'Payment Approval',
      icon: CheckCircle2,
      planned: entry.approvalPlanned,
      actual: entry.approvalActual,
      delay: entry.approvalDelay,
      details: null,
      isCompleted: Boolean(entry.approvalActual),
      isActive: entry.status === 'Verified (Pending Approval)'
    },
    {
      num: 3,
      title: 'Payment Disbursal',
      icon: CreditCard,
      planned: entry.paymentPlanned,
      actual: entry.paymentActual,
      delay: entry.paymentDelay,
      details: entry.paymentRef ? `Ref/UTR: ${entry.paymentRef}` : entry.paymentMethod || null,
      isCompleted: Boolean(entry.paymentActual),
      isActive: entry.status === 'Approved (Pending Payment)'
    },
    {
      num: 4,
      title: 'Tally Entry',
      icon: FileCheck2,
      planned: entry.tallyPlanned,
      actual: entry.tallyActual,
      delay: entry.tallyDelay,
      details: entry.tallyVoucher ? `Voucher: ${entry.tallyVoucher}` : null,
      isCompleted: Boolean(entry.tallyActual),
      isActive: entry.status === 'Paid (Pending Tally)'
    }
  ];

  return (
    <div className="stepper-container">
      {stages.map((st, idx) => {
        const Icon = st.icon;
        let cardClass = 'stepper-stage-card';
        if (st.isCompleted) cardClass += ' completed';
        else if (st.isActive) cardClass += ' active';

        return (
          <div key={st.num} className={cardClass}>
            <div>
              <div className="stepper-stage-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="stage-number-bubble">
                    {st.isCompleted ? <Check size={16} /> : st.num}
                  </div>
                  <div>
                    <div className="stage-title">{st.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Stage {st.num} of 4
                    </div>
                  </div>
                </div>

                <div style={{ color: st.isCompleted ? '#10B981' : st.isActive ? '#059669' : '#94A3B8' }}>
                  <Icon size={20} />
                </div>
              </div>

              {st.details && (
                <div style={{
                  fontSize: '0.78rem',
                  background: '#F0FDF4',
                  border: '1px solid #D1FAE5',
                  color: '#065F46',
                  padding: '4px 8px',
                  borderRadius: 6,
                  marginBottom: 8
                }}>
                  {st.details}
                </div>
              )}
            </div>

            <div className="stage-date-row">
              <div className="stage-date-item">
                <span className="label">Planned Date:</span>
                <span className="val">{formatDateTime(st.planned)}</span>
              </div>

              <div className="stage-date-item">
                <span className="label">Actual Date:</span>
                <span className="val">
                  {st.actual ? formatDateTime(st.actual) : <span style={{ color: '#F59E0B' }}>Pending</span>}
                </span>
              </div>

              <div className="stage-date-item" style={{ marginTop: 4 }}>
                <span className="label">Stage Delay:</span>
                <DelayBadge plannedDate={st.planned} actualDate={st.actual} storedDelay={st.delay} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
