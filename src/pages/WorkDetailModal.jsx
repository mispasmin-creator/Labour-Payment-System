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
import { sanitizeLabourersList } from '../services/api';
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
    const rawMaster = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
      ? masterData.labourers
      : ['Dinesh Das Vaishnav', 'Durgesh Kumar', 'Dhanesh Nishad', 'Mahendra Nishad'];
    const masterList = sanitizeLabourersList(rawMaster);
    labourersList = masterList.slice(0, targetCount);
  }

  const labourCount = labourersList.length > 0 ? labourersList.length : targetCount;

  return (
    <>
      <Modal isOpen={Boolean(workId)} onClose={onClose} title={`Work Order Details: ${entry.workId}`} maxWidth="820px">
        <div>
          {/* Top Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px] pb-3.5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-indigo-600 text-base bg-indigo-50 border border-indigo-200 rounded-lg px-3.5 py-1.5">
                {entry.workId}
              </span>
              <StatusBadge status={entry.status} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowPreview(true)}
                title="Preview printable slip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-teal-600 text-white hover:bg-teal-700"
              >
                <Eye size={15} />
                <span>Preview Slip</span>
              </button>
              <button
                onClick={() => printWorkSlip(entry)}
                title="Print Work Slip (select Portrait / Landscape in print dialog)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Printer size={15} />
                <span>Print Work Slip</span>
              </button>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="mb-5">
            <div
              className={`rounded-xl border p-4 flex items-center justify-between flex-wrap gap-2.5 ${
                isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workflow Stage</div>
                <div className="font-extrabold text-sm text-slate-900 mt-0.5">Verification</div>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border ${
                  isVerified
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                    : 'text-amber-700 bg-amber-100 border-amber-200'
                }`}
              >
                {isVerified ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                <span>{isVerified ? 'Verified' : 'Pending Verification'}</span>
              </div>
            </div>
          </div>

          {/* Work Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Shift & Date
              </div>
              <div className="font-bold text-base text-slate-900">
                {formatDate(entry.date)}
              </div>
              <div className="text-sm text-indigo-600 font-semibold">
                {entry.shift || '-'}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Firm Name
              </div>
              <div className="font-bold text-base text-slate-900">
                {entry.firmName || '-'}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Supervisor / Incharge
              </div>
              <div className="font-bold text-base text-slate-900">
                {entry.incharge}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Work Activity
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-900">
                  {entry.work}
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                    isTonBasedWork(entry.work)
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  }`}
                >
                  {isTonBasedWork(entry.work) ? 'Qty in Tons' : 'Per Person'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {entry.hours} hrs &bull; {entry.qty} {isTonBasedWork(entry.work) ? 'Tons' : 'units'}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                Per Person Share
              </div>
              <div className="font-extrabold text-2xl text-emerald-700">
                &#8377;{((Number(entry.totalAmount) || 0) / (labourCount || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                Total Payable Amount
              </div>
              <div className="font-extrabold text-2xl text-emerald-700">
                &#8377;{Number(entry.totalAmount).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Work Remark Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Work Remark / Description
            </div>
            <div className={`text-sm ${entry.workRemark ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {entry.workRemark || 'No remark provided for this work order.'}
            </div>
          </div>

          {/* Assigned Labourers List (Only shown in Verification step) */}
          {showLabourNames && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Users size={18} className="text-indigo-600" />
                  <span>Assigned Labourers ({labourCount} {labourCount === 1 ? 'Person' : 'Persons'})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {labourersList.map((name, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-slate-800">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5"
            >
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
