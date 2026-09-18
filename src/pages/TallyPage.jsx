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
  Eye,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { WorkDetailModal } from './WorkDetailModal';
import { isTonBasedWork } from '../utils/workTypes';

export function TallyPage() {
  const { entries, tallyEntry, syncing, canPerformAction } = useApp();
  const canTally = canPerformAction('tally');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      (item.workRemark && item.workRemark.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
    if (!selectedEntry || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const voucherNo = selectedEntry.tallyVoucher || `TL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tallyEntry(selectedEntry.workId, voucherNo, 'Direct Labour Charges - Operations');
      setSelectedEntry(null);
      setActiveTab('history');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <FileCheck2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Tally Entry</h1>
            <p className="text-xs text-slate-500">{pendingTally.length} paid orders awaiting tally voucher</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-white px-4.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs text-right">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Tally
            </div>
            <div className="text-xl font-extrabold text-amber-600">
              ₹{totalAmountPendingTally.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">({pendingTally.length})</span>
            </div>
          </div>

          <div className="bg-white px-4.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs text-right">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tallied History
            </div>
            <div className="text-xl font-extrabold text-emerald-600">
              ₹{totalHistoryTallied.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">({historyTally.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 border-b border-slate-200 pb-2.5 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ListFilter size={15} />
          <span>Pending Tally Posting Queue ({pendingTally.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History size={15} />
          <span>Tally Completed History ({historyTally.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder={activeTab === 'pending' ? "Search paid orders by Work ID, Supervisor, Firm..." : "Search tally history, voucher number, Firm..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all min-w-[140px]"
            value={firmFilter}
            onChange={e => setFirmFilter(e.target.value)}
          >
            <option value="">All Firms</option>
            {uniqueFirms.map(firm => (
              <option key={firm} value={firm}>{firm}</option>
            ))}
          </select>

          <select
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all min-w-[160px]"
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
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-2xs py-16">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <FileCheck2 size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {activeTab === 'pending' ? 'No Entries Pending Tally Voucher' : 'No Tally History Yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 text-center max-w-md">
            {activeTab === 'pending'
              ? 'All paid work orders have been tallied and accounting is 100% complete!'
              : 'Tallied vouchers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work ID</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Shift</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Firm</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Supervisor</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Activity</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Hours</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Qty / Output</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Labourers</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Per Person Amount</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Total Amount</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Remark</th>
                  {activeTab === 'history' && <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Current Status</th>}
                  <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => {
                  const count = Number(entry.labourCount) || 1;
                  const total = Number(entry.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  return (
                    <tr key={entry.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{entry.workId}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800 whitespace-nowrap text-xs">{formatDate(entry.date)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{entry.shift || '-'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          {entry.firmName || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-slate-600 font-medium">{entry.incharge}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-900 text-sm">
                            {entry.work}
                          </div>
                          <div className={`text-[11px] font-bold mt-0.5 ${isTonBasedWork(entry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-600 whitespace-nowrap text-xs">
                          {entry.hours ? `${entry.hours} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 whitespace-nowrap text-xs">
                          {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-bold text-emerald-600 text-xs">{entry.labourCount}</span>{' '}<span className="text-xs text-slate-500">pers</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-extrabold text-emerald-600 text-sm">
                          ₹{total.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className={`max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${entry.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                          title={entry.workRemark || 'No remark'}
                        >
                          {entry.workRemark || '-'}
                        </div>
                      </td>
                      {activeTab === 'history' && (
                        <td className="px-3 py-2.5">
                          <StatusBadge status={entry.status} />
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        {activeTab === 'pending' ? (
                          canTally ? (
                            <button
                              onClick={() => handleOpenTallyModal(entry)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              <BookOpen size={14} />
                              <span>Submit Tally</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setTimelineWorkId(entry.workId)}
                              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => setTimelineWorkId(entry.workId)}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-5">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Work ID:</span>
                  <div className="font-bold text-slate-900">{selectedEntry.workId}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Date:</span>
                  <div className="font-semibold text-slate-800">{formatDate(selectedEntry.date)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Shift / Firm:</span>
                  <div className="font-semibold text-slate-800">{selectedEntry.shift || '-'} • {selectedEntry.firmName || '-'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Supervisor:</span>
                  <div className="font-semibold text-slate-800">{selectedEntry.incharge}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Work Remark:</span>
                  <div className={selectedEntry.workRemark ? 'text-slate-900 font-semibold' : 'text-slate-400 italic'}>
                    {selectedEntry.workRemark || 'No remark provided'}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Activity & Headcount:</span>
                  <div className="font-semibold text-slate-800">
                    {selectedEntry.work}{' '}
                    <span className={`text-xs font-bold ${isTonBasedWork(selectedEntry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      ({isTonBasedWork(selectedEntry.work) ? 'Per Ton' : 'Per Person'})
                    </span>{' '}
                    • {selectedEntry.labourCount} persons
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-800 uppercase font-bold tracking-wider">Total Amount:</span>
                  <div className="text-2xl font-extrabold text-emerald-700">
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Posting Tally & Moving...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck size={16} />
                    <span>Confirm & Mark Tally Complete</span>
                  </>
                )}
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
