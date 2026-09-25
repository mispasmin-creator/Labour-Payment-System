import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  RefreshCw,
  Search,
  Calendar,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle2,
  Layers,
  Building2,
  Box,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import {
  fetchSemiActualEntries,
  fetchCrushingActualEntries,
  fetchSemiProduction
} from '../services/supabaseClient';
import { formatDate, formatINR, parseDate } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';
import { Modal } from '../components/common/Modal';

function formatQty(val) {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return Number(num.toFixed(3)).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatDisplayTimestamp(ts) {
  if (!ts) return '-';
  const d = parseDate(ts);
  if (!d) return String(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatShortDate(dStr) {
  if (!dStr) return '-';
  const d = parseDate(dStr);
  if (!d) return String(dStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function ProductionPage() {
  // Primary Department Tabs: 'semi_actual' (Actual Production Entry) | 'crushing_actual' (Crushing Department)
  const [department, setDepartment] = useState('semi_actual');

  // Sub-tabs under Actual Production Entry: 'test_history' | 'pending_tests' | 'summary'
  const [semiTab, setSemiTab] = useState('test_history');

  // Raw Datasets from Supabase
  const [semiActuals, setSemiActuals] = useState([]);
  const [crushingActuals, setCrushingActuals] = useState([]);
  const [semiProductions, setSemiProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters for Semi Actual
  const [selectedFirm, setSelectedFirm] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [viewEntry, setViewEntry] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Load Data from Supabase
  const loadSupabaseData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [actualsData, crushingData, prodData] = await Promise.all([
        fetchSemiActualEntries(),
        fetchCrushingActualEntries(),
        fetchSemiProduction().catch(() => [])
      ]);

      setSemiActuals(actualsData);
      setCrushingActuals(crushingData);
      setSemiProductions(prodData);
    } catch (err) {
      console.error('Error loading Supabase data:', err);
      setError(err.message || 'Failed to connect to Supabase. Check internet or credentials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSupabaseData();
  }, []);

  // Map SF-No to Firm Name from semi_production
  const sfFirmMap = useMemo(() => {
    const map = {};
    semiProductions.forEach((r) => {
      const k = String(r['SF-Sr No.'] || '').trim().toUpperCase();
      if (k) {
        map[k] = r['Firm name'] || r['Firm Name'] || '';
      }
    });
    return map;
  }, [semiProductions]);

  // Enrich semiActuals with Firm Name
  const enrichedSemiActuals = useMemo(() => {
    return semiActuals
      .filter((item) => {
        const sNo = String(item['S No.'] || '').trim().toUpperCase();
        return !sNo.startsWith('CR-'); // Crushing records are separated to Crushing tab
      })
      .map((item) => {
        const sfNoKey = String(item['Semi Finished Production No.'] || '').trim().toUpperCase();
        const mappedFirm = item['Firm Name'] || sfFirmMap[sfNoKey] || '';
        return {
          ...item,
          firmName: mappedFirm || 'Pmmpl'
        };
      });
  }, [semiActuals, sfFirmMap]);

  // Distinct Firms for Filter Dropdown
  const firmOptions = useMemo(() => {
    const set = new Set();
    enrichedSemiActuals.forEach((r) => {
      if (r.firmName) set.add(r.firmName);
    });
    return Array.from(set).sort();
  }, [enrichedSemiActuals]);

  // Distinct Products for Filter Dropdown
  const productOptions = useMemo(() => {
    const set = new Set();
    enrichedSemiActuals.forEach((r) => {
      if (r['Product Name']) set.add(r['Product Name']);
    });
    return Array.from(set).sort();
  }, [enrichedSemiActuals]);

  // Counts for Badges
  const pendingCountSemiActual = useMemo(() => {
    return enrichedSemiActuals.filter((item) => {
      const st = String(item.Status || item.Status1 || '').trim().toUpperCase();
      return !st.includes('DONE') && !st.includes('OK');
    }).length;
  }, [enrichedSemiActuals]);

  const totalHistoryCountSemiActual = useMemo(() => {
    return enrichedSemiActuals.length;
  }, [enrichedSemiActuals]);

  // Filtered dataset for Semi Actual
  const filteredSemiActual = useMemo(() => {
    return enrichedSemiActuals.filter((item) => {
      if (!item) return false;

      // Pending Tests Tab Filter
      if (semiTab === 'pending_tests') {
        const st = String(item.Status || item.Status1 || '').trim().toUpperCase();
        if (st.includes('DONE') || st.includes('OK')) return false;
      }

      // Firm Filter
      if (selectedFirm !== 'ALL' && item.firmName.toLowerCase() !== selectedFirm.toLowerCase()) {
        return false;
      }

      // Product Filter
      if (selectedProduct !== 'ALL' && item['Product Name'] !== selectedProduct) {
        return false;
      }

      // Date Filtering
      const recordDate = item['Date Of Production'] || item.Timestamp;
      if (dateFrom || dateTo) {
        if (recordDate) {
          const parsed = parseDate(recordDate);
          if (parsed) {
            const iso = parsed.toISOString().split('T')[0];
            if (dateFrom && iso < dateFrom) return false;
            if (dateTo && iso > dateTo) return false;
          }
        }
      }

      // Search Filtering
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const values = [
          item['S No.'],
          item.firmName,
          item['Semi Finished Job Card No.'],
          item['Semi Finished Production No.'],
          item['Product Name'],
          item['Supervisor Name'],
          item.Status
        ].map((v) => String(v || '').toLowerCase());
        const match = values.some((val) => val.includes(q));
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.Timestamp || a['Date Of Production'] || 0).getTime();
      const timeB = new Date(b.Timestamp || b['Date Of Production'] || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [enrichedSemiActuals, semiTab, selectedFirm, selectedProduct, dateFrom, dateTo, searchTerm]);

  // Filtered dataset for Crushing
  const filteredCrushing = useMemo(() => {
    return crushingActuals.filter((item) => {
      if (!item) return false;

      // Date Filtering
      const recordDate = item['Date Of Production'] || item.Timestamp;
      if (dateFrom || dateTo) {
        if (recordDate) {
          const parsed = parseDate(recordDate);
          if (parsed) {
            const iso = parsed.toISOString().split('T')[0];
            if (dateFrom && iso < dateFrom) return false;
            if (dateTo && iso > dateTo) return false;
          }
        }
      }

      // Search Filtering
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = Object.values(item).some((v) => String(v || '').toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.Timestamp || a['Date Of Production'] || 0).getTime();
      const timeB = new Date(b.Timestamp || b['Date Of Production'] || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [crushingActuals, dateFrom, dateTo, searchTerm]);

  // Active dataset according to Department
  const activeDataset = department === 'semi_actual' ? filteredSemiActual : filteredCrushing;

  // Aggregate stats matching Production React summary exactly
  const totalMachineHours = useMemo(() => {
    return activeDataset.reduce((sum, item) => {
      return sum + (Number(item['Machine Running hour'] || item['Machine Running Hour']) || 0);
    }, 0);
  }, [activeDataset]);

  const totalQty = useMemo(() => {
    return activeDataset.reduce((sum, item) => {
      return sum + (Number(item['Qty Of Semi Finished Good'] || item['Qty Of Crushing Product']) || 0);
    }, 0);
  }, [activeDataset]);

  // Summary breakdown
  const summaryByFirm = useMemo(() => {
    const map = {};
    enrichedSemiActuals.forEach((r) => {
      const f = r.firmName || 'Other';
      if (!map[f]) map[f] = { firm: f, count: 0, hours: 0, qty: 0 };
      map[f].count += 1;
      map[f].hours += Number(r['Machine Running hour']) || 0;
      map[f].qty += Number(r['Qty Of Semi Finished Good']) || 0;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [enrichedSemiActuals]);

  const summaryByProduct = useMemo(() => {
    const map = {};
    enrichedSemiActuals.forEach((r) => {
      const p = r['Product Name'] || 'Other';
      if (!map[p]) map[p] = { product: p, count: 0, hours: 0, qty: 0 };
      map[p].count += 1;
      map[p].hours += Number(r['Machine Running hour']) || 0;
      map[p].qty += Number(r['Qty Of Semi Finished Good']) || 0;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [enrichedSemiActuals]);

  // CSV Export
  const handleExportCSV = () => {
    if (!activeDataset || activeDataset.length === 0) return;
    const filename = `Production_${department}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(activeDataset, filename);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* =========================================================================
          TOP HEADER MATCHING PRODUCTION REACT
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <Factory size={22} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {department === 'semi_actual' ? 'Actual Production Entry' : 'Crushing Department'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {department === 'semi_actual'
                ? 'Log daily production entries for semi-finished goods'
                : 'Crushing department raw material input & finished goods output'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            title="Export CSV"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadSupabaseData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs px-3.5 py-2 transition-colors disabled:opacity-60"
            title="Refresh Data from Supabase"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-rose-700">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <div className="font-bold text-sm">Connection Notice</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadSupabaseData(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg px-3 py-1.5 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          PRIMARY DEPARTMENT TABS (Screenshot 1: Actual Production vs Crushing)
          ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => {
            setDepartment('semi_actual');
            setSemiTab('test_history');
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
            department === 'semi_actual'
              ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 bg-slate-100/60'
          }`}
        >
          <Layers size={17} className={department === 'semi_actual' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Actual Production Entry</span>
          <span
            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
              department === 'semi_actual' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalHistoryCountSemiActual}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDepartment('crushing_actual')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
            department === 'crushing_actual'
              ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 bg-slate-100/60'
          }`}
        >
          <Factory size={17} className={department === 'crushing_actual' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Crushing Department</span>
          <span
            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
              department === 'crushing_actual' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {crushingActuals.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TABS FOR ACTUAL PRODUCTION (Pending Tests, Test History, Summary)
          ========================================================================= */}
      {department === 'semi_actual' && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSemiTab('pending_tests')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              semiTab === 'pending_tests'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={14} />
            <span>Pending Tests</span>
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-full ${
                semiTab === 'pending_tests' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingCountSemiActual}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSemiTab('test_history')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              semiTab === 'test_history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Test History</span>
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-full ${
                semiTab === 'test_history' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {totalHistoryCountSemiActual}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSemiTab('summary')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              semiTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={14} />
            <span>Summary</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          FILTER TOOLBAR (All Firms, Product, Dates, Machine Hours, Qty, Search)
          ========================================================================= */}
      {!(department === 'semi_actual' && semiTab === 'summary') && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Firm Dropdown (only for Semi Actual) */}
            {department === 'semi_actual' && (
              <div className="relative flex items-center">
                <Building2 size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedFirm}
                  onChange={(e) => setSelectedFirm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="ALL">All Firms</option>
                  {firmOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 text-slate-400 pointer-events-none text-[10px]">&#9662;</div>
              </div>
            )}

            {/* Product Dropdown (only for Semi Actual) */}
            {department === 'semi_actual' && (
              <div className="relative flex items-center">
                <Box size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer appearance-none max-w-[200px] truncate"
                >
                  <option value="ALL">Product: All Products</option>
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 text-slate-400 pointer-events-none text-[10px]">&#9662;</div>
              </div>
            )}

            {/* From Date Picker */}
            <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg text-xs text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>

            {/* To Date Picker */}
            <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg text-xs text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              <span className="font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Reset Filters button if any filter active */}
            {(selectedFirm !== 'ALL' || selectedProduct !== 'ALL' || dateFrom || dateTo || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFirm('ALL');
                  setSelectedProduct('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setSearchTerm('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Right Side: Stat Badges & Search Box */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Total Machine Hours Badge (Yellow/Amber Pill) */}
            <div className="bg-amber-50/90 border border-amber-300 rounded-lg px-3 py-1.5 shadow-2xs whitespace-nowrap">
              <span className="text-slate-600 text-xs font-medium">Total Machine Hours: </span>
              <span className="font-extrabold text-amber-900 text-xs tracking-tight">
                {totalMachineHours.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}{' '}
                Hrs
              </span>
            </div>

            {/* Total Qty Badge (Green/Emerald Pill) */}
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg px-3 py-1.5 shadow-2xs whitespace-nowrap">
              <span className="text-slate-600 text-xs font-medium">Total Qty: </span>
              <span className="font-extrabold text-emerald-900 text-xs tracking-tight">
                {totalQty.toLocaleString('en-IN', {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3
                })}{' '}
                MT
              </span>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search entries..."
                className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT CARD: TABLES OR SUMMARY
          ========================================================================= */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
            <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2.5" />
            <div className="font-bold text-sm">Loading Production Data from Supabase...</div>
          </div>
        ) : department === 'semi_actual' && semiTab === 'summary' ? (
          /* =====================================================================
              SUMMARY TAB VIEW (Semi Actual)
              ===================================================================== */
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Total Entries</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{totalHistoryCountSemiActual}</div>
                <div className="text-xs text-slate-500 mt-1">Pending tests: {pendingCountSemiActual}</div>
              </div>
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div className="text-xs font-bold text-amber-800 uppercase">Total Machine Running</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {totalMachineHours.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Hrs
                </div>
                <div className="text-xs text-amber-700 mt-1">Aggregated across all production entries</div>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <div className="text-xs font-bold text-emerald-800 uppercase">Total Semi-Finished Qty</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {totalQty.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT
                </div>
                <div className="text-xs text-emerald-700 mt-1">Total metric tonnes produced</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Firm Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase flex items-center gap-2">
                  <Building2 size={14} className="text-emerald-600" />
                  <span>Firm-Wise Production Breakdown</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Firm Name</th>
                      <th className="px-4 py-2 font-semibold text-center">Entries</th>
                      <th className="px-4 py-2 font-semibold text-right">Machine Hours</th>
                      <th className="px-4 py-2 font-semibold text-right">Total Qty (MT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryByFirm.map((item) => (
                      <tr key={item.firm} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{item.firm}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600 font-medium">{item.count}</td>
                        <td className="px-4 py-2.5 text-right text-amber-800 font-bold">
                          {item.hours.toFixed(2)} hrs
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-700 font-bold">
                          {item.qty.toFixed(3)} MT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Product Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase flex items-center gap-2">
                  <Box size={14} className="text-emerald-600" />
                  <span>Top Product Output Breakdown</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Product Name</th>
                      <th className="px-4 py-2 font-semibold text-center">Entries</th>
                      <th className="px-4 py-2 font-semibold text-right">Total Qty (MT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryByProduct.map((item) => (
                      <tr key={item.product} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-800 truncate max-w-[200px]">
                          {item.product}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-600 font-medium">{item.count}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-700 font-bold">
                          {item.qty.toFixed(3)} MT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeDataset.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-5">
            <FileSpreadsheet size={36} className="text-slate-300 mb-2.5" />
            <div className="text-sm font-bold text-slate-800">No records found matching filters</div>
            <div className="text-xs text-slate-500 mt-1">Try resetting the firm, product, or date filters.</div>
            <button
              type="button"
              onClick={() => {
                setSelectedFirm('ALL');
                setSelectedProduct('ALL');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
              }}
              className="mt-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 shadow-2xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* Table Header: Title + Dynamic Count */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-slate-500" />
                <span className="font-bold text-xs text-slate-700">
                  {department === 'crushing_actual'
                    ? `Crushing Records (${activeDataset.length})`
                    : semiTab === 'pending_tests'
                    ? `Pending Tests (${activeDataset.length})`
                    : `Production History (${activeDataset.length})`}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Latest entries first &bull; Live synced with Supabase
              </span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {/* =================================================================
                  SEMI ACTUAL TABLE (Screenshot 2 exact columns)
                  ================================================================= */}
              {department === 'semi_actual' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        ACTION
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        S NO.
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        TIMESTAMP
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        FIRM NAME
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        SJC NO.
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        SF NO.
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        PRODUCT
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap text-right">
                        QTY
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        PROCESSING COST
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        DATE OF PROD.
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        SUPERVISOR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDataset.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Action View Button */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewEntry(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
                            title="View Full Entry Details"
                          >
                            <Eye size={13} className="text-indigo-600" />
                            <span>View</span>
                          </button>
                        </td>

                        {/* S NO. (e.g. SA-1865) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-bold text-indigo-600 text-xs tracking-tight">
                            {row['S No.'] || '-'}
                          </span>
                        </td>

                        {/* TIMESTAMP */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-medium">
                            {formatDisplayTimestamp(row.Timestamp)}
                          </span>
                        </td>

                        {/* FIRM NAME (e.g. Pmmpl / Purab / Rkl) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800 text-xs">
                            {row.firmName || '-'}
                          </span>
                        </td>

                        {/* SJC NO. (e.g. SJC-455) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-medium text-indigo-600 text-xs">
                            {row['Semi Finished Job Card No.'] || '-'}
                          </span>
                        </td>

                        {/* SF NO. (e.g. SF-21) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-medium text-indigo-600 text-xs">
                            {row['Semi Finished Production No.'] || '-'}
                          </span>
                        </td>

                        {/* PRODUCT (e.g. MC - 90 Fines) */}
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-800 text-xs max-w-[200px] truncate" title={row['Product Name']}>
                            {row['Product Name'] || '-'}
                          </div>
                        </td>

                        {/* QTY (e.g. 2.6) */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <span className="font-extrabold text-slate-800 text-xs">
                            {formatQty(row['Qty Of Semi Finished Good'])}
                          </span>
                        </td>

                        {/* PROCESSING COST (e.g. ₹1500) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-bold text-emerald-600 text-xs">
                            {row['Processing Cost'] !== null && row['Processing Cost'] !== undefined
                              ? `₹${Number(row['Processing Cost']).toLocaleString('en-IN')}`
                              : '-'}
                          </span>
                        </td>

                        {/* DATE OF PROD. (e.g. 24/09/26) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-600 font-medium">
                            {formatShortDate(row['Date Of Production'])}
                          </span>
                        </td>

                        {/* SUPERVISOR (e.g. Devendra) */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">
                            {row['Supervisor Name'] || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* =================================================================
                    CRUSHING DEPARTMENT TABLE
                    ================================================================= */
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        TIMESTAMP / DATE
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        FIRM NAME
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        INPUT PRODUCT
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap text-right">
                        INPUT QTY
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        FINISHED GOODS
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        MACHINE HOURS
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        PHOTOS
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        REMARKS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDataset.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs">
                            {formatDisplayTimestamp(row.Timestamp || row['Date Of Production'])}
                          </div>
                          {row['Date Of Production'] && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Prod: {formatDate(row['Date Of Production'])}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs">{row['Firm Name'] || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-800 text-xs max-w-[180px] truncate">
                            {row['Crushing Product Name'] || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="font-extrabold text-emerald-700 text-xs">
                            {row['Qty Of Crushing Product'] ? `${formatQty(row['Qty Of Crushing Product'])} MT` : '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs space-y-1">
                            {row['Finished Goods Name 1'] && (
                              <div>
                                <span className="font-semibold text-slate-800">{row['Finished Goods Name 1']}</span>
                                <span className="text-emerald-700 font-bold ml-1">({formatQty(row['Qty 1'])} MT)</span>
                              </div>
                            )}
                            {row['Finished Goods Name 2'] && (
                              <div>
                                <span className="font-semibold text-slate-800">{row['Finished Goods Name 2']}</span>
                                <span className="text-emerald-700 font-bold ml-1">({formatQty(row['Qty 2'])} MT)</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-bold text-slate-700 text-xs">
                            {row['Machine Running Hour'] ? `${row['Machine Running Hour']} hrs` : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {row['Starting Reading Photo'] && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: row['Starting Reading Photo'],
                                    title: `Start Reading - ${row['Firm Name'] || ''}`
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                              >
                                <Eye size={11} />
                                <span>Start</span>
                              </button>
                            )}
                            {row['Ending Reading Photo'] && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: row['Ending Reading Photo'],
                                    title: `End Reading - ${row['Firm Name'] || ''}`
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              >
                                <Eye size={11} />
                                <span>End</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-slate-500 max-w-[150px] truncate block" title={row.Remarks || ''}>
                            {row.Remarks || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          VIEW DETAIL MODAL (Opens when clicking View in table)
          ========================================================================= */}
      {viewEntry && (
        <Modal
          isOpen={Boolean(viewEntry)}
          onClose={() => setViewEntry(null)}
          title={`Production Entry Details: ${viewEntry['S No.'] || 'Details'}`}
          maxWidth="720px"
        >
          <div className="space-y-4 text-xs">
            {/* Top Key Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Firm Name</span>
                <span className="font-bold text-slate-800 text-sm">{viewEntry.firmName || '-'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Job Card (SJC)</span>
                <span className="font-bold text-indigo-600 text-sm">{viewEntry['Semi Finished Job Card No.'] || '-'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">SF Prod No.</span>
                <span className="font-bold text-indigo-600 text-sm">{viewEntry['Semi Finished Production No.'] || '-'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Supervisor</span>
                <span className="font-bold text-slate-800 text-sm">{viewEntry['Supervisor Name'] || '-'}</span>
              </div>
            </div>

            {/* Product & Qty Card */}
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Produced Product</span>
                <div className="text-base font-black text-slate-900 mt-0.5">{viewEntry['Product Name'] || '-'}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Date of Production: {formatDate(viewEntry['Date Of Production'])} &bull; Timestamp: {formatDisplayTimestamp(viewEntry.Timestamp)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Output Quantity</span>
                <div className="text-2xl font-black text-emerald-700">
                  {formatQty(viewEntry['Qty Of Semi Finished Good'])} MT
                </div>
                {viewEntry['Processing Cost'] && (
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">
                    Cost: ₹{Number(viewEntry['Processing Cost']).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            {/* Machine Running Hours & Readings */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
              <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Clock size={14} className="text-amber-600" />
                <span>Machine Meter Readings & Running Hours</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block">Start Reading</span>
                  <span className="font-bold text-slate-800 text-sm">{viewEntry['Starting Reading'] || '-'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block">End Reading</span>
                  <span className="font-bold text-slate-800 text-sm">{viewEntry['Ending Reading'] || '-'}</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 font-bold block">Running Hours</span>
                  <span className="font-black text-amber-900 text-sm">
                    {viewEntry['Machine Running hour'] ? `${viewEntry['Machine Running hour']} hrs` : '-'}
                  </span>
                </div>
              </div>

              {/* Photos Preview Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {viewEntry['Starting Reading Photo'] && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: viewEntry['Starting Reading Photo'],
                        title: `Start Reading Photo - ${viewEntry['S No.']}`
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors"
                  >
                    <ImageIcon size={14} />
                    <span>View Start Photo</span>
                  </button>
                )}
                {viewEntry['Ending Reading Photo'] && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: viewEntry['Ending Reading Photo'],
                        title: `End Reading Photo - ${viewEntry['S No.']}`
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 transition-colors"
                  >
                    <ImageIcon size={14} />
                    <span>View End Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Raw Materials Consumed */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-white">
              <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Box size={14} className="text-indigo-600" />
                <span>Raw Materials Consumed</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((idx) => {
                  const rmName = viewEntry[`Raw Material Name ${idx}`];
                  const rmQty = viewEntry[`Quantity Of Raw Material ${idx}`];
                  if (!rmName && (!rmQty || rmQty === 0)) return null;
                  return (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{rmName || `Raw Material ${idx}`}</span>
                      <span className="font-bold text-emerald-700">{formatQty(rmQty)} MT</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* End Product & Remarks if any */}
            {(viewEntry.Narration || viewEntry.Status || viewEntry['End Product Name']) && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                {viewEntry['End Product Name'] && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">End Product:</span>
                    <span className="font-bold text-slate-800">
                      {viewEntry['End Product Name']} ({formatQty(viewEntry['End Product Qty'])} MT)
                    </span>
                  </div>
                )}
                {viewEntry.Status && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Testing Status:</span>
                    <span className="font-bold text-slate-800">{viewEntry.Status}</span>
                  </div>
                )}
                {viewEntry.Narration && (
                  <div className="text-xs pt-1 text-slate-600">
                    <span className="font-medium text-slate-500">Narration: </span>
                    {viewEntry.Narration}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewEntry(null)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          PHOTO PREVIEW MODAL
          ========================================================================= */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title={previewPhoto.title || 'Reading Photo Preview'}
          maxWidth="640px"
        >
          <div className="text-center">
            <img
              src={previewPhoto.url}
              alt="Meter Reading Photo"
              className="max-w-full max-h-[520px] rounded-lg border border-slate-200 shadow-md object-contain mx-auto"
            />
            <div className="mt-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
