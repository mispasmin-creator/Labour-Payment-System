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
    <div>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064E3B 100%)',
          borderRadius: 14,
          padding: '16px 24px',
          color: '#FFFFFF',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.25)'
        }}
      >
        <h1 style={{ color: '#FFFFFF', fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
          Production Management
        </h1>

        <button
          onClick={() => loadSupabaseData(true)}
          disabled={refreshing || loading}
          className="btn btn-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 8
          }}
          title="Refresh Data"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Supabase Connection Notice</div>
              <div style={{ fontSize: '0.82rem' }}>{error}</div>
            </div>
          </div>
          <button
            onClick={() => loadSupabaseData(true)}
            className="btn btn-sm"
            style={{ background: '#DC2626', color: '#FFFFFF' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Department Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: 2,
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('semi_actual')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'semi_actual' ? '3px solid #059669' : '3px solid transparent',
            background: activeTab === 'semi_actual' ? '#ECFDF5' : 'transparent',
            color: activeTab === 'semi_actual' ? '#065F46' : '#64748B',
            fontWeight: activeTab === 'semi_actual' ? 800 : 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '0.92rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={18} />
          <span>Actual Production Entry</span>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12,
              background: activeTab === 'semi_actual' ? '#059669' : '#E2E8F0',
              color: activeTab === 'semi_actual' ? '#FFFFFF' : '#475569'
            }}
          >
            {displayCountSemiActual}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crushing_actual')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'crushing_actual' ? '3px solid #059669' : '3px solid transparent',
            background: activeTab === 'crushing_actual' ? '#ECFDF5' : 'transparent',
            color: activeTab === 'crushing_actual' ? '#065F46' : '#64748B',
            fontWeight: activeTab === 'crushing_actual' ? 800 : 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '0.92rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Factory size={18} />
          <span>Crushing Department</span>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12,
              background: activeTab === 'crushing_actual' ? '#059669' : '#E2E8F0',
              color: activeTab === 'crushing_actual' ? '#FFFFFF' : '#475569'
            }}
          >
            {crushingActuals.length}
          </span>
        </button>
      </div>

      {/* Sleek Filter & Search Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          padding: '8px 14px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: 10
        }}
      >
        {/* Left Side: Week Navigation & Preset Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 2 }}>
            <Calendar size={16} color="#059669" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
              Date Filter:
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              title="Previous Week"
              style={{
                background: '#F8FAFC',
                border: 'none',
                borderRight: '1px solid #CBD5E1',
                padding: '4px 7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              title="Next Week"
              style={{
                background: '#F8FAFC',
                border: 'none',
                padding: '4px 7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {['This Week', 'Last Week', 'This Month', 'All Time'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSetPreset(preset)}
              style={{
                padding: '5px 9px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: selectedPreset === preset ? 700 : 500,
                background: selectedPreset === preset ? '#0F172A' : '#F1F5F9',
                color: selectedPreset === preset ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {preset}
            </button>
          ))}

          {/* Completed Only Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyCompleted(!onlyCompleted)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: onlyCompleted ? '1.5px solid #059669' : '1px solid #CBD5E1',
              background: onlyCompleted ? '#ECFDF5' : '#F8FAFC',
              color: onlyCompleted ? '#065F46' : '#64748B',
              boxShadow: onlyCompleted ? '0 1px 3px rgba(5, 150, 105, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Click to toggle between Completed Only and All records"
          >
            <CheckCircle2 size={14} color={onlyCompleted ? '#059669' : '#94A3B8'} />
            <span>{onlyCompleted ? 'Completed Only' : 'All Statuses'}</span>
          </button>
        </div>

        {/* Right Side: Custom Date Pickers, Status & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#475569', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600 }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedPreset('');
              }}
              style={{
                padding: '4px 6px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                background: '#FFFFFF',
                color: '#0F172A',
                width: 122
              }}
            />
            <span style={{ fontWeight: 600, marginLeft: 2 }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedPreset('');
              }}
              style={{
                padding: '4px 6px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                background: '#FFFFFF',
                color: '#0F172A',
                width: 122
              }}
            />
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: 8 }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '4px 8px 4px 25px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.78rem',
                width: 125,
                background: '#FFFFFF'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 2
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {(dateFrom || dateTo || searchTerm || selectedPreset !== 'All Time') && (
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#FEE2E2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title="Reset all filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>


        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#059669' }} />
            <div style={{ fontWeight: 700 }}>Loading Supabase Production Data...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <FileSpreadsheet size={36} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>
              No production records found
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
              Try changing the date range, clearing search terms, or clicking "All Time".
            </div>
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              className="btn btn-outline-green btn-sm"
              style={{ marginTop: 12 }}
            >
              Show All Time Records
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '680px', overflowY: 'auto' }}>
            {/* ============================================================
                TAB 1: ACTUAL PRODUCTION ENTRY TABLE
                ============================================================ */}
            {activeTab === 'semi_actual' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S No.</th>
                    <th>Timestamp / Date</th>
                    <th>SJC Ref No.</th>
                    <th>SF Prod No.</th>
                    <th>Supervisor</th>
                    <th>Product Name</th>
                    <th>SF Good Qty</th>
                    <th>Raw Material 1</th>
                    <th>Raw Material 2</th>
                    <th>Machine Running</th>
                    <th>Photos</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => (
                    <tr key={row.id || row['S No.']}>
                      <td>
                        <span className="work-id-badge">{row['S No.']}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {formatDisplayTimestamp(row.Timestamp || row['Date Of Production'])}
                        </div>
                        {row['Date Of Production'] && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', marginTop: 2 }}>
                            Prod: {formatDate(row['Date Of Production'])}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>
                          {row['Semi Finished Job Card No.'] || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#2563EB', fontSize: '0.85rem' }}>
                          {row['Semi Finished Production No.'] || '-'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Supervisor Name']}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', maxWidth: 200 }}>
                          {row['Product Name']}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.92rem' }}>
                          {row['Qty Of Semi Finished Good'] !== null && row['Qty Of Semi Finished Good'] !== undefined ? `${formatQty(row['Qty Of Semi Finished Good'])} MT` : '-'}
                        </div>
                      </td>
                      <td>
                        {row['Raw Material Name 1'] ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Raw Material Name 1']}</div>
                            <div style={{ color: '#059669', fontWeight: 700 }}>
                              {row['Quantity Of Raw Material 1'] !== null && row['Quantity Of Raw Material 1'] !== undefined ? `${formatQty(row['Quantity Of Raw Material 1'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {row['Raw Material Name 2'] ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Raw Material Name 2']}</div>
                            <div style={{ color: '#059669', fontWeight: 700 }}>
                              {row['Quantity Of Raw Material 2'] !== null && row['Quantity Of Raw Material 2'] !== undefined ? `${formatQty(row['Quantity Of Raw Material 2'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {row['Machine Running hour'] ? `${row['Machine Running hour']} hrs` : '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row['Starting Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Starting Reading Photo'], title: `Start Reading - ${row['S No.']}` })}
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="View Start Photo"
                            >
                              <Eye size={12} />
                              <span>Start</span>
                            </button>
                          )}
                          {row['Ending Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Ending Reading Photo'], title: `End Reading - ${row['S No.']}` })}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#047857',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="View End Photo"
                            >
                              <Eye size={12} />
                              <span>End</span>
                            </button>
                          )}
                          {!row['Starting Reading Photo'] && !row['Ending Reading Photo'] && (
                            <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>No photo</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            String(row.Status || row.Status1).toUpperCase() === 'DONE'
                              ? 'badge-verified'
                              : 'badge-amber'
                          }`}
                          style={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 800 }}
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp / Date</th>
                    <th>Firm Name</th>
                    <th>Input Product</th>
                    <th>Input Qty</th>
                    <th>Finished Good 1</th>
                    <th>Finished Good 2</th>
                    <th>Finished Good 3</th>
                    <th>Machine Hours</th>
                    <th>Photos</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {formatDisplayTimestamp(row.Timestamp || row['Date Of Production'])}
                        </div>
                        {row['Date Of Production'] && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', marginTop: 2 }}>
                            Prod: {formatDate(row['Date Of Production'])}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.86rem' }}>
                          {row['Firm Name'] || '-'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', maxWidth: 180 }}>
                          {row['Crushing Product Name']}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#B45309', fontSize: '0.92rem' }}>
                          {row['Qty Of Crushing Product'] !== null && row['Qty Of Crushing Product'] !== undefined ? `${formatQty(row['Qty Of Crushing Product'])} MT` : '-'}
                        </div>
                      </td>
                      <td>
                        {row['Finished Goods Name 1'] ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Finished Goods Name 1']}</div>
                            <div style={{ color: '#059669', fontWeight: 700 }}>
                              {row['Qty 1'] !== null && row['Qty 1'] !== undefined ? `${formatQty(row['Qty 1'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {row['Finished Goods Name 2'] ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Finished Goods Name 2']}</div>
                            <div style={{ color: '#059669', fontWeight: 700 }}>
                              {row['Qty 2'] !== null && row['Qty 2'] !== undefined ? `${formatQty(row['Qty 2'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {row['Finished Goods Name 3'] && row['Qty 3'] > 0 ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{row['Finished Goods Name 3']}</div>
                            <div style={{ color: '#059669', fontWeight: 700 }}>
                              {row['Qty 3'] !== null && row['Qty 3'] !== undefined ? `${formatQty(row['Qty 3'])} MT` : '-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {row['Machine Running Hour'] ? `${row['Machine Running Hour']} hrs` : '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row['Starting Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Starting Reading Photo'], title: `Crushing Start - ${row['Firm Name'] || ''}` })}
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="View Start Photo"
                            >
                              <Eye size={12} />
                              <span>Start</span>
                            </button>
                          )}
                          {row['Ending Reading Photo'] && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({ url: row['Ending Reading Photo'], title: `Crushing End - ${row['Firm Name'] || ''}` })}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#047857',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="View End Photo"
                            >
                              <Eye size={12} />
                              <span>End</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem',
                            color: '#64748B'
                          }}
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
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <img
              src={previewPhoto.url}
              alt="Reading Photo"
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                objectFit: 'contain'
              }}
            />
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="btn btn-secondary btn-sm"
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
