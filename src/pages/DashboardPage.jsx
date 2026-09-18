import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  Search,
  RefreshCw,
  ReceiptText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutDashboard,
  Users,
  User,
  Scale,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { isTonBasedWork } from '../utils/workTypes';
import { formatDate, formatINR, parseDate } from '../utils/dateUtils';
import { WorkDetailModal } from './WorkDetailModal';

// Date Helpers for Week Navigation
function getMondayOfDate(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSundayOfDate(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { entries, counts, refreshData, syncing, openNewEntry } = useApp();
  const [selectedWorkId, setSelectedWorkId] = useState(null);

  // Date Range & Week Filter State
  const [selectedPreset, setSelectedPreset] = useState('All Time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];

  // Navigate Weeks (Previous / Next)
  const handleShiftWeek = (offsetWeeks) => {
    const currentBase = dateFrom ? parseDate(dateFrom) || new Date() : new Date();
    const shifted = new Date(currentBase);
    shifted.setDate(shifted.getDate() + (offsetWeeks * 7));
    const mon = getMondayOfDate(shifted);
    const sun = getSundayOfDate(mon);
    setDateFrom(toISODate(mon));
    setDateTo(toISODate(sun));
    setSelectedPreset('');
  };

  // Quick Preset Selection
  const handleSetPreset = (preset) => {
    setSelectedPreset(preset);
    const now = new Date();

    if (preset === 'This Week') {
      const mon = getMondayOfDate(now);
      const sun = getSundayOfDate(mon);
      setDateFrom(toISODate(mon));
      setDateTo(toISODate(sun));
    } else if (preset === 'Last Week') {
      const lastMon = new Date(now);
      lastMon.setDate(now.getDate() - 7);
      const mon = getMondayOfDate(lastMon);
      const sun = getSundayOfDate(mon);
      setDateFrom(toISODate(mon));
      setDateTo(toISODate(sun));
    } else if (preset === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    } else if (preset === 'All Time') {
      setDateFrom('');
      setDateTo('');
      setSearchTerm('');
    }
  };

  // Human-readable active date range label
  const activeRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All Time';
    if (selectedPreset) return selectedPreset;
    if (dateFrom && dateTo) return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
    if (dateFrom) return `From ${formatDate(dateFrom)}`;
    if (dateTo) return `Up to ${formatDate(dateTo)}`;
    return '';
  }, [dateFrom, dateTo, selectedPreset]);

  // Filtered Entries based on Date Range and Search
  const filteredEntries = useMemo(() => {
    return safeEntries.filter(entry => {
      if (!entry) return false;

      // Date Range Filter
      if (dateFrom || dateTo) {
        const parsed = parseDate(entry.date);
        if (parsed) {
          const iso = toISODate(parsed);
          if (dateFrom && iso < dateFrom) return false;
          if (dateTo && iso > dateTo) return false;
        }
      }

      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchWork = (entry.work || '').toLowerCase().includes(q);
        const matchIncharge = (entry.incharge || '').toLowerCase().includes(q);
        const matchFirm = (entry.firmName || '').toLowerCase().includes(q);
        const matchId = (entry.workId || '').toLowerCase().includes(q);
        const matchRemark = (entry.workRemark || '').toLowerCase().includes(q);
        const matchLabour = Array.isArray(entry.labourNames)
          ? entry.labourNames.some(n => String(n).toLowerCase().includes(q))
          : String(entry.labourNames || '').toLowerCase().includes(q);

        if (!matchWork && !matchIncharge && !matchFirm && !matchId && !matchRemark && !matchLabour) {
          return false;
        }
      }

      return true;
    });
  }, [safeEntries, dateFrom, dateTo, searchTerm]);

  // Derived Filtered Stats
  const filteredVerifiedOrders = useMemo(() => {
    return filteredEntries.filter(
      e => Boolean(e.verificationActual) || (e.status && !e.status.toLowerCase().includes('pending verification'))
    );
  }, [filteredEntries]);

  const totalFilteredAmount = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [filteredEntries]);

  const totalVerifiedAmount = useMemo(() => {
    return filteredVerifiedOrders.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [filteredVerifiedOrders]);

  const pendingVerificationCount = useMemo(() => {
    return filteredEntries.filter(
      e => e.status === 'Pending Verification' || !e.verificationActual
    ).length;
  }, [filteredEntries]);

  const totalLabourCount = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (Number(e.labourCount) || 0), 0);
  }, [filteredEntries]);

  // Daily Work Value Trend (last 14 active days within the current filter)
  const chartData = useMemo(() => {
    const totalsByDate = new Map();
    filteredEntries.forEach(e => {
      const parsed = parseDate(e.date);
      if (!parsed) return;
      const iso = toISODate(parsed);
      totalsByDate.set(iso, (totalsByDate.get(iso) || 0) + (Number(e.totalAmount) || 0));
    });
    return Array.from(totalsByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([iso, amount]) => ({
        iso,
        label: new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        amount
      }));
  }, [filteredEntries]);

  const maxChartAmount = useMemo(
    () => Math.max(1, ...chartData.map(d => d.amount)),
    [chartData]
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Sticky Page Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap bg-white rounded-xl border border-slate-200 shadow-2xs px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Labour Payment System</h1>
            <p className="text-xs text-slate-500">Dashboard overview of work entries and payment workflow</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshData}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Sync & Refresh Data from Google Sheets"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>

          <button
            onClick={openNewEntry}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
          >
            <PlusCircle size={16} />
            <span>New Work Entry</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-2 transition-colors"
          >
            <FileSpreadsheet size={14} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 -mr-1 pr-1">
      {/* Top-Level KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Work Orders"
          value={filteredEntries.length}
          subtitle={activeRangeLabel}
          icon={Layers}
          theme="indigo"
        />
        <MetricCard
          title="Pending Verification"
          value={pendingVerificationCount}
          subtitle="Awaiting site check"
          icon={Clock}
          theme="amber"
        />
        <MetricCard
          title="Verified Payable"
          value={formatINR(totalVerifiedAmount)}
          subtitle={`${filteredVerifiedOrders.length} orders verified`}
          icon={IndianRupee}
          theme="emerald"
        />
        <MetricCard
          title="Labourers Deployed"
          value={totalLabourCount}
          subtitle="Across selected orders"
          icon={Users}
          theme="teal"
        />
      </div>

      {/* ============================================================
          DATE RANGE & WEEK FILTER TOOLBAR
          ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Left Side: Week Navigation & Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <Calendar size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">Date Filter:</span>
          </div>

          {/* Week Shift Controls */}
          <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              title="Previous Week"
              className="bg-slate-50 border-r border-slate-200 px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              title="Next Week"
              className="bg-slate-50 px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Preset Chips */}
          {['This Week', 'Last Week', 'This Month', 'All Time'].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSetPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPreset === preset
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Right Side: Custom Date Pickers, Search & Reset */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setSelectedPreset('');
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="font-semibold ml-0.5">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setSelectedPreset('');
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity, incharge..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs bg-white w-[170px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {(dateFrom || dateTo || searchTerm || selectedPreset !== 'All Time') && (
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
              title="Reset all filters to All Time"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Workflow Stage Cards: Verification & Payment Report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Step 1: Verification */}
        <div
          className="relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
          onClick={() => navigate('/verification')}
        >
          <span className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-extrabold text-slate-800">1. Work Verification</span>
              <div className="text-xs text-slate-500 mt-0.5">Site Supervisor / Ops Verification</div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 shrink-0">
              <Clock size={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-3 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Pending Verify</div>
              <div className="text-2xl font-extrabold text-amber-700">{pendingVerificationCount}</div>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Verified</div>
              <div className="text-2xl font-extrabold text-emerald-700">{filteredVerifiedOrders.length}</div>
            </div>
          </div>
        </div>

        {/* Step 2: Payment Report */}
        <div
          className="relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/40 rounded-xl border border-emerald-200 shadow-2xs p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
          onClick={() => navigate('/payment-report')}
        >
          <span className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-extrabold text-emerald-950">2. Payment Report</span>
              <div className="text-xs text-emerald-600 mt-0.5 font-semibold">Weekly Work Type &amp; Labour Wise Report</div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
              <ReceiptText size={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-3 bg-white px-3.5 py-2.5 rounded-lg border border-emerald-200">
            <div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Verified Orders</div>
              <div className="text-2xl font-extrabold text-emerald-950">{filteredVerifiedOrders.length}</div>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Payable Amount</div>
              <div className="text-2xl font-extrabold text-indigo-700">{formatINR(totalVerifiedAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview & Work Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Financials */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                <IndianRupee size={16} />
              </div>
              <span>Financial Overview</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">{activeRangeLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Verified Payable Amount</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">{formatINR(totalVerifiedAmount)}</div>
              <div className="text-xs text-emerald-600 mt-1">{filteredVerifiedOrders.length} orders verified</div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Total Work Value</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">{formatINR(totalFilteredAmount)}</div>
              <div className="text-xs text-amber-600 mt-1">{filteredEntries.length} total work orders</div>
            </div>
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                <Layers size={16} />
              </div>
              <span>Verification Status Ratio</span>
            </div>
            <span className="text-xs font-bold text-emerald-600">{filteredEntries.length} Total Orders</span>
          </div>

          <div className="flex h-4 rounded-lg overflow-hidden bg-slate-100 mb-3.5">
            <div
              className="bg-emerald-500"
              style={{ width: `${filteredEntries.length > 0 ? (filteredVerifiedOrders.length / filteredEntries.length) * 100 : 0}%` }}
              title="Verified"
            />
            <div
              className="bg-amber-500"
              style={{ width: `${filteredEntries.length > 0 ? (pendingVerificationCount / filteredEntries.length) * 100 : 0}%` }}
              title="Pending Verification"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="font-bold text-emerald-800 text-xs">Verified ({filteredVerifiedOrders.length})</div>
                <div className="text-[11px] text-emerald-600">
                  {filteredEntries.length > 0 ? Math.round((filteredVerifiedOrders.length / filteredEntries.length) * 100) : 0}% of selected
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div>
                <div className="font-bold text-amber-800 text-xs">Pending Verify ({pendingVerificationCount})</div>
                <div className="text-[11px] text-amber-600">
                  {filteredEntries.length > 0 ? Math.round((pendingVerificationCount / filteredEntries.length) * 100) : 0}% of selected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Work Value Trend */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2.5 font-bold text-slate-800">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <TrendingUp size={16} />
            </div>
            <span>Work Value Trend</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {chartData.length > 0 ? `Last ${chartData.length} active day${chartData.length === 1 ? '' : 's'}` : activeRangeLabel}
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <TrendingUp size={28} />
            <span className="text-xs font-semibold">No work value data for {activeRangeLabel}</span>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-40 px-1">
            {chartData.map(d => {
              const heightPct = Math.max(4, (d.amount / maxChartAmount) * 100);
              return (
                <div key={d.iso} className="relative flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {formatINR(d.amount)}
                  </div>
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-indigo-500 group-hover:bg-indigo-600 transition-colors"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] font-semibold text-slate-500 mt-1.5 whitespace-nowrap">{d.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Work Entries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <Clock size={16} />
            </div>
            <span className="font-bold text-slate-800">Work Entries &amp; Workflow State</span>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'Record' : 'Records'} ({activeRangeLabel})
            </span>
          </div>

          <button
            onClick={() => navigate('/tracker')}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            <span>View All ({entries.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[440px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                <th className="sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-xs font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Work ID</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Date</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Shift</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Firm</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Incharge</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Work Activity</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Work Hours</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Qty / Output</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap text-right">Labourers</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap text-right">Per Person Amount</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap text-right">Total Amount</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Work Remark</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Status</th>
                <th className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] px-4 py-2.5 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center px-4 py-9 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={32} className="text-slate-400" />
                      <div className="text-sm font-bold text-slate-700">
                        No work entries found for {activeRangeLabel}
                      </div>
                      <div className="text-xs text-slate-500">
                        Try selecting another week or click "All Time" to view all records.
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetPreset('All Time')}
                        className="mt-1.5 inline-flex items-center gap-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
                      >
                        Show All Time Records
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const count = Number(entry.labourCount) || 1;
                  const total = Number(entry.totalAmount) || 0;
                  const perPerson = count > 0 ? (total / count) : 0;
                  return (
                    <tr key={entry.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs px-4 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs whitespace-nowrap">{entry.workId}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900 text-xs whitespace-nowrap">{formatDate(entry.date)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{entry.shift || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-900 font-semibold whitespace-nowrap">
                          {entry.firmName || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-slate-600 font-medium">{entry.incharge}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-900 text-sm">
                            {entry.work}
                          </div>
                          <div className={`inline-flex items-center gap-1 text-[11px] font-bold mt-0.5 ${isTonBasedWork(entry.work) ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isTonBasedWork(entry.work) ? <Scale size={11} /> : <User size={11} />}
                            <span>{isTonBasedWork(entry.work) ? 'Per Ton' : 'Per Person'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-700 text-xs whitespace-nowrap">
                          {entry.hours ? `${entry.hours} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900 text-xs whitespace-nowrap">
                          {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold text-emerald-600 text-xs">{entry.labourCount}</span> <span className="text-xs text-slate-500">pers</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          ₹{total.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div
                          className={`max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${entry.workRemark ? 'text-slate-600' : 'text-slate-400 italic'}`}
                          title={entry.workRemark || 'No remark'}
                        >
                          {entry.workRemark || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setSelectedWorkId(entry.workId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors"
                        >
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Detail Modal */}
      {selectedWorkId && (
        <WorkDetailModal
          workId={selectedWorkId}
          onClose={() => setSelectedWorkId(null)}
        />
      )}
    </div>
  );
}
