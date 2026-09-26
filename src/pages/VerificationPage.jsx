import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  User,
  Scale,
  Eye,
  History,
  ListFilter,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { WorkDetailModal } from './WorkDetailModal';
import { isTonBasedWork, formatEntryRate } from '../utils/workTypes';
import { sanitizeLabourersList } from '../services/api';

export const isEntryVerified = entry => {
  if (!entry) return false;
  return Boolean(
    entry.verificationActual &&
    entry.verificationActual !== '-' &&
    entry.verificationActual !== 'null' &&
    String(entry.verificationActual).trim() !== ''
  );
};

export function VerificationPage() {
  const { entries, masterData, verifyEntry, syncing, canPerformAction, refreshData } = useApp();
  const canVerify = canPerformAction('verification');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

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
      const rawMaster = Array.isArray(masterData?.labourers) && masterData.labourers.length > 0
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
      const masterList = sanitizeLabourersList(rawMaster);
      list = masterList.slice(0, count);
    }
    return list;
  };

  // Pending vs History: Strictly mutually exclusive
  const pendingEntries = entries.filter(e => !isEntryVerified(e));
  const historyEntries = entries.filter(e => isEntryVerified(e));

  const currentList = activeTab === 'pending' ? pendingEntries : historyEntries;

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

  const handleOpenVerifyModal = entry => {
    setSelectedEntry(entry);
    setRemarks('');
  };

  const handleConfirmVerify = async () => {
    if (!selectedEntry || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await verifyEntry(selectedEntry.workId, remarks);
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
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Work Verification Center</h1>
            <p className="text-xs text-slate-500">
              {activeTab === 'pending'
                ? `${pendingEntries.length} entr${pendingEntries.length === 1 ? 'y' : 'ies'} pending verification`
                : `${historyEntries.length} verified record${historyEntries.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshData()}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3.5 py-2.5 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Sync latest data from Google Sheet"
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-3.5 py-2 text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</div>
            <div className="text-lg font-extrabold text-amber-600 leading-tight">{pendingEntries.length}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-3.5 py-2 text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Verified History</div>
            <div className="text-lg font-extrabold text-emerald-600 leading-tight">{historyEntries.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveTab('pending')} className={tabBtnClass(activeTab === 'pending')}>
          <ListFilter size={15} />
          <span>Pending Verification Queue ({pendingEntries.length})</span>
        </button>

        <button onClick={() => setActiveTab('history')} className={tabBtnClass(activeTab === 'history')}>
          <History size={15} />
          <span>Verification History ({historyEntries.length})</span>
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
                ? 'Search pending entries by Work ID, Supervisor, Firm...'
                : 'Search verification history...'
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

      {/* Table / Queue */}
      {filteredEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-2xs p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {activeTab === 'pending' ? 'No Entries Pending Verification' : 'No Verification History Yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {activeTab === 'pending'
              ? 'All work entries have been verified and advanced to Stage 2.'
              : 'Completed verification records will appear here with full timestamps and audit trail.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full border-collapse" key={activeTab}>
              <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                <tr>
                  <th className="sticky left-0 bg-slate-100 z-30 border-r border-slate-200 px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Planned Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Shift</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Firm</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Incharge</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Activity</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Hours</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Qty / Output</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Labourers</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Per Person Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Remark</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry, idx) => {
                  const count = Number(entry.labourCount) || 1;
                  const total = Number(entry.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  const verified = isEntryVerified(entry);
                  return (
                    <tr key={`${entry.workId || 'wrk'}_${idx}_${activeTab}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs px-4 py-2.5 whitespace-nowrap">
                        {verified ? (
                          <button
                            onClick={() => setTimelineWorkId(entry.workId)}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenVerifyModal(entry)}
                            disabled={!canVerify}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                            <ShieldCheck size={14} />
                            <span>Verify Work</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{entry.workId}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">{formatDate(entry.verificationPlanned)}</div>
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
                        <div className="font-extrabold text-slate-800 text-sm">
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
                      <td className="px-4 py-2.5">
                        <StatusBadge status={verified ? entry.status : 'Pending Verification'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Supervisor:</span>{' '}
                  <strong className="text-slate-800">{selectedEntry.incharge}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Firm Name:</span>{' '}
                  <strong className="text-slate-800">{selectedEntry.firmName || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Date:</span>{' '}
                  <strong>{formatDate(selectedEntry.date)} ({selectedEntry.shift})</strong>
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
                  <span className="text-slate-500">Labour & Rate:</span>{' '}
                  <strong>
                    {selectedEntry.labourCount} persons • {formatEntryRate(selectedEntry)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Hours & Qty:</span>{' '}
                  <strong>{selectedEntry.hours} hrs / {selectedEntry.qty} {isTonBasedWork(selectedEntry.work) ? 'Tons' : 'units'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Total Payable:</span>{' '}
                  <strong className="text-emerald-600 text-base">
                    ₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-500">Work Remark:</span>{' '}
                  <span className={selectedEntry.workRemark ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
                    {selectedEntry.workRemark || 'No remark provided'}
                  </span>
                </div>
              </div>

              {/* Labourers list */}
              <div className="mt-3.5 pt-3 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Assigned Labourers ({getModalLabourers(selectedEntry).length} Persons)
                </div>
                <div className="flex flex-wrap gap-2">
                  {getModalLabourers(selectedEntry).map((name, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-semibold"
                    >
                      <span className="w-[18px] h-[18px] rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Verifier Remarks (Optional)
              </label>
              <textarea
                rows="2"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="e.g. Work inspected on site, labour headcount verified."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex justify-end items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold px-4 py-2"
              >
                Close
              </button>
              {canVerify ? (
                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying & Moving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Mark Verified</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md font-semibold">
                  <Eye size={14} />
                  <span>View-Only Access (Verification Action Disabled)</span>
                </div>
              )}
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
