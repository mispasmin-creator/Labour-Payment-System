import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Users,
  User,
  Scale,
  Briefcase,
  History,
  ListFilter,
  Eye,
  Receipt,
  Building2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkDetailModal } from './WorkDetailModal';
import { Modal } from '../components/common/Modal';
import { isTonBasedWork, formatEntryRate } from '../utils/workTypes';

export function PaymentPage() {
  const { entries, payEntry, syncing, canPerformAction } = useApp();
  const canDisburse = canPerformAction('payment');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.workRemark && item.workRemark.toLowerCase().includes(searchTerm.toLowerCase()));
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
    if (!selectedEntry || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await payEntry(selectedEntry.workId, 'Direct Payment', '');
      setSelectedEntry(null);
      setActiveTab('history');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabBtnClass = active =>
    `inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
      active
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Payment Disbursal</h1>
            <p className="text-xs text-slate-500">
              {activeTab === 'pending'
                ? `${pendingPayment.length} order${pendingPayment.length === 1 ? '' : 's'} pending disbursal`
                : `${historyPayment.length} disbursed record${historyPayment.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2 text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Disbursal</div>
            <div className="text-lg font-extrabold text-amber-600">
              ₹{totalAmountToDisburse.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-medium text-slate-500">({pendingPayment.length})</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2 text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Disbursed History</div>
            <div className="text-lg font-extrabold text-emerald-600">
              ₹{totalHistoryDisbursed.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-medium text-slate-500">({historyPayment.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveTab('pending')} className={tabBtnClass(activeTab === 'pending')}>
          <ListFilter size={15} />
          <span>Pending Disbursal Queue ({pendingPayment.length})</span>
        </button>

        <button onClick={() => setActiveTab('history')} className={tabBtnClass(activeTab === 'history')}>
          <History size={15} />
          <span>Disbursal History ({historyPayment.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder={
              activeTab === 'pending'
                ? 'Search pending payment orders by Work ID, Supervisor, Firm...'
                : 'Search payment history, Supervisor, Firm...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all min-w-[140px]"
            value={firmFilter}
            onChange={e => setFirmFilter(e.target.value)}
          >
            <option value="">All Firms</option>
            {uniqueFirms.map(firm => (
              <option key={firm} value={firm}>{firm}</option>
            ))}
          </select>

          <select
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all min-w-[160px]"
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
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-2xs p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <CreditCard size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {activeTab === 'pending' ? 'No Entries Pending Payment' : 'No Payment History Yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {activeTab === 'pending'
              ? 'All approved entries have been paid and queued for Stage 4 (Tally Entry).'
              : 'Paid records will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                <tr>
                  <th className="sticky left-0 bg-slate-100 z-30 border-r border-slate-200 px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Shift</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Firm</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Supervisor</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Activity</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Hours</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Qty / Output</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Labourers</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Per Person Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Amount Payable</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Remark</th>
                  {activeTab === 'history' && (
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Current Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => {
                  const count = Number(entry.labourCount) || 1;
                  const total = Number(entry.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  return (
                    <tr key={entry.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs px-4 py-2.5 whitespace-nowrap">
                        {activeTab === 'pending' ? (
                          canDisburse ? (
                            <button
                              onClick={() => handleOpenPayModal(entry)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              <Receipt size={14} />
                              <span>Record Payment</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setTimelineWorkId(entry.workId)}
                              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => setTimelineWorkId(entry.workId)}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{entry.workId}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800 whitespace-nowrap text-xs">{formatDate(entry.date)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{entry.shift || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {entry.firmName || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-slate-600 font-medium">{entry.incharge}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-800 text-sm">{entry.work}</div>
                          <div className={`inline-flex items-center gap-1 text-[11px] font-bold mt-0.5 ${isTonBasedWork(entry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isTonBasedWork(entry.work) ? <Scale size={11} /> : <User size={11} />}
                            <span>{isTonBasedWork(entry.work) ? 'Qty in Tons' : 'Per Person'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-semibold text-slate-700 whitespace-nowrap text-xs">
                          {entry.hours ? `${entry.hours} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-bold text-slate-800 whitespace-nowrap text-xs">
                          {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Users size={14} className="text-emerald-600" />
                          <span className="font-bold text-xs text-slate-800">{entry.labourCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-extrabold text-teal-600 text-sm">
                          ₹{total.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div
                          className={`max-w-[160px] truncate text-xs ${entry.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                          title={entry.workRemark || 'No remark'}
                        >
                          {entry.workRemark || '-'}
                        </div>
                      </td>
                      {activeTab === 'history' && (
                        <td className="px-4 py-2.5">
                          <StatusBadge status={entry.status} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 mb-5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold">Total Amount Disbursing</div>
                  <div className="text-2xl font-extrabold text-emerald-700">
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-700">
                  <div><strong>{selectedEntry.labourCount}</strong> Labourers</div>
                  <div>Supervisor: <strong>{selectedEntry.incharge}</strong></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm">
                <div>
                  <span className="text-slate-500">Date:</span>{' '}
                  <strong>{formatDate(selectedEntry.date)} ({selectedEntry.shift})</strong>
                </div>
                <div>
                  <span className="text-slate-500">Firm Name:</span>{' '}
                  <strong className="text-slate-800">{selectedEntry.firmName || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Work Activity:</span>{' '}
                  <strong>
                    {selectedEntry.work}{' '}
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${isTonBasedWork(selectedEntry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {isTonBasedWork(selectedEntry.work) ? <Scale size={12} /> : <User size={12} />}
                      <span>{isTonBasedWork(selectedEntry.work) ? 'Qty in Tons' : 'Per Person'}</span>
                    </span>
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Rate:</span>{' '}
                  <strong>
                    {formatEntryRate(selectedEntry)}
                  </strong>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-500">Work Remark:</span>{' '}
                  <span className={selectedEntry.workRemark ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
                    {selectedEntry.workRemark || 'No remark provided'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Disbursing & Moving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm & Mark as Paid</span>
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
