import React from 'react';
import { Check, ShieldCheck, CheckCircle2, CreditCard, FileCheck2 } from 'lucide-react';
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
    <div className="flex flex-col md:flex-row items-stretch gap-4 my-6">
      {stages.map(st => {
        const Icon = st.icon;

        return (
          <div
            key={st.num}
            className={`flex-1 rounded-xl border p-4 flex flex-col justify-between transition-all ${
              st.isCompleted
                ? 'border-emerald-200 bg-emerald-50/40'
                : st.isActive
                ? 'border-indigo-300 bg-white shadow-md shadow-indigo-100'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      st.isCompleted
                        ? 'bg-emerald-500 text-white'
                        : st.isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {st.isCompleted ? <Check size={16} /> : st.num}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{st.title}</div>
                    <div className="text-[11px] text-slate-500">Stage {st.num} of 4</div>
                  </div>
                </div>

                <Icon
                  size={20}
                  className={st.isCompleted ? 'text-emerald-500' : st.isActive ? 'text-indigo-600' : 'text-slate-300'}
                />
              </div>

              {st.details && (
                <div className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded mb-2">
                  {st.details}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold text-slate-500">Planned Date:</span>
                <span className="font-mono text-slate-800">{formatDateTime(st.planned)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold text-slate-500">Actual Date:</span>
                <span className="font-mono text-slate-800">
                  {st.actual ? formatDateTime(st.actual) : <span className="text-amber-600">Pending</span>}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600 mt-0.5">
                <span className="font-semibold text-slate-500">Stage Delay:</span>
                <DelayBadge plannedDate={st.planned} actualDate={st.actual} storedDelay={st.delay} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
