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

  const isLandscape = orientation === 'landscape';

  const handlePrint = () => {
    printWorkSlip(entry, orientation);
  };

  const detailCellClass = 'bg-slate-50 rounded-md border border-slate-200 px-2.5 py-2';
  const detailLabelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5';
  const detailValueClass = 'text-sm font-bold text-slate-900';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Work Order Slip — Live Print Preview"
      maxWidth={isLandscape ? '960px' : '780px'}
    >
      <div>
        {/* Preview Control Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 px-3.5 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">
              Orientation:
            </span>
            <div className="flex bg-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  !isLandscape ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                Portrait (Vertical)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isLandscape ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                Landscape (Horizontal)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
            >
              <Printer size={15} />
              <span>Print Work Slip</span>
            </button>
          </div>
        </div>

        {/* Paper Container (Simulates A4 Sheet) */}
        <div
          className={`bg-white rounded-lg border border-slate-300 shadow-md text-slate-800 ${
            isLandscape ? 'px-[22px] py-4' : 'px-5 py-[18px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-2.5 mb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-9 h-9 object-contain rounded-md border border-slate-200 p-0.5"
              />
              <div>
                <div className="text-lg font-extrabold text-indigo-600 tracking-tight">
                  Labour Payment System - Work Order Slip
                </div>
                <div className="text-xs text-slate-500">
                  Labour Payment & Verification Summary
                </div>
              </div>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs border ${
                  isVerified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className={detailCellClass}>
              <div className={detailLabelClass}>Work ID</div>
              <div className={detailValueClass}>{entry.workId}</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Work Date</div>
              <div className={detailValueClass}>{formatWorkDate(entry.date)}</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Shift Timing</div>
              <div className={detailValueClass}>{entry.shift || '-'}</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Firm Name</div>
              <div className={detailValueClass}>{entry.firmName || '-'}</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Supervisor / Incharge</div>
              <div className={detailValueClass}>{entry.incharge}</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Work Description</div>
              <div className={detailValueClass}>
                {entry.work} ({isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'})
              </div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Hours & Quantity</div>
              <div className={detailValueClass}>
                {entry.hours || 0} hrs &bull; {entry.qty || 0} {isTonBasedWork(entry.work) ? 'MT' : 'units'}
              </div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Rate</div>
              <div className={detailValueClass}>
                &#8377;{entry.rate} {isTonBasedWork(entry.work) ? '/ Ton' : '/ person'}
              </div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Deployed Labourers</div>
              <div className={detailValueClass}>{entry.labourCount} Persons</div>
            </div>

            <div className={detailCellClass}>
              <div className={detailLabelClass}>Per Person Share</div>
              <div className="text-sm font-extrabold text-emerald-600">
                &#8377;{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-0.5">Total Payable Amount</div>
              <div className="text-lg font-extrabold text-emerald-700">
                &#8377;{total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Work Remark */}
          <div className={`${detailCellClass} mb-2.5`}>
            <div className={detailLabelClass}>Work Remark / Notes</div>
            <div className={`text-sm ${entry.workRemark ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {entry.workRemark || 'No remark entered'}
            </div>
          </div>

          {/* Deployed Labourers List */}
          <div className={`${detailCellClass} mb-3`}>
            <div className={`${detailLabelClass} mb-1`}>
              Deployed Labourers ({entry.labourNames ? entry.labourNames.length : entry.labourCount})
            </div>
            <div>
              {(entry.labourNames && entry.labourNames.length > 0
                ? entry.labourNames
                : Array.from({ length: entry.labourCount }, (_, i) => `Labourer ${i + 1}`)
              ).map((name, i) => (
                <span
                  key={i}
                  className="inline-block bg-white border border-slate-300 text-slate-900 rounded px-1.5 py-0.5 mr-1 mb-1 text-xs font-semibold"
                >
                  {i + 1}. {name}
                </span>
              ))}
            </div>
          </div>

          {/* Verification Status Strip */}
          <div className="mb-3">
            <div
              className={`flex items-center justify-between px-3.5 py-2 rounded-md border ${
                isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <span className="text-sm font-bold text-slate-700">Verification</span>
              <span
                className={`text-sm font-extrabold px-2.5 py-0.5 rounded border ${
                  isVerified
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}
              >
                {isVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex flex-wrap justify-between gap-3 mt-5 pt-3 border-t border-dashed border-slate-300">
            <div className="flex-1 min-w-[100px] max-w-[160px] text-center text-xs font-semibold text-slate-600">
              <div className="border-b border-slate-800 h-6 mb-1" />
              <div>Incharge / Supervisor</div>
            </div>
            <div className="flex-1 min-w-[100px] max-w-[160px] text-center text-xs font-semibold text-slate-600">
              <div className="border-b border-slate-800 h-6 mb-1" />
              <div>Site Verifier</div>
            </div>
            <div className="flex-1 min-w-[100px] max-w-[160px] text-center text-xs font-semibold text-slate-600">
              <div className="border-b border-slate-800 h-6 mb-1" />
              <div>Accounts Approver</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
