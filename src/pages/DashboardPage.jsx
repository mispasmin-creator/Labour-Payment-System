import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
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
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
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
  const { entries, counts, refreshData, syncing } = useApp();
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


  return (
    <div>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064E3B 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: '#FFFFFF',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)'
      }}>
        <div>
          <h1 style={{ color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Labour Payment System
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={refreshData}
            disabled={syncing}
            className="btn btn-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.4)',
              fontWeight: 700
            }}
            title="Sync & Refresh Data from Google Sheets"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>

          <button
            onClick={() => navigate('/new-entry')}
            className="btn btn-lg"
            style={{ background: '#FFFFFF', color: '#047857', fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
          >
            <PlusCircle size={18} />
            <span>New Work Entry</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="btn btn-lg"
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <FileSpreadsheet size={18} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          DATE RANGE & WEEK FILTER TOOLBAR
          ============================================================ */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        padding: '12px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Left Side: Week Navigation & Preset Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
            <Calendar size={18} color="#059669" />
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
              Date Filter:
            </span>
          </div>

          {/* Week Shift Controls */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              title="Previous Week"
              style={{
                background: '#F8FAFC',
                border: 'none',
                borderRight: '1px solid #CBD5E1',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              title="Next Week"
              style={{
                background: '#F8FAFC',
                border: 'none',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
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
              style={{
                padding: '6px 13px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: selectedPreset === preset ? 700 : 500,
                background: selectedPreset === preset ? '#0F172A' : '#F1F5F9',
                color: selectedPreset === preset ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Right Side: Custom Date Pickers, Search & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#475569' }}>
            <span style={{ fontWeight: 600 }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setSelectedPreset('');
              }}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                background: '#FFFFFF',
                color: '#0F172A'
              }}
            />
            <span style={{ fontWeight: 600, marginLeft: 2 }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setSelectedPreset('');
              }}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                background: '#FFFFFF',
                color: '#0F172A'
              }}
            />
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 9 }} />
            <input
              type="text"
              placeholder="Search activity, incharge..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '5px 8px 5px 28px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                width: 170,
                background: '#FFFFFF'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 2
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {(dateFrom || dateTo || searchTerm || selectedPreset !== 'All Time') && (
            <button
              type="button"
              onClick={() => handleSetPreset('All Time')}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                background: '#FEE2E2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
                cursor: 'pointer'
              }}
              title="Reset all filters to All Time"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Workflow Stage Cards: Verification & Payment Report */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Step 1: Verification */}
        <div
          className="metric-card amber"
          onClick={() => navigate('/verification')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-top">
            <div>
              <span className="metric-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>
                1. Work Verification
              </span>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                Site Supervisor / Ops Verification
              </div>
            </div>
            <div className="metric-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                Pending Verify
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#B45309' }}>
                {pendingVerificationCount}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 12 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Verified
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857' }}>
                {filteredVerifiedOrders.length}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Payment Report */}
        <div
          className="metric-card emerald"
          onClick={() => navigate('/payment-report')}
          style={{ cursor: 'pointer', border: '1.5px solid #A7F3D0', background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)' }}
        >
          <div className="metric-card-top">
            <div>
              <span className="metric-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#064E3B' }}>
                2. Payment Report
              </span>
              <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 2, fontWeight: 600 }}>
                Weekly Work Type &amp; Labour Wise Report
              </div>
            </div>
            <div className="metric-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
              <ReceiptText size={20} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10, marginTop: 10, background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                Verified Orders
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#064E3B' }}>
                {filteredVerifiedOrders.length}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 12 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                Payable Amount
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1D4ED8' }}>
                {formatINR(totalVerifiedAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview & Work Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Total Financials */}
        <div className="card" style={{ background: '#FFFFFF', borderColor: '#D1FAE5' }}>
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <IndianRupee size={18} />
              </div>
              <span>Financial Overview</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{activeRangeLabel}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
            <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: 12, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                Verified Payable Amount
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
                {formatINR(totalVerifiedAmount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4 }}>
                {filteredVerifiedOrders.length} orders verified
              </div>
            </div>

            <div style={{ background: '#FFFBEB', padding: '16px', borderRadius: 12, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                Total Work Value
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                {formatINR(totalFilteredAmount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 4 }}>
                {filteredEntries.length} total work orders
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon">
                <Layers size={18} />
              </div>
              <span>Verification Status Ratio</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
              {filteredEntries.length} Total Orders
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9', marginBottom: 14 }}>
              <div
                style={{
                  width: `${filteredEntries.length > 0 ? (filteredVerifiedOrders.length / filteredEntries.length) * 100 : 0}%`,
                  background: '#10B981'
                }}
                title="Verified"
              />
              <div
                style={{
                  width: `${filteredEntries.length > 0 ? (pendingVerificationCount / filteredEntries.length) * 100 : 0}%`,
                  background: '#F59E0B'
                }}
                title="Pending Verification"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', padding: '8px 12px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#065F46' }}>Verified ({filteredVerifiedOrders.length})</div>
                  <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                    {filteredEntries.length > 0 ? Math.round((filteredVerifiedOrders.length / filteredEntries.length) * 100) : 0}% of selected
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFBEB', padding: '8px 12px', borderRadius: 8, border: '1px solid #FDE68A' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#92400E' }}>Pending Verify ({pendingVerificationCount})</div>
                  <div style={{ fontSize: '0.74rem', color: '#B45309' }}>
                    {filteredEntries.length > 0 ? Math.round((pendingVerificationCount / filteredEntries.length) * 100) : 0}% of selected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Entries Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon">
              <Clock size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>Work Entries &amp; Workflow State</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#065F46',
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid #A7F3D0'
              }}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'Record' : 'Records'} ({activeRangeLabel})
              </span>
            </div>
          </div>

          <button onClick={() => navigate('/tracker')} className="btn btn-secondary btn-sm">
            <span>View All ({entries.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work ID</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Firm</th>
                <th>Incharge</th>
                <th>Work Activity</th>
                <th>Work Hours</th>
                <th>Qty / Output</th>
                <th>Labourers</th>
                <th>Per Person Amount</th>
                <th>Total Amount</th>
                <th>Work Remark</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Calendar size={32} color="#94A3B8" />
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                        No work entries found for {activeRangeLabel}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                        Try selecting another week or click "All Time" to view all records.
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetPreset('All Time')}
                        className="btn btn-outline-green btn-sm"
                        style={{ marginTop: 6 }}
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
                    <tr key={entry.workId}>
                      <td>
                        <span className="work-id-badge">{entry.workId}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.shift || '-'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {entry.firmName || '-'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{entry.incharge}</div>
                      </td>
                      <td>
                        <div style={{ maxWidth: 200 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                            {entry.work}
                          </div>
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: isTonBasedWork(entry.work) ? '#059669' : '#2563EB',
                            marginTop: 2
                          }}>
                            {isTonBasedWork(entry.work) ? '⚖️ Per Ton' : '👤 Per Person'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {entry.hours ? `${entry.hours} hrs` : '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {entry.qty !== undefined && entry.qty !== '' ? `${entry.qty} ${isTonBasedWork(entry.work) ? 'MT' : 'units'}` : '-'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669' }}>{entry.labourCount}</span> pers
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#059669' }}>
                          ₹{perPerson.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                          ₹{total.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: 160,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: entry.workRemark ? '#334155' : '#94A3B8',
                            fontStyle: entry.workRemark ? 'normal' : 'italic'
                          }}
                          title={entry.workRemark || 'No remark'}
                        >
                          {entry.workRemark || '-'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={entry.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedWorkId(entry.workId)}
                          className="btn btn-outline-green btn-sm"
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
