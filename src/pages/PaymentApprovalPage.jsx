import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Search,
  CheckCheck,
  IndianRupee,
  Users,
  Clock,
  Briefcase,
  History,
  ListFilter,
  Eye,
  Building2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { DelayBadge } from '../components/common/DelayBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkDetailModal } from './WorkDetailModal';
import { isTonBasedWork } from '../utils/workTypes';

export function PaymentApprovalPage() {
  const { entries, approveEntry, approveBatch, syncing, canPerformAction } = useApp();
  const canApprove = canPerformAction('approval');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [timelineWorkId, setTimelineWorkId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Pending vs History
  const pendingApproval = entries.filter(
    e => e.status === 'Verified (Pending Approval)' || (e.verificationActual && !e.approvalActual && !e.paymentActual && !e.tallyActual)
  );
  const historyApproval = entries.filter(
    e => ['Approved (Pending Payment)', 'Approved', 'Paid (Pending Tally)', 'Paid', 'Tally Complete'].includes(e.status) || Boolean(e.approvalActual)
  );

  const currentList = activeTab === 'pending' ? pendingApproval : historyApproval;

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

  const totalAmountToApprove = pendingApproval.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const totalHistoryApproved = historyApproval.reduce(
    (sum, e) => sum + (Number(e.totalAmount) || 0),
    0
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.workId));
    }
  };

  const toggleSelectOne = workId => {
    if (selectedIds.includes(workId)) {
      setSelectedIds(selectedIds.filter(id => id !== workId));
    } else {
      setSelectedIds([...selectedIds, workId]);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0 || isBatchApproving) return;
    setIsBatchApproving(true);
    try {
      await approveBatch(selectedIds);
      setSelectedIds([]);
      setActiveTab('history');
    } finally {
      setIsBatchApproving(false);
    }
  };

  const handleSingleApprove = async workId => {
    if (approvingId) return;
    setApprovingId(workId);
    try {
      await approveEntry(workId);
      setActiveTab('history');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Payment Approval Center</h1>
            <p className="text-xs text-slate-500">{pendingApproval.length} entries awaiting approval</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-white px-4.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs text-right">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approval
            </div>
            <div className="text-xl font-extrabold text-indigo-600">
              ₹{totalAmountToApprove.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">({pendingApproval.length})</span>
            </div>
          </div>

          <div className="bg-white px-4.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs text-right">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved History
            </div>
            <div className="text-xl font-extrabold text-emerald-600">
              ₹{totalHistoryApproved.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">({historyApproval.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 border-b border-slate-200 pb-2.5 shrink-0">
        <button
          onClick={() => {
            setActiveTab('pending');
            setSelectedIds([]);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ListFilter size={15} />
          <span>Pending Approval Queue ({pendingApproval.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setSelectedIds([]);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History size={15} />
          <span>Approval History ({historyApproval.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder={activeTab === 'pending' ? "Search pending approvals by Work ID, Supervisor, Firm..." : "Search approval history..."}
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

          {activeTab === 'pending' && selectedIds.length > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={selectedIds.length === 0 || isBatchApproving}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBatchApproving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Approving {selectedIds.length}...</span>
                </>
              ) : (
                <>
                  <CheckCheck size={16} />
                  <span>Approve Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* List / Table */}
      {filteredEntries.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-2xs py-16">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {activeTab === 'pending' ? 'No Entries Pending Payment Approval' : 'No Approval History Yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 text-center max-w-md">
            {activeTab === 'pending'
              ? 'All verified entries have been approved and moved to Stage 3.'
              : 'Approved work orders will appear here with full timestamps and approval audit trail.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                  {activeTab === 'pending' && (
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        className="accent-indigo-600"
                        checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
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
                      {activeTab === 'pending' && (
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="accent-indigo-600"
                            checked={selectedIds.includes(entry.workId)}
                            onChange={() => toggleSelectOne(entry.workId)}
                          />
                        </td>
                      )}
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
                        <div className="inline-flex items-center gap-1.5">
                          <Users size={14} className="text-emerald-600" />
                          <span className="font-bold text-xs text-slate-800">{entry.labourCount}</span>
                        </div>
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
                          canApprove ? (
                            <button
                              onClick={() => handleSingleApprove(entry.workId)}
                              disabled={approvingId === entry.workId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {approvingId === entry.workId ? (
                                <>
                                  <RefreshCw size={14} className="animate-spin" />
                                  <span>Approving...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Approve</span>
                                </>
                              )}
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
