import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  RefreshCw,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  fetchSemiActualEntries,
  fetchCrushingActualEntries
} from '../services/supabaseClient';
import { formatDate, formatINR, parseDate } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';
import { Modal } from '../components/common/Modal';

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

function formatQty(val) {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return Number(num.toFixed(2)).toLocaleString('en-IN');
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

export function ProductionPage() {
  const [activeTab, setActiveTab] = useState('semi_actual'); // 'semi_actual' | 'crushing_actual'

  // Data States
  const [semiActuals, setSemiActuals] = useState([]);
  const [crushingActuals, setCrushingActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter States
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('All Time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Load Data from Supabase
  const loadSupabaseData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [actualsData, crushingData] = await Promise.all([
        fetchSemiActualEntries(),
        fetchCrushingActualEntries()
      ]);

      setSemiActuals(actualsData);
      setCrushingActuals(crushingData);
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

  // Week Navigation Controls
  const handleShiftWeek = (offsetWeeks) => {
    const currentBase = dateFrom ? parseDate(dateFrom) || new Date() : new Date();
    const shifted = new Date(currentBase);
    shifted.setDate(shifted.getDate() + offsetWeeks * 7);
    const mon = getMondayOfDate(shifted);
    const sun = getSundayOfDate(mon);
    setDateFrom(toISODate(mon));
    setDateTo(toISODate(sun));
    setSelectedPreset('');
  };

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
      setStatusFilter('ALL');
    }
  };

  // Counts for tabs based on onlyCompleted
  const displayCountSemiActual = useMemo(() => {
    return semiActuals.filter((item) => {
      const sNo = String(item['S No.'] || '').trim().toUpperCase();
      if (sNo.startsWith('CR-')) return false;
      if (!onlyCompleted) return true;
      const st = String(item.Status || item.Status1 || '').trim().toUpperCase();
      return st.includes('DONE') || st.includes('OK');
    }).length;
  }, [semiActuals, onlyCompleted]);

  // Active dataset according to activeTab
  const currentDataset = useMemo(() => {
    if (activeTab === 'semi_actual') return semiActuals;
    return crushingActuals;
  }, [activeTab, semiActuals, crushingActuals]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    const list = currentDataset.filter((item) => {
      if (!item) return false;

      // Semi Actual: Exclude Crushing (CR-) records to only show Semi Actual (SA-) records
      if (activeTab === 'semi_actual') {
        const sNo = String(item['S No.'] || '').trim().toUpperCase();
        if (sNo.startsWith('CR-')) return false;
      }

      // Only Completed Data Filter
      if (onlyCompleted) {
        if (activeTab === 'semi_actual') {
          const st = String(item.Status || item.Status1 || '').trim().toUpperCase();
          if (!st.includes('DONE') && !st.includes('OK')) return false;
        }
      }

      // Date Filtering
      const recordDate = item['Date Of Production'] || item.Timestamp;
      if (dateFrom || dateTo) {
        if (recordDate) {
          const parsed = parseDate(recordDate);
          if (parsed) {
            const iso = toISODate(parsed);
            if (dateFrom && iso < dateFrom) return false;
            if (dateTo && iso > dateTo) return false;
          }
        }
      }

      // Status Filtering
      if (statusFilter !== 'ALL') {
        const itemStatus = String(item.Status || item.Status1 || '').toUpperCase();
        if (!itemStatus.includes(statusFilter)) return false;
      }

      // Search Filtering
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const values = Object.values(item).map((v) => String(v || '').toLowerCase());
        const match = values.some((val) => val.includes(q));
        if (!match) return false;
      }

      return true;
    });

    // Always sort latest first by Timestamp descending (fallback to Date Of Production or id)
    return list.sort((a, b) => {
      const timeA = new Date(a.Timestamp || a['Date Of Production'] || 0).getTime();
      const timeB = new Date(b.Timestamp || b['Date Of Production'] || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [currentDataset, activeTab, onlyCompleted, dateFrom, dateTo, statusFilter, searchTerm]);

  // CSV Export for active tab
  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) return;
    const filename = `Production_${activeTab}_${toISODate(new Date())}`;
    exportToCSV(filteredData, filename);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Factory size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Production Management</h1>
            <p className="text-xs text-slate-500">
              {activeTab === 'semi_actual' ? 'Actual Production Entry' : 'Crushing Department'} &bull; {filteredData.length} records
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadSupabaseData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm px-4 py-2 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-rose-700">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <div className="font-bold text-sm">Supabase Connection Notice</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadSupabaseData(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg px-3 py-1.5 shadow-sm transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Department Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 flex-wrap shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('semi_actual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'semi_actual'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={16} />
          <span>Actual Production Entry</span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'semi_actual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {displayCountSemiActual}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crushing_actual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'crushing_actual'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Factory size={16} />
          <span>Crushing Department</span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'crushing_actual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {crushingActuals.length}
          </span>
        </button>
      </div>

      {/* Sleek Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left Side: Week Navigation & Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <Calendar size={15} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Date Filter:</span>
          </div>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              title="Previous Week"
              className="bg-slate-50 hover:bg-slate-100 border-r border-slate-200 px-2 py-1.5 text-slate-500 flex items-center transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              title="Next Week"
              className="bg-slate-50 hover:bg-slate-100 px-2 py-1.5 text-slate-500 flex items-center transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {['This Week', 'Last Week', 'This Month', 'All Time'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSetPreset(preset)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedPreset === preset
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}

          {/* Completed Only Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyCompleted(!onlyCompleted)}
            title="Click to toggle between Completed Only and All records"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
              onlyCompleted
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <CheckCircle2 size={14} className={onlyCompleted ? 'text-emerald-600' : 'text-slate-400'} />
            <span>{onlyCompleted ? 'Completed Only' : 'All Statuses'}</span>
          </button>
        </div>

        {/* Right Side: Custom Date Pickers, Status & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
            <span className="font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedPreset('');
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="font-semibold">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedPreset('');
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs w-[130px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          {(dateFrom || dateTo || searchTerm || selectedPreset !== 'All Time') && (
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              title="Reset all filters"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 whitespace-nowrap transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-14">
            <RefreshCw size={26} className="animate-spin text-emerald-600 mb-2.5" />
            <div className="font-bold text-sm">Loading Supabase Production Data...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-14 px-5">
            <FileSpreadsheet size={34} className="text-slate-300 mb-2.5" />
            <div className="text-sm font-bold text-slate-800">No production records found</div>
            <div className="text-xs text-slate-500 mt-1">
              Try changing the date range, clearing search terms, or clicking "All Time".
            </div>
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              className="mt-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors"
            >
              Show All Time Records
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {/* ============================================================
                TAB 1: ACTUAL PRODUCTION ENTRY TABLE
                ============================================================ */}
            {activeTab === 'semi_actual' && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">S No.</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Timestamp / Date</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">SJC Ref No.</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">SF Prod No.</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Supervisor</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">SF Good Qty</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Raw Material 1</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Raw Material 2</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Machine Running</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Photos</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row) => (
                    <tr key={row.id || row['S No.']} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">{row['S No.']}</span>
                      </td>
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
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">
                          {row['Semi Finished Job Card No.'] || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-600 text-xs">
                          {row['Semi Finished Production No.'] || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800 text-xs">{row['Supervisor Name']}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800 text-xs max-w-[200px] truncate">
                          {row['Product Name']}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-extrabold text-emerald-700 text-xs">
                          {row['Qty Of Semi Finished Good'] !== null && row['Qty Of Semi Finished Good'] !== undefined ? `${formatQty(row['Qty Of Semi Finished Good'])} MT` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {row['Raw Material Name 1'] ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-800">{row['Raw Material Name 1']}</div>
                            <div className="text-emerald-700 font-bold">
                              {row['Quantity Of Raw Material 1'] !== null && row['Quantity Of Raw Material 1'] !== undefined ? `${formatQty(row['Quantity Of Raw Material 1'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row['Raw Material Name 2'] ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-800">{row['Raw Material Name 2']}</div>
                            <div className="text-emerald-700 font-bold">
                              {row['Quantity Of Raw Material 2'] !== null && row['Quantity Of Raw Material 2'] !== undefined ? `${formatQty(row['Quantity Of Raw Material 2'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-700 text-xs">
                          {row['Machine Running hour'] ? `${row['Machine Running hour']} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {row['Starting Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Starting Reading Photo'], title: `Start Reading - ${row['S No.']}` })}
                              title="View Start Photo"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 text-white"
                            >
                              <Eye size={12} />
                              <span>Start</span>
                            </button>
                          )}
                          {row['Ending Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Ending Reading Photo'], title: `End Reading - ${row['S No.']}` })}
                              title="View End Photo"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-teal-600 text-white"
                            >
                              <Eye size={12} />
                              <span>End</span>
                            </button>
                          )}
                          {!row['Starting Reading Photo'] && !row['Ending Reading Photo'] && (
                            <span className="text-slate-400 text-[11px]">No photo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                            String(row.Status || row.Status1).toUpperCase() === 'DONE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {row.Status || row.Status1 || 'DONE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ============================================================
                TAB 3: CRUSHING DEPARTMENT TABLE
                ============================================================ */}
            {activeTab === 'crushing_actual' && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-20 shadow-xs border-b border-slate-300">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Timestamp / Date</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Firm Name</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Input Product</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Input Qty</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Finished Good 1</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Finished Good 2</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Finished Good 3</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Machine Hours</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Photos</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row) => (
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
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-800 text-xs">
                          {row['Firm Name'] || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800 text-xs max-w-[180px] truncate">
                          {row['Crushing Product Name']}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-extrabold text-emerald-700 text-xs">
                          {row['Qty Of Crushing Product'] !== null && row['Qty Of Crushing Product'] !== undefined ? `${formatQty(row['Qty Of Crushing Product'])} MT` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {row['Finished Goods Name 1'] ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-800">{row['Finished Goods Name 1']}</div>
                            <div className="text-emerald-700 font-bold">
                              {row['Qty 1'] !== null && row['Qty 1'] !== undefined ? `${formatQty(row['Qty 1'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row['Finished Goods Name 2'] ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-800">{row['Finished Goods Name 2']}</div>
                            <div className="text-emerald-700 font-bold">
                              {row['Qty 2'] !== null && row['Qty 2'] !== undefined ? `${formatQty(row['Qty 2'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row['Finished Goods Name 3'] && row['Qty 3'] > 0 ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-800">{row['Finished Goods Name 3']}</div>
                            <div className="text-emerald-700 font-bold">
                              {row['Qty 3'] !== null && row['Qty 3'] !== undefined ? `${formatQty(row['Qty 3'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-700 text-xs">
                          {row['Machine Running Hour'] ? `${row['Machine Running Hour']} hrs` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {row['Starting Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Starting Reading Photo'], title: `Crushing Start - ${row['Firm Name'] || ''}` })}
                              title="View Start Photo"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-indigo-600 text-white"
                            >
                              <Eye size={12} />
                              <span>Start</span>
                            </button>
                          )}
                          {row['Ending Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Ending Reading Photo'], title: `Crushing End - ${row['Firm Name'] || ''}` })}
                              title="View End Photo"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all bg-teal-600 text-white"
                            >
                              <Eye size={12} />
                              <span>End</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div
                          className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500"
                          title={row.Remarks || ''}
                        >
                          {row.Remarks || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
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
              alt="Reading Photo"
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
