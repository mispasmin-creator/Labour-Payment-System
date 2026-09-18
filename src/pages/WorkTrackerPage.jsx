import React, { useState } from 'react';
import {
  TableProperties,
  Search,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { WorkDetailModal } from './WorkDetailModal';
import { exportToCSV, formatEntriesForExport } from '../utils/exportUtils';
import { isTonBasedWork } from '../utils/workTypes';

const selectClass =
  'px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all';
const thClass = 'px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap';
const tdClass = 'px-3 py-2.5 text-xs text-slate-600';

export function WorkTrackerPage() {
  const { entries, refreshData, syncing } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  // Filter
  const filteredEntries = entries.filter(item => {
    const matchesSearch =
      item.workId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.incharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firmName && item.firmName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.workRemark && item.workRemark.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.paymentRef && item.paymentRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tallyVoucher && item.tallyVoucher.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesIncharge = !inchargeFilter || item.incharge === inchargeFilter;
    const matchesFirm = !firmFilter || item.firmName === firmFilter;

    return matchesSearch && matchesStatus && matchesIncharge && matchesFirm;
  });

  const uniqueIncharges = Array.from(new Set(entries.map(e => e.incharge).filter(Boolean)));
  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  const handleExportCSV = () => {
    const formatted = formatEntriesForExport(filteredEntries);
    exportToCSV('Labour_Work_Entries_All', formatted);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Header (Title & Actions) */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TableProperties size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">All Work Orders Master Grid</h1>
            <p className="text-xs text-slate-500">
              Showing {filteredEntries.length} of {entries.length} work orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5"
          >
            <Download size={15} />
            <span>Export Filtered ({filteredEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder="Search by Work ID, Supervisor, Firm, Work, Voucher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            className={`${selectClass} min-w-[170px]`}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Verified (Pending Approval)">Verified (Pending Approval)</option>
            <option value="Approved (Pending Payment)">Approved (Pending Payment)</option>
            <option value="Paid (Pending Tally)">Paid (Pending Tally)</option>
            <option value="Tally Complete">Tally Complete</option>
          </select>

          <select
            className={`${selectClass} min-w-[150px]`}
            value={firmFilter}
            onChange={e => setFirmFilter(e.target.value)}
          >
            <option value="">All Firms</option>
            {uniqueFirms.map(firm => (
              <option key={firm} value={firm}>{firm}</option>
            ))}
          </select>

          <select
            className={`${selectClass} min-w-[170px]`}
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

      {/* Main Table */}
      {filteredEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-2xs text-center p-10">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <TableProperties size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">No Work Orders Found</h3>
          <p className="text-sm text-slate-500">
            No entries match your search criteria. Try clearing the filters.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full border-collapse min-w-[1500px]">
              <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                <tr>
                  <th className={`${thClass} sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-xs text-left`}>Action</th>
                  <th className={`${thClass} text-left`}>Work ID</th>
                  <th className={`${thClass} text-left`}>Date</th>
                  <th className={`${thClass} text-left`}>Shift</th>
                  <th className={`${thClass} text-left`}>Firm</th>
                  <th className={`${thClass} text-left`}>Incharge</th>
                  <th className={`${thClass} text-left`}>Work Activity</th>
                  <th className={`${thClass} text-right`}>Work Hours</th>
                  <th className={`${thClass} text-right`}>Qty / Output</th>
                  <th className={`${thClass} text-right`}>Labourers</th>
                  <th className={`${thClass} text-right`}>Per Person Amount</th>
                  <th className={`${thClass} text-right`}>Total Amount</th>
                  <th className={`${thClass} text-left`}>Work Remark</th>
                  <th className={`${thClass} text-left`}>Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => {
                  const count = Number(entry.labourCount) || 1;
                  const total = Number(entry.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  return (
                    <tr key={entry.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs px-3 py-2.5">
                        <button
                          onClick={() => setSelectedWorkId(entry.workId)}
                          title="View Work Order Details & Labourers"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Eye size={14} />
                          <span>Details</span>
                        </button>
                      </td>
                      <td className={`${tdClass} font-mono font-bold text-indigo-600 whitespace-nowrap`}>
                        {entry.workId}
                      </td>
                      <td className={`${tdClass} font-semibold text-slate-800 whitespace-nowrap`}>
                        {formatDate(entry.date)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {entry.shift || '-'}
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          {entry.firmName || '-'}
                        </span>
                      </td>
                      <td className={`${tdClass} font-medium text-slate-700`}>
                        {entry.incharge}
                      </td>
                      <td className={tdClass}>
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-800 text-[13px]">
                            {entry.work}
                          </div>
                          <div className={`text-[11px] font-bold mt-0.5 ${isTonBasedWork(entry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'}
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right font-semibold text-slate-700 whitespace-nowrap`}>
                        {entry.hours ? `${entry.hours} hrs` : '-'}
                      </td>
                      <td className={`${tdClass} text-right font-bold text-slate-800 whitespace-nowrap`}>
                        {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}` : '-'}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <span className="font-bold text-emerald-600">{entry.labourCount}</span> pers
                      </td>
                      <td className={`${tdClass} text-right font-bold text-emerald-600 whitespace-nowrap`}>
                        &#8377;{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`${tdClass} text-right font-extrabold text-slate-900 whitespace-nowrap`}>
                        &#8377;{total.toLocaleString('en-IN')}
                      </td>
                      <td className={tdClass}>
                        <div
                          className={`max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis ${
                            entry.workRemark ? 'text-slate-600' : 'text-slate-400 italic'
                          }`}
                          title={entry.workRemark || 'No remark entered'}
                        >
                          {entry.workRemark || '-'}
                        </div>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWorkId && (
        <WorkDetailModal
          workId={selectedWorkId}
          onClose={() => setSelectedWorkId(null)}
          showLabourNames={true}
        />
      )}
    </div>
  );
}
