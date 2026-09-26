import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Factory,
  Cog,
  Hammer,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { isTonBasedWork } from '../utils/workTypes';
import { formatDate, formatINR, parseDate } from '../utils/dateUtils';
import { WorkDetailModal } from './WorkDetailModal';
import {
  fetchSemiActualEntries,
  fetchCrushingActualEntries,
  fetchSemiProduction
} from '../services/supabaseClient';
import { DASHBOARD_FIRM, getFirmProductionSummary } from '../utils/productionUtils';

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

const formatQty = (n) =>
  (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

const ACCENTS = {
  indigo: { icon: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500', track: 'bg-indigo-100' },
  amber: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500', track: 'bg-amber-100' }
};

function ProductionStat({ title, source, icon: Icon, accent, data, share, loading }) {
  const a = ACCENTS[accent] || ACCENTS.indigo;
  const topMax = Math.max(1, ...data.topProducts.map(p => p.qty));

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.icon}`}>
            <Icon size={20} />
          </span>
          <div>
            <div className="text-sm font-bold text-slate-800">{title}</div>
            <div className="text-[11px] text-slate-500">{source}</div>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 whitespace-nowrap">
          {loading ? '…' : `${data.count} ${data.count === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
          {loading ? '—' : formatQty(data.qty)}
        </span>
        <span className="text-sm font-semibold text-slate-500">MT</span>
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">
        Total quantity • {Math.round(share * 100)}% of combined output
      </div>

      <div className="mt-4 space-y-2">
        {!loading && data.topProducts.length === 0 && (
          <div className="text-xs text-slate-400 italic">No production recorded in this period</div>
        )}
        {!loading && data.topProducts.map(p => (
          <div key={p.name}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium text-slate-600 truncate pr-2">{p.name}</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatQty(p.qty)} MT</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${a.track}`}>
              <div className={`h-full rounded-full ${a.bar}`} style={{ width: `${(p.qty / topMax) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

  // Production data (Supabase) for PMMPL Grinding & Crushing output
  const [semiActuals, setSemiActuals] = useState([]);
  const [crushingActuals, setCrushingActuals] = useState([]);
  const [semiProductions, setSemiProductions] = useState([]);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [productionError, setProductionError] = useState(null);

  const loadProductionData = async () => {
    try {
      setLoadingProduction(true);
      setProductionError(null);
      const [semi, crushing, prod] = await Promise.all([
        fetchSemiActualEntries(),
        fetchCrushingActualEntries(),
        fetchSemiProduction().catch(() => [])
      ]);
      setSemiActuals(semi);
      setCrushingActuals(crushing);
      setSemiProductions(prod);
    } catch (err) {
      console.error('Error fetching production data for Dashboard:', err);
      setProductionError(err.message || 'Failed to connect to Supabase');
    } finally {
      setLoadingProduction(false);
    }
  };

  useEffect(() => {
    loadProductionData();
  }, []);

  const handleRefreshAll = () => {
    refreshData();
    loadProductionData();
  };

  const isSyncing = syncing || loadingProduction;

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

  const productionSummary = useMemo(
    () => getFirmProductionSummary({ semiActuals, crushingActuals, semiProductions, dateFrom, dateTo }),
    [semiActuals, crushingActuals, semiProductions, dateFrom, dateTo]
  );

  const maxChartAmount = useMemo(
    () => Math.max(1, ...chartData.map(d => d.amount)),
    [chartData]
  );

  const verifiedPct = filteredEntries.length > 0 ? Math.round((filteredVerifiedOrders.length / filteredEntries.length) * 100) : 0;
  const pendingPct = filteredEntries.length > 0 ? 100 - verifiedPct : 0;
  const combinedProductionQty = productionSummary.grinding.qty + productionSummary.crushing.qty;

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Page Header + Filters */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Operations Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Labour work, payments &amp; production overview
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="font-semibold text-slate-700">{activeRangeLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefreshAll}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="Sync labour entries (Google Sheet) & production data (Supabase)"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-2 transition-colors"
            >
              <FileSpreadsheet size={14} />
              <span>Export Reports</span>
            </button>

            <button
              onClick={openNewEntry}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
            >
              <PlusCircle size={16} />
              <span>New Work Entry</span>
            </button>
          </div>
        </div>

        {/* Date Range & Week Filter Toolbar */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={15} className="text-slate-400" />

            <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleShiftWeek(-1)}
                title="Previous Week"
                className="bg-white border-r border-slate-200 px-2 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleShiftWeek(1)}
                title="Next Week"
                className="bg-white px-2 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
              {['This Week', 'Last Week', 'This Month', 'All Time'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetPreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    selectedPreset === preset
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setSelectedPreset('');
                }}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="From date"
              />
              <span className="font-semibold">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setSelectedPreset('');
                }}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="To date"
              />
            </div>

            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search work, incharge, labour..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs bg-white w-[210px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                title="Reset all filters to All Time"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 -mr-1 pr-1">
      {/* Top-Level KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Work Orders"
          value={filteredEntries.length}
          subtitle={`${pendingVerificationCount} pending verification`}
          icon={Layers}
          theme="indigo"
          onClick={() => navigate('/tracker')}
        />
        <MetricCard
          title="Total Work Value"
          value={formatINR(totalFilteredAmount)}
          subtitle={`Across ${filteredEntries.length} work orders`}
          icon={TrendingUp}
          theme="amber"
        />
        <MetricCard
          title="Verified Payable"
          value={formatINR(totalVerifiedAmount)}
          subtitle={`${filteredVerifiedOrders.length} orders verified`}
          icon={IndianRupee}
          theme="emerald"
          onClick={() => navigate('/payment-report')}
        />
        <MetricCard
          title="Labourers Deployed"
          value={totalLabourCount.toLocaleString('en-IN')}
          subtitle="Across selected orders"
          icon={Users}
          theme="teal"
        />
      </div>

      {/* Production Output — PMMPL only */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700">
              <Factory size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Production Output</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Firm: {DASHBOARD_FIRM.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">From Production page • {activeRangeLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Combined Output</div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {loadingProduction ? '…' : `${formatQty(combinedProductionQty)} MT`}
              </div>
            </div>
            <button
              onClick={() => navigate('/production')}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
            >
              <span>View Production</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {productionError ? (
          <div className="px-5 py-6 text-xs font-semibold text-rose-600">
            Could not load production data: {productionError}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <ProductionStat
              title="Grinding"
              source="Actual Production Entry"
              icon={Cog}
              accent="indigo"
              data={productionSummary.grinding}
              share={combinedProductionQty > 0 ? productionSummary.grinding.qty / combinedProductionQty : 0}
              loading={loadingProduction}
            />
            <ProductionStat
              title="Crushing"
              source="Crushing Department"
              icon={Hammer}
              accent="amber"
              data={productionSummary.crushing}
              share={combinedProductionQty > 0 ? productionSummary.crushing.qty / combinedProductionQty : 0}
              loading={loadingProduction}
            />
          </div>
        )}
      </div>

      {/* Workflow Pipeline & Work Value Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                <ShieldCheck size={16} />
              </div>
              <span>Payment Workflow</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">{filteredEntries.length} orders</span>
          </div>

          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Verification progress</span>
            <span className="text-xs font-bold text-slate-900">{verifiedPct}%</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-4">
            <div className="bg-emerald-500" style={{ width: `${verifiedPct}%` }} title="Verified" />
            <div className="bg-amber-400" style={{ width: `${pendingPct}%` }} title="Pending Verification" />
          </div>

          <div className="space-y-2.5 mt-auto">
            <button
              type="button"
              onClick={() => navigate('/verification')}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-3 text-left hover:border-amber-300 hover:bg-amber-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-800">1. Work Verification</div>
                  <div className="text-[11px] text-slate-500">{pendingPct}% awaiting site check</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-amber-600">{pendingVerificationCount}</span>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/payment-report')}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ReceiptText size={16} />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-800">2. Payment Report</div>
                  <div className="text-[11px] text-slate-500">{formatINR(totalVerifiedAmount)} payable</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-emerald-600">{filteredVerifiedOrders.length}</span>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
              </div>
            </button>
          </div>
        </div>

        {/* Daily Work Value Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
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
            <div className="flex items-end gap-2 h-44 px-1 pt-8 border-b border-slate-100">
              {chartData.map(d => {
                const heightPct = Math.max(4, (d.amount / maxChartAmount) * 100);
                return (
                  <div key={d.iso} className="relative flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {formatINR(d.amount)}
                    </div>
                    <div
                      className="w-full max-w-[28px] rounded-t bg-indigo-500 group-hover:bg-indigo-600 transition-colors"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {chartData.length > 0 && (
            <div className="flex gap-2 px-1 mt-1.5">
              {chartData.map(d => (
                <span key={d.iso} className="flex-1 text-center text-[10px] font-semibold text-slate-500 whitespace-nowrap">{d.label}</span>
              ))}
            </div>
          )}
        </div>
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
                            <span>{isTonBasedWork(entry.work) ? 'Qty in Tons' : 'Per Person'}</span>
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
