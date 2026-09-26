import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  IndianRupee,
  Layers,
  Sparkles,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import {
  exportToCSV,
  formatEntriesForExport,
  formatFMSForExport
} from '../utils/exportUtils';
import { isTonBasedWork } from '../utils/workTypes';

export function ReportsPage() {
  const navigate = useNavigate();
  const { entries, masterData, refreshData, syncing } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const uniqueFirms = Array.from(new Set(entries.map(e => e.firmName).filter(Boolean)));

  // Filtered entries
  const filtered = entries.filter(item => {
    if (dateFrom && new Date(item.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(item.date) > new Date(dateTo)) return false;
    if (firmFilter && item.firmName !== firmFilter) return false;
    if (inchargeFilter && item.incharge !== inchargeFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  const totalFilteredAmount = filtered.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalFilteredLabourers = filtered.reduce((sum, item) => sum + (Number(item.labourCount) || 0), 0);
  const completedCount = filtered.filter(item => item.status === 'Tally Complete').length;

  const handleExportEntrySheet = () => {
    const formatted = formatEntriesForExport(filtered);
    exportToCSV('Entry_Sheet_Export', formatted);
  };

  const handleExportFMSSheet = () => {
    const formatted = formatFMSForExport(filtered);
    exportToCSV('FMS_Sheet_Export', formatted);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Reports & Data Export Center</h1>
            <p className="text-xs text-slate-500">{filtered.length} records matching current filters</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => navigate('/reports/incharge-wise')}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
            title="Open Dedicated Incharge Wise Labour MIS Analytics & Report"
          >
            <Users size={16} />
            <span>Incharge Wise Report</span>
          </button>

          <button
            onClick={refreshData}
            disabled={syncing}
            title="Sync Data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={handleExportEntrySheet}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Entry Sheet CSV</span>
          </button>
          <button
            onClick={handleExportFMSSheet}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            <Download size={14} />
            <span>FMS Sheet CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 shrink-0">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Date From</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Date To</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Firm Name</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={firmFilter}
              onChange={e => setFirmFilter(e.target.value)}
            >
              <option value="">All Firms</option>
              {uniqueFirms.map(firm => (
                <option key={firm} value={firm}>{firm}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Supervisor / Incharge</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={inchargeFilter}
              onChange={e => setInchargeFilter(e.target.value)}
            >
              <option value="">All Supervisors</option>
              {(masterData.incharges || []).map(inc => (
                <option key={inc} value={inc}>{inc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Status / Stage</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified (Pending Approval)">Verified (Pending Approval)</option>
              <option value="Approved (Pending Payment)">Approved (Pending Payment)</option>
              <option value="Paid (Pending Tally)">Paid (Pending Tally)</option>
              <option value="Tally Complete">Tally Complete</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFirmFilter(''); setInchargeFilter(''); setStatusFilter(''); }}
              className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-2.5 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon for filtered results */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4.5 py-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Work Entries</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{filtered.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4.5 py-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
            ₹{totalFilteredAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4.5 py-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Labourers</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
            {totalFilteredLabourers} <span className="text-sm font-semibold text-slate-500">persons</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4.5 py-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Orders</div>
          <div className="text-2xl font-extrabold text-emerald-500 mt-0.5">
            {completedCount} <span className="text-sm font-semibold text-slate-500">completed</span>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work ID</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Date</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Shift</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Firm</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Incharge</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Type</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Hours</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Qty / Output</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Labourers</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Per Person Amount</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Total Amount</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Work Remark</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-500 text-sm">
                    No records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const count = Number(item.labourCount) || 1;
                  const total = Number(item.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  return (
                    <tr key={item.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{item.workId}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{item.shift || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          {item.firmName || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{item.incharge}</td>
                      <td className="px-3 py-2.5">
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-900 text-sm">
                            {item.work}
                          </div>
                          <div className={`text-[11px] font-bold mt-0.5 ${isTonBasedWork(item.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isTonBasedWork(item.work) ? 'Qty in Tons' : 'Per Person'}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-600 whitespace-nowrap text-xs">
                          {item.hours ? `${item.hours} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 whitespace-nowrap text-xs">
                          {item.qty !== undefined && item.qty !== '' ? `${item.qty} ${isTonBasedWork(item.work) ? 'MT' : 'units'}` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 text-right">{item.labourCount}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-bold text-slate-900 text-xs">
                          ₹{total.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className={`max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${item.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                          title={item.workRemark || 'No remark'}
                        >
                          {item.workRemark || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
